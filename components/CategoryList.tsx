import { formatMoney } from "@/lib/format";
import type { Slice } from "@/lib/summary";

export default function CategoryList({ slices }: { slices: Slice[] }) {
  const max = Math.max(...slices.map((s) => s.total), 1);

  return (
    <ul className="space-y-4">
      {slices.map((s) => (
        <li key={s.name}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-medium">{s.name}</span>
            <span className="tabular-nums">{formatMoney(s.total)}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-line">
            <div
              className="h-2 rounded-full bg-brand"
              style={{ width: `${Math.max(0, (s.total / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
