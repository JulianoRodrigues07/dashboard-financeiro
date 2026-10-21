"use client";

import { useMemo, useState } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import type { Transaction } from "@/lib/types";

type SortKey = "date" | "place" | "category" | "card" | "amount";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "date", label: "Data" },
  { key: "place", label: "Onde foi a compra" },
  { key: "category", label: "Categoria" },
  { key: "card", label: "Cartão" },
  { key: "amount", label: "Valor", align: "right" },
];

const PAGE = 40;

type Props = {
  transactions: Transaction[];
  cardColors: Record<string, string>;
};

export default function TransactionsTable({ transactions, cardColors }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [visible, setVisible] = useState(PAGE);

  const sorted = useMemo(() => {
    const factor = dir === "asc" ? 1 : -1;
    return [...transactions].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv), "pt-BR") * factor;
    });
  }, [transactions, sortKey, dir]);

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setDir(dir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDir(key === "date" || key === "amount" ? "desc" : "asc");
    }
  }

  if (transactions.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface p-8 text-center text-muted">
        Nenhuma compra com esses filtros. Tente ampliar o período ou limpar os filtros.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    sortKey === c.key ? (dir === "asc" ? "ascending" : "descending") : "none"
                  }
                  className={`px-4 py-3 text-sm font-semibold text-muted ${
                    c.align === "right" ? "text-right" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => sortBy(c.key)}
                    className="inline-flex min-h-9 items-center gap-1 hover:text-ink"
                  >
                    {c.label}
                    <span aria-hidden className="w-3 text-xs">
                      {sortKey === c.key ? (dir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, visible).map((t) => (
              <tr key={t.id} className="border-b border-line last:border-b-0 hover:bg-paper">
                <td className="px-4 py-3 tabular-nums text-muted">{formatDate(t.date)}</td>
                <td className="px-4 py-3">
                  <span className="font-medium">{t.place}</span>
                  {t.installment !== "À vista" && t.installment !== "1/1" && (
                    <span className="ml-2 rounded-md bg-brand-soft px-2 py-0.5 text-sm text-brand">
                      parcela {t.installment}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{t.category}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-3 rounded-full"
                      style={{ background: cardColors[t.card] }}
                    />
                    {t.card}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {formatMoney(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > visible && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setVisible(visible + PAGE)}
            className="min-h-11 rounded-xl border border-line bg-surface px-5 font-semibold hover:border-muted"
          >
            Mostrar mais ({sorted.length - visible} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
