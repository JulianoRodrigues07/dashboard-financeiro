import type { Transaction } from "./types";

export type Filters = {
  /** Primeira fatura incluída, no formato AAAA-MM (vazio = desde o começo) */
  from: string;
  /** Última fatura incluída, no formato AAAA-MM (vazio = até a mais recente) */
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
      (!f.from || t.invoice >= f.from) &&
      (!f.to || t.invoice <= f.to) &&
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

/** AAAA-MM de um mês, aceitando mês fora de 0 a 11 (ex.: -1 vira dezembro do ano anterior). */
function ym(year: number, month: number): string {
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function presetRange(id: PresetId, today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (id) {
    case "thisMonth":
      return { from: ym(y, m), to: ym(y, m) };
    case "lastMonth":
      return { from: ym(y, m - 1), to: ym(y, m - 1) };
    case "last3":
      return { from: ym(y, m - 2), to: ym(y, m) };
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
