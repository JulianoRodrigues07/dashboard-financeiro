import type { Transaction } from "./types";

export type Slice = { name: string; total: number };

function groupBy(list: Transaction[], key: "card" | "category"): Slice[] {
  const map = new Map<string, number>();
  for (const t of list) map.set(t[key], (map.get(t[key]) ?? 0) + t.amount);
  return [...map.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export const totalsByCard = (list: Transaction[]) => groupBy(list, "card");
export const totalsByCategory = (list: Transaction[]) => groupBy(list, "category");

export const sumAmount = (list: Transaction[]) =>
  list.reduce((acc, t) => acc + t.amount, 0);

export type MonthRow = {
  month: string; // AAAA-MM
  /** total por cartão, na mesma ordem de `cards` */
  values: number[];
};

export function totalsByMonth(list: Transaction[], cards: string[]): MonthRow[] {
  const map = new Map<string, number[]>();
  for (const t of list) {
    const month = t.invoice;
    const row = map.get(month) ?? cards.map(() => 0);
    const idx = cards.indexOf(t.card);
    if (idx !== -1) row[idx] += t.amount;
    map.set(month, row);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({ month, values }));
}
