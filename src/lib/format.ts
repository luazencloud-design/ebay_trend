export const fmtKRW = (n: number): string =>
  "₩" + n.toLocaleString("ko-KR");

export const fmtUSD = (n: number): string => "$" + n.toFixed(2);

export const padRank = (n: number, width = 2): string =>
  String(n).padStart(width, "0");

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
