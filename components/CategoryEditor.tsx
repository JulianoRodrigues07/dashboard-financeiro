"use client";

import { useState } from "react";
import { NO_CATEGORY, canonicalCategory } from "@/lib/categories";

type Props = {
  place: string;
  current: string;
  options: string[];
  /** Quantas compras (contando esta) têm o mesmo nome de loja */
  sameCount: number;
  onSave: (category: string, applyToSame: boolean) => Promise<void>;
  onCancel: () => void;
};

const fieldClass = "mt-1 min-h-11 rounded-xl border border-line bg-surface px-3 text-ink";

export default function CategoryEditor({
  place,
  current,
  options,
  sameCount,
  onSave,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState(current);
  const [custom, setCustom] = useState("");
  const [applyAll, setApplyAll] = useState(sameCount > 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = options.includes(current) ? options : [...options, current];
  const chosen = canonicalCategory(custom.trim() || selected);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSave(chosen, applyAll);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não consegui salvar a categoria.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-semibold">Categoria de “{place}”</p>

      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-semibold text-muted">
          Escolha uma
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setCustom("");
            }}
            className={`${fieldClass} block min-w-48`}
          >
            {list.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {!list.includes(NO_CATEGORY) && <option value={NO_CATEGORY}>{NO_CATEGORY}</option>}
          </select>
        </label>

        <label className="text-sm font-semibold text-muted">
          Ou crie uma nova
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Ex.: Presentes"
            className={`${fieldClass} block min-w-48`}
          />
        </label>
      </div>

      {sameCount > 1 && (
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={applyAll}
            onChange={(e) => setApplyAll(e.target.checked)}
            className="mt-1 size-5 accent-[#0b4f4a]"
          />
          <span>
            Aplicar às {sameCount} compras de “{place}”, inclusive nas próximas faturas
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-[#fbeae6] px-4 py-3 text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="min-h-11 rounded-xl bg-brand px-5 font-semibold text-white hover:bg-[#093f3b] disabled:opacity-60"
        >
          {busy ? "Salvando..." : `Salvar como ${chosen}`}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-line bg-surface px-5 font-semibold hover:border-muted disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
