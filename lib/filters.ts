import type { Transaction } from "./types";
import { toISODate } from "./format";

export type Filters = {
  from: string;
  to: string;
  cards: string[];
  categories: string[];
  query: string;
};

export const emptyFilters: Filters = {
  from: "",
  to: "",
  cards: [],
  categories: [],
  query: "",
};

export function isFiltering(f: Filters): boolean {
  return Boolean(
    f.from || f.to || f.cards.length || f.categories.length || f.query.trim()
  );
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function applyFilters(list: Transaction[], f: Filters): Transaction[] {
  const q = normalize(f.query.trim());
  return list.filter(
    (t) =>
      (!f.from || t.date >= f.from) &&
      (!f.to || t.date <= f.to) &&
      (f.cards.length === 0 || f.cards.includes(t.card)) &&
      (f.categories.length === 0 || f.categories.includes(t.category)) &&
      (!q || normalize(t.place).includes(q))
  );
}

export type PresetId = "all" | "thisMonth" | "lastMonth" | "last3";

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "all", label: "Tudo" },
  { id: "thisMonth", label: "Este mês" },
  { id: "lastMonth", label: "Mês passado" },
  { id: "last3", label: "Últimos 3 meses" },
];

export function presetRange(id: PresetId, today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (id) {
    case "thisMonth":
      return { from: toISODate(new Date(y, m, 1)), to: toISODate(new Date(y, m + 1, 0)) };
    case "lastMonth":
      return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
    case "last3":
      return { from: toISODate(new Date(y, m - 2, 1)), to: toISODate(new Date(y, m + 1, 0)) };
    default:
      return { from: "", to: "" };
  }
}

export function activePreset(f: Filters): PresetId | null {
  for (const p of PRESETS) {
    const r = presetRange(p.id);
    if (r.from === f.from && r.to === f.to) return p.id;
  }
  return null;
}

/** Primeiro e último dia de um mês no formato "AAAA-MM". */
export function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return {
    from: toISODate(new Date(y, m - 1, 1)),
    to: toISODate(new Date(y, m, 0)),
  };
}
