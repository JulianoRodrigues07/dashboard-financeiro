"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CardSplit from "./CardSplit";
import CategoryList from "./CategoryList";
import FilterBar from "./FilterBar";
import MonthChart from "./MonthChart";
import TransactionsTable from "./TransactionsTable";
import UploadPanel from "./UploadPanel";
import { buildCardColors } from "@/lib/colors";
import { applyFilters, emptyFilters, type Filters } from "@/lib/filters";
import { formatDate, formatMoney } from "@/lib/format";
import { parseFile } from "@/lib/parse";
import { sampleTransactions } from "@/lib/sample";
import {
  sumAmount,
  totalsByCard,
  totalsByCategory,
  totalsByMonth,
} from "@/lib/summary";
import type { Transaction } from "@/lib/types";

const STORAGE_KEY = "dashboard-financeiro:v1";

type Stored = { transactions: Transaction[]; source: string };

export default function Dashboard() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Stored | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const replaceInput = useRef<HTMLInputElement>(null);

  // Recupera a última planilha guardada neste navegador
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw) as Stored);
    } catch {
      /* sem armazenamento disponível, segue sem dados salvos */
    }
    setReady(true);
  }, []);

  function save(next: Stored) {
    setData(next);
    setFilters(emptyFilters);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* se não der para salvar, a tela continua funcionando */
    }
  }

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await parseFile(file);
      save({ transactions: result.transactions, source: file.name });
      if (result.skipped.length > 0) {
        const first = result.skipped
          .slice(0, 3)
          .map((s) => `linha ${s.line} (${s.reason})`)
          .join(", ");
        const more = result.skipped.length > 3 ? " e outras" : "";
        setNotice(
          `${result.skipped.length} linha(s) não foram aproveitadas: ${first}${more}.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não consegui ler esse arquivo.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setData(null);
    setFilters(emptyFilters);
    setError(null);
    setNotice(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* sem armazenamento disponível, nada a limpar */
    }
  }

  function handleSample() {
    setError(null);
    setNotice(null);
    save({ transactions: sampleTransactions, source: "dados de exemplo" });
  }

  const all = useMemo(() => data?.transactions ?? [], [data]);
  const cards = useMemo(
    () => [...new Set(all.map((t) => t.card))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [all]
  );
  const categories = useMemo(
    () => [...new Set(all.map((t) => t.category))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [all]
  );
  const cardColors = useMemo(() => buildCardColors(cards), [cards]);
  const filtered = useMemo(() => applyFilters(all, filters), [all, filters]);

  const total = sumAmount(filtered);
  const byCard = useMemo(() => totalsByCard(filtered), [filtered]);
  const byCategory = useMemo(() => totalsByCategory(filtered), [filtered]);
  const byMonth = useMemo(() => totalsByMonth(filtered, cards), [filtered, cards]);

  if (!ready) return null;

  if (!data) {
    return (
      <div className="px-5 sm:px-8">
        <UploadPanel
          onFile={handleFile}
          onSample={handleSample}
          error={error}
          loading={loading}
        />
      </div>
    );
  }

  const dates = all.map((t) => t.date).sort();

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos nos cartões</h1>
          <p className="mt-1 text-muted">
            {all.length} compras de {formatDate(dates[0])} a{" "}
            {formatDate(dates[dates.length - 1])}, a partir de {data.source}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-11 rounded-xl border border-line bg-surface px-5 font-semibold hover:border-muted"
          >
            Voltar ao início
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => replaceInput.current?.click()}
            className="min-h-11 rounded-xl border border-line bg-surface px-5 font-semibold hover:border-muted disabled:opacity-60"
          >
            {loading ? "Lendo planilha..." : "Trocar planilha"}
          </button>
          <input
            ref={replaceInput}
            type="file"
            accept=".xlsx,.csv"
            className="sr-only"
            aria-label="Escolher outra planilha de gastos"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-[#fbeae6] px-4 py-3 text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-brand-soft px-4 py-3 text-brand">
          {notice}
        </p>
      )}

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(emptyFilters)}
        cards={cards}
        categories={categories}
        cardColors={cardColors}
      />

      <section aria-label="Resumo" className="space-y-6">
        <div>
          <p className="text-muted">
            Total gasto
            {filtered.length !== all.length ? " com os filtros aplicados" : ""}
          </p>
          <p className="mt-1 text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">
            {formatMoney(total)}
          </p>
          <p className="mt-2 text-muted">
            {filtered.length} {filtered.length === 1 ? "compra" : "compras"}
          </p>
        </div>
        {filtered.length > 0 && <CardSplit slices={byCard} cardColors={cardColors} />}
      </section>

      {filtered.length > 0 && (
        <section className="grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <h2 className="mb-4 text-xl font-bold">Gasto por mês</h2>
            <MonthChart rows={byMonth} cards={cards} cardColors={cardColors} />
          </div>
          <div>
            <h2 className="mb-4 text-xl font-bold">Gasto por categoria</h2>
            <CategoryList slices={byCategory} />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold">Compras</h2>
        <TransactionsTable transactions={filtered} cardColors={cardColors} />
      </section>
    </main>
  );
}
