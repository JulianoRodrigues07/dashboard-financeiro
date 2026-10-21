const PALETTE = [
  "#3D6FD8",
  "#E3793A",
  "#8A5CC2",
  "#D24C73",
  "#C79A1B",
  "#4C9A6A",
  "#2B3A55",
  "#8A939C",
];

/** Cor estável por cartão, seguindo a ordem alfabética dos nomes. */
export function buildCardColors(cards: string[]): Record<string, string> {
  const sorted = [...cards].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const map: Record<string, string> = {};
  sorted.forEach((card, i) => {
    map[card] = PALETTE[i % PALETTE.length];
  });
  return map;
}
