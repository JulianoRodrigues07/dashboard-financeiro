import type { Transaction } from "./types";

type Seed = [string, number, string, string, string, string];

// Dados inventados, só para mostrar a tela funcionando.
const SEEDS: Seed[] = [
  ["2026-07-04", 412.8, "Supermercado Zaffari", "1/1", "Nubank", "Mercado"],
  ["2026-07-09", 129.9, "Farmácia Panvel", "1/1", "Nubank", "Saúde"],
  ["2026-07-15", 899.0, "Eletro Casa", "1/6", "Itaú", "Casa"],
  ["2026-07-18", 39.9, "Spotify", "1/1", "Itaú", "Assinaturas"],
  ["2026-07-22", 178.4, "Posto Ipiranga", "1/1", "Santander", "Transporte"],
  ["2026-07-27", 96.0, "Padaria Central", "1/1", "Nubank", "Alimentação"],
  ["2026-08-03", 455.3, "Supermercado Zaffari", "1/1", "Nubank", "Mercado"],
  ["2026-08-07", 89.9, "Netflix", "1/1", "Itaú", "Assinaturas"],
  ["2026-08-11", 899.0, "Eletro Casa", "2/6", "Itaú", "Casa"],
  ["2026-08-14", 260.0, "Loja de Roupas Centro", "1/4", "Santander", "Vestuário"],
  ["2026-08-19", 142.3, "Posto Ipiranga", "1/1", "Santander", "Transporte"],
  ["2026-08-24", 187.5, "Restaurante Sabor da Serra", "1/1", "Nubank", "Alimentação"],
  ["2026-08-29", 75.2, "Farmácia Panvel", "1/1", "Nubank", "Saúde"],
  ["2026-09-02", 398.7, "Supermercado Zaffari", "1/1", "Nubank", "Mercado"],
  ["2026-09-06", 89.9, "Netflix", "1/1", "Itaú", "Assinaturas"],
  ["2026-09-10", 899.0, "Eletro Casa", "3/6", "Itaú", "Casa"],
  ["2026-09-13", 260.0, "Loja de Roupas Centro", "2/4", "Santander", "Vestuário"],
  ["2026-09-17", 210.0, "Posto Ipiranga", "1/1", "Santander", "Transporte"],
  ["2026-09-21", 64.5, "Padaria Central", "1/1", "Nubank", "Alimentação"],
  ["2026-09-26", 330.0, "Consulta Dra. Helena", "1/1", "Itaú", "Saúde"],
  ["2026-10-01", 421.1, "Supermercado Zaffari", "1/1", "Nubank", "Mercado"],
  ["2026-10-04", 89.9, "Netflix", "1/1", "Itaú", "Assinaturas"],
  ["2026-10-08", 899.0, "Eletro Casa", "4/6", "Itaú", "Casa"],
  ["2026-10-10", 260.0, "Loja de Roupas Centro", "3/4", "Santander", "Vestuário"],
];

export const sampleTransactions: Transaction[] = SEEDS.map(
  ([date, amount, place, installment, card, category], i) => ({
    id: `exemplo${i}`,
    date,
    amount,
    place,
    installment,
    card,
    category,
  })
);
