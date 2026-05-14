import { useCallback, useEffect, useState } from "react";
import type { Density, Typo } from "../types";

export interface Tweaks {
  typo: Typo;
  density: Density;
}

const STORAGE_KEY = "ktrend-tweaks";

const defaults: Tweaks = { typo: "default", density: "comfortable" };

function read(): Tweaks {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function useTweaks() {
  const [tweaks, setTweaks] = useState<Tweaks>(() => read());

  const setTweak = useCallback(<K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
    setTweaks((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.body.dataset.typo = tweaks.typo;
    document.body.dataset.density = tweaks.density;
  }, [tweaks.typo, tweaks.density]);

  return [tweaks, setTweak] as const;
}
