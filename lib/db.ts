import { supabase } from "./supabase";
import type { Transaction } from "./types";

const PAGE_SIZE = 1000;
const LOCAL_KEY = "dashboard-financeiro:local:v2";

/* ---------- Modo local (sem login): dados só neste navegador ---------- */

function readLocal(): Transaction[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Transaction[]) : [];
  } catch {
    return [];
  }
}

const groupKey = (t: Transaction) => `${t.card}|${t.date.slice(0, 7)}`;

function saveLocal(list: Transaction[]): void {
  // Mesma regra do banco: troca as compras dos cartões e meses do arquivo
  const replaced = new Set(list.map(groupKey));
  const kept = readLocal().filter((t) => !replaced.has(groupKey(t)));
  const stamp = Date.now();
  const added = list.map((t, i) => ({ ...t, id: `l${stamp}-${i}` }));
  localStorage.setItem(LOCAL_KEY, JSON.stringify([...kept, ...added]));
}

export function clearLocalTransactions(): void {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* nada a limpar */
  }
}

/* ---------- Banco de dados (Supabase) ---------- */

export async function fetchTransactions(): Promise<Transaction[]> {
  if (!supabase) {
    return readLocal().sort((a, b) => b.date.localeCompare(a.date));
  }

  const all: Transaction[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, amount, place, installment, card, category")
      .order("date", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    for (const row of data) {
      all.push({
        id: row.id as string,
        date: row.date as string,
        amount: Number(row.amount),
        place: row.place as string,
        installment: row.installment as string,
        card: row.card as string,
        category: row.category as string,
      });
    }
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}

/** Troca as compras dos cartões e meses presentes na lista pelas novas. */
export async function saveTransactions(list: Transaction[]): Promise<void> {
  if (!supabase) {
    saveLocal(list);
    return;
  }

  const rows = list.map(({ date, amount, place, installment, card, category }) => ({
    date,
    amount,
    place,
    installment,
    card,
    category,
  }));

  const { error } = await supabase.rpc("replace_transactions", { rows });
  if (error) throw new Error(error.message);
}