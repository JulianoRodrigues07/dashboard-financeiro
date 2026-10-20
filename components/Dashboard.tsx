"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import CardSplit from "./CardSplit";
import CategoryList from "./CategoryList";
import FilterBar from "./FilterBar";
import ImportReview from "./ImportReview";
import LoginForm from "./LoginForm";
import MonthChart from "./MonthChart";
import NewPasswordForm from "./NewPasswordForm";
import TransactionsTable from "./TransactionsTable";
import UploadPanel from "./UploadPanel";
import { buildCardColors } from "@/lib/colors";
import { clearLocalTransactions, fetchTransactions, saveTransactions } from "@/lib/db";
import { applyFilters, emptyFilters, type Filters } from "@/lib/filters";
import { formatDate, formatMoney } from "@/lib/format";
import { parseFile } from "@/lib/parse";
import { sampleTransactions } from "@/lib/sample";
import { localMode, supabase } from "@/lib/supabase";
import {
  sumAmount,
  totalsByCard,
  totalsByCategory,
  totalsByMonth,
} from "@/lib/summary";
import type { ParseResult, Transaction } from "@/lib/types";

type Pending = ParseResult & { fileName: string };

function messageOf(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export default function Dashboard() {
  // undefined = ainda verificando se há login ativo
  const [session, setSession] = useState<Session | null | undefined>(
    supabase ? undefined : null
  );
  const [demo, setDemo] = useState(false);
  // Pessoa chegou pelo link de "esqueci minha senha"
  const [recovery, setRecovery] = useState(false);
  const [remote, setRemote] = useState<Transaction[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [cardName, setCardName] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const replaceInput = useRef<HTMLInputElement>(null);

  // Acompanha o login
  useEffect(() => {
    if (!supabase) return;
    if (window.location.hash.includes("type=recovery")) setRecovery(true);
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Carrega as compras salvas quando há alguém logado
  const ownerKey = localMode ? "local" : session?.user.id;
  useEffect(() => {
    if (!ownerKey) {
      setRemote(null);
      return;
    }
    let cancelled = false;
    setLoadError(null);
    fetchTransactions()
      .then((list) => {
        if (!cancelled) setRemote(list);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(messageOf(e, "Não consegui carregar os gastos."));
      });
    return () => {
      cancelled = true;
    };
  }, [ownerKey]);

  const all = useMemo(
    () => (demo ? sampleTransactions : remote ?? []),
    [demo, remote]
  );
  const cards = useMemo(
    () => [...new Set(all.map((t) => t.card))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [all]
  );
  const categories = useMemo(
    () => [...new Set(all.map((t) => t.category))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [all]
  );
  const months = useMemo(
    () => [...new Set(all.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    [all]
  );
  const cardColors = useMemo(() => buildCardColors(cards), [cards]);
  const filtered = useMemo(() => applyFilters(all, filters), [all, filters]);
  const total = sumAmount(filtered);
  const byCard = useMemo(() => totalsByCard(filtered), [filtered]);
  const byCategory = useMemo(() => totalsByCategory(filtered), [filtered]);
  const byMonth = useMemo(() => totalsByMonth(filtered, cards), [filtered, cards]);

  async function handleFile(file: File) {
    setReading(true);
    setError(null);
    try {
      const result = await parseFile(file);
      setPending({ ...result, fileName: file.name });
      setCardName(result.suggestedCard);
    } catch (e) {
      setError(messageOf(e, "Não consegui ler esse arquivo."));
    } finally {
      setReading(false);
    }
  }

  async function confirmImport() {
    if (!pending) return;
    if (pending.cardMissing && !cardName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const list = pending.cardMissing
        ? pending.transactions.map((t) => ({ ...t, card: cardName.trim() }))
        : pending.transactions;
      await saveTransactions(list);
      setRemote(await fetchTransactions());
      setPending(null);
      setFilters(emptyFilters);
    } catch (e) {
      setError(messageOf(e, "Não consegui salvar. Tente de novo."));
    } finally {
      setSaving(false);
    }
  }

  function cancelImport() {
    setPending(null);
    setError(null);
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setRemote(null);
    setFilters(emptyFilters);
    setError(null);
  }

  function clearLocal() {
    clearLocalTransactions();
    setRemote([]);
    setFilters(emptyFilters);
  }

  function leaveDemo() {
    setDemo(false);
    setFilters(emptyFilters);
  }

  if (!localMode && recovery && session) {
    return <NewPasswordForm onDone={() => setRecovery(false)} />;
  }

  // Telas anteriores ao painel
  if (!demo) {
    if (!localMode && session === undefined) return null;

    if (!localMode && session === null) {
      return <LoginForm onDemo={() => setDemo(true)} />;
    }

    if (loadError) {
      return (
        <section className="mx-auto max-w-md px-5 py-16">
          <p role="alert" className="rounded-xl bg-[#fbeae6] px-4 py-3 text-danger">
            {loadError}
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-4 min-h-11 rounded-xl border border-line bg-surface px-5 font-semibold hover:border-muted"
          >
            Sair
          </button>
        </section>
      );
    }

    if (remote === null) {
      return (
        <p className="px-5 py-16 text-center text-muted">Carregando seus gastos...</p>
      );
    }

    if (pending) {
      return (
        <ImportReview
          result={pending}
          fileName={pending.fileName}
          cardName={cardName}
          onCardNameChange={setCardName}
          saving={saving}
          error={error}
          onConfirm={confirmImport}
          onCancel={cancelImport}
        />
      );
    }

    if (remote.length === 0) {
      return (
        <div className="px-5 sm:px-8">
          {!localMode && (
            <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 pt-6 text-muted">
              <span>Conectado como {session?.user.email}</span>
              <button
                type="button"
                onClick={signOut}
                className="font-semibold text-brand underline"
              >
                Sair
              </button>
            </div>
          )}
          <UploadPanel
            onFile={handleFile}
            onSample={localMode ? () => setDemo(true) : undefined}
            error={error}
            loading={reading}
          />
        </div>
      );
    }
  }

  const dates = all.map((t) => t.date).sort();

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos nos cartões</h1>
          <p className="mt-1 text-muted">
            {all.length} compras de {formatDate(dates[0])} a{" "}
            {formatDate(dates[dates.length - 1])}
            {demo
              ? ", dados de exemplo"
              : localMode
                ? ", salvos só neste navegador"
                : ""}
          </p>
          {!demo && !localMode && (
            <p className="mt-0.5 text-sm text-muted">Conta: {session?.user.email}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {demo ? (
            <button
              type="button"
              onClick={leaveDemo}
              className="min-h-11 rounded-xl border border-line bg-surface px-5 font-semibold hover:border-muted"
            >
              Voltar ao início
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={reading}
                onClick={() => replaceInput.current?.click()}
                className="min-h-11 rounded-xl bg-brand px-5 font-semibold text-white hover:bg-[#093f3b] disabled:opacity-60"
              >
                {reading ? "Lendo planilha..." : "Importar planilha"}
              </button>
              <input
                ref={replaceInput}
                type="file"
                accept=".xlsx,.csv"
                className="sr-only"
                aria-label="Escolher planilha para importar"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              {localMode ? (
                <button
                  type="button"
                  onClick={clearLocal}
                  className="min-h-11 rounded-xl border border-line bg-surface px-5 font-semibold hover:border-muted"
                >
                  Apagar dados locais
                </button>
              ) : (
                <button
                  type="button"
                  onClick={signOut}
                  className="min-h-11 rounded-xl border border-line bg-surface px-5 font-semibold hover:border-muted"
                >
                  Sair
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-[#fbeae6] px-4 py-3 text-danger">
          {error}
        </p>
      )}

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(emptyFilters)}
        cards={cards}
        categories={categories}
        months={months}
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
