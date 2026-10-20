import { formatMoney } from "@/lib/format";
import type { Slice } from "@/lib/summary";

type Props = {
  slices: Slice[];
  cardColors: Record<string, string>;
};

export default function CardSplit({ slices, cardColors }: Props) {
  const positive = slices.filter((s) => s.total > 0);
  const base = positive.reduce((acc, s) => acc + s.total, 0);

  return (
    <div>
      {base > 0 && (
        <div
          className="flex h-5 w-full overflow-hidden rounded-full bg-line"
          role="img"
          aria-label="Divisão do gasto entre os cartões"
        >
          {positive.map((s) => (
            <div
              key={s.name}
              title={`${s.name}: ${formatMoney(s.total)}`}
              style={{
                width: `${(s.total / base) * 100}%`,
                background: cardColors[s.name],
              }}
              className="border-r-2 border-paper last:border-r-0"
            />
          ))}
        </div>
      )}

      <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {slices.map((s) => (
          <li key={s.name} className="flex items-baseline gap-3">
            <span
              aria-hidden
              className="mt-1 size-3 shrink-0 self-start rounded-full"
              style={{ background: cardColors[s.name] }}
            />
            <span className="font-semibold">{s.name}</span>
            <span className="ml-auto tabular-nums">{formatMoney(s.total)}</span>
            {base > 0 && s.total > 0 && (
              <span className="w-12 text-right text-sm tabular-nums text-muted">
                {Math.round((s.total / base) * 100)}%
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
