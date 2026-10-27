import type { Transaction } from "./types";

/**
 * Padroniza nomes de categoria. Tudo que é comida (mercado, supermercado,
 * restaurante, padaria...) vira "Alimentação". Para unir ou separar outras
 * categorias, edite as listas abaixo.
 */

export const NO_CATEGORY = "Sem categoria";
export const FOOD_CATEGORY = "Alimentação";

/** Categorias oferecidas ao escolher manualmente, além das que já existem nos dados. */
export const DEFAULT_CATEGORIES = [
  "Alimentação",
  "Saúde",
  "Transporte",
  "Casa",
  "Vestuário",
  "Lazer",
  "Educação",
  "Assinaturas",
  "Seguros",
  "Serviços",
  "Compras",
  "Juros e tarifas",
  "Outros",
];

const FOOD_NAMES = new Set([
  "alimentacao",
  "alimento",
  "alimentos",
  "mercado",
  "mercados",
  "supermercado",
  "supermercados",
  "restaurante",
  "restaurantes",
  "padaria",
  "padarias",
  "lanchonete",
  "lanchonetes",
  "lanche",
  "lanches",
  "comida",
  "hortifruti",
  "acougue",
  "acougues",
]);

/** Nomes sem acento que os bancos exportam, com a grafia certa. */
const SPELLING: Record<string, string> = {
  saude: "Saúde",
  servicos: "Serviços",
  educacao: "Educação",
  vestuario: "Vestuário",
  transporte: "Transporte",
  assinaturas: "Assinaturas",
  seguros: "Seguros",
  outros: "Outros",
  compras: "Compras",
  casa: "Casa",
  lazer: "Lazer",
  entretenimento: "Entretenimento",
  pagamentos: "Pagamentos",
  viagem: "Viagem",
  viagens: "Viagem",
  pet: "Pet",
  pets: "Pet",
};

function plain(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalCategory(name: string): string {
  const key = plain(name);
  if (!key || key === plain(NO_CATEGORY)) return NO_CATEGORY;
  if (FOOD_NAMES.has(key)) return FOOD_CATEGORY;
  if (SPELLING[key]) return SPELLING[key];
  const text = name.trim().replace(/\s+/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function normalizePlace(place: string): string {
  return plain(place);
}

/**
 * Para cada nome de loja, a categoria mais usada nas compras já salvas.
 * Serve para que uma categoria escolhida à mão continue valendo quando a
 * mesma loja aparecer de novo em outra fatura.
 */
export function learnCategories(list: Transaction[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const t of list) {
    if (t.category === NO_CATEGORY) continue;
    const key = normalizePlace(t.place);
    const byCategory = counts.get(key) ?? new Map<string, number>();
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + 1);
    counts.set(key, byCategory);
  }

  const best = new Map<string, string>();
  for (const [place, byCategory] of counts) {
    let top = "";
    let topCount = 0;
    for (const [category, n] of byCategory) {
      if (n > topCount) {
        top = category;
        topCount = n;
      }
    }
    best.set(place, top);
  }
  return best;
}
