// Thin wrapper around @google/genai with:
//   - JSON response mode
//   - resilient parsing (strips ```json fences if Gemini adds them)
//   - retry with exponential backoff for transient 5xx / rate limits
//   - concurrency limiter (pMap)

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error(
    "\n❌ GEMINI_API_KEY not set.\n" +
      "   Copy .env.example to .env and fill in your key.\n" +
      "   Get one at: https://aistudio.google.com/apikey\n"
  );
  process.exit(1);
}

export const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";
export const CONCURRENCY = Number(process.env.GEMINI_CONCURRENCY || 4);

const ai = new GoogleGenAI({ apiKey });

// Pricing per 1M tokens (USD). Update if Google revises pricing.
// Source: https://ai.google.dev/pricing (as of 2025-12).
const PRICING = {
  "gemini-2.5-pro":   { input: 1.25,  output: 10.0 },
  "gemini-2.5-flash": { input: 0.075, output: 0.30 },
};

// Accumulator for the current process run.
export const usageTotals = {
  calls: 0,
  promptTokens: 0,
  outputTokens: 0,
  thoughtTokens: 0,    // 2.5 Pro thinking tokens (billed as output)
};

export function estimateCostUSD(model = MODEL, usage = usageTotals) {
  const p = PRICING[model] || PRICING["gemini-2.5-pro"];
  const inputCost = (usage.promptTokens / 1_000_000) * p.input;
  const outputTokens = usage.outputTokens + usage.thoughtTokens;
  const outputCost = (outputTokens / 1_000_000) * p.output;
  return { inputCost, outputCost, total: inputCost + outputCost };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseLooseJson(text) {
  // Try plain JSON first
  try {
    return JSON.parse(text);
  } catch {}
  // Strip ```json ... ``` fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }
  // Take the first { ... } or [ ... ] block
  const objStart = text.indexOf("{");
  const arrStart = text.indexOf("[");
  const start =
    objStart === -1
      ? arrStart
      : arrStart === -1
        ? objStart
        : Math.min(objStart, arrStart);
  if (start >= 0) {
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {}
    }
  }
  throw new Error("Gemini returned non-JSON output:\n" + text.slice(0, 300));
}

// Per-model usage accumulator
export const usageByModel = {};
function ensureModelBucket(model) {
  if (!usageByModel[model]) {
    usageByModel[model] = { calls: 0, promptTokens: 0, outputTokens: 0, thoughtTokens: 0 };
  }
  return usageByModel[model];
}

export async function generateJson(
  prompt,
  { label = "", model = MODEL, maxOutputTokens, thinkingBudget, enableSearch = false } = {}
) {
  const config = {
    temperature: 0.4,
  };
  // responseMimeType is incompatible with the googleSearch tool — rely on
  // prompt + parseLooseJson when grounding is enabled.
  if (!enableSearch) {
    config.responseMimeType = "application/json";
  }
  if (typeof maxOutputTokens === "number") config.maxOutputTokens = maxOutputTokens;
  if (typeof thinkingBudget === "number") {
    config.thinkingConfig = { thinkingBudget };
  }
  if (enableSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  const maxAttempts = 4;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
      // accumulate usage globally + per-model
      const u = result.usageMetadata || {};
      const bucket = ensureModelBucket(model);
      usageTotals.calls += 1;
      usageTotals.promptTokens += u.promptTokenCount || 0;
      usageTotals.outputTokens += u.candidatesTokenCount || 0;
      usageTotals.thoughtTokens += u.thoughtsTokenCount || 0;
      bucket.calls += 1;
      bucket.promptTokens += u.promptTokenCount || 0;
      bucket.outputTokens += u.candidatesTokenCount || 0;
      bucket.thoughtTokens += u.thoughtsTokenCount || 0;

      const text = result.text ?? "";
      return parseLooseJson(text);
    } catch (err) {
      lastErr = err;
      const status = err?.status || err?.code;
      const msg = String(err?.message || "");
      // Non-JSON output (Gemini returned markdown/prose) is also retriable —
      // the next sample is probabilistic and often produces valid JSON.
      const isParseError = msg.startsWith("Gemini returned non-JSON output");
      const retriable =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        isParseError ||
        /timeout|temporar|rate/i.test(msg);
      if (!retriable || attempt === maxAttempts) break;
      const wait = 800 * Math.pow(2, attempt - 1);
      process.stdout.write(
        `   ⚠ ${label || "call"} attempt ${attempt} failed (${status || "?"}), retrying in ${wait}ms…\n`
      );
      await sleep(wait);
    }
  }
  throw lastErr;
}

// Concurrency-limited map. Preserves order. Continues on per-item errors when
// `swallowErrors: true`; otherwise rejects on the first.
export async function pMap(items, fn, { concurrency = CONCURRENCY, swallowErrors = false } = {}) {
  const out = new Array(items.length);
  const errors = [];
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      try {
        out[idx] = await fn(items[idx], idx);
      } catch (err) {
        if (swallowErrors) {
          errors.push({ idx, item: items[idx], err });
          out[idx] = null;
        } else {
          throw err;
        }
      }
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    () => worker()
  );
  await Promise.all(workers);
  return { results: out, errors };
}
