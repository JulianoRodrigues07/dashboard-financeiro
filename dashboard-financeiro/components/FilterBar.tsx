"use client";

import {
  PRESETS,
  activePreset,
  isFiltering,
  presetRange,
  type Filters,
} from "@/lib/filters";

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
  onClear: () => void;
  cards: string[];
  categories: string[];
  cardColors: Record<string, string>;
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const chipBase =
  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[0.95rem] font-medium transition-colors";
const chipOff = "border-line bg-surface text-ink hover:border-muted";
const chipOn = "border-brand bg-brand text-white";

const inputClass =
  "min-h-11 rounded-xl border border-line bg-surface px-3 text-ink";

export default function FilterBar({
  filters,
  onChange,
  onClear,
  cards,
  categories,
  cardColors,
}: Props) {
  const current = activePreset(filters);

  return (
    <section aria-label="Filtros" className="space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-muted">Período</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={current === p.id}
                onClick={() => onChange({ ...filters, ...presetRange(p.id) })}
                className={`${chipBase} ${current === p.id ? chipOn : chipOff}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <label className="text-sm font-semibold text-muted">
          <span className="mb-2 block">De</span>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-semibold text-muted">
          <span className="mb-2 block">Até</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
            className={inputClass}
          />
        </label>

        <label className="min-w-56 flex-1 text-sm font-semibold text-muted">
          <span className="mb-2 block">Buscar compra</span>
          <input
            type="search"
            placeholder="Ex.: mercado, farmácia"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            className={`${inputClass} w-full`}
          />
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-muted">Cartão</p>
        <div className="flex flex-wrap gap-2">
          {cards.map((card) => {
            const on = filters.cards.includes(card);
            return (
              <button
                key={card}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...filters, cards: toggle(filters.cards, card) })}
                className={`${chipBase} ${on ? chipOn : chipOff}`}
              >
                <span
                  aria-hidden
                  className="size-3 rounded-full ring-2 ring-white"
                  style={{ background: cardColors[card] }}
                />
                {card}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-muted">Categoria</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const on = filters.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange({ ...filters, categories: toggle(filters.categories, cat) })
                }
                className={`${chipBase} ${on ? chipOn : chipOff}`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {isFiltering(filters) && (
        <button
          type="button"
          onClick={onClear}
          className="font-semibold text-brand underline"
        >
          Limpar filtros
        </button>
      )}
    </section>
  );
}
