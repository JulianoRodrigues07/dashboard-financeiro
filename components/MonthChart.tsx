"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMonth, formatMoney } from "@/lib/format";
import type { MonthRow } from "@/lib/summary";

type Props = {
  rows: MonthRow[];
  cards: string[];
  cardColors: Record<string, string>;
};

function shortMoney(v: number): string {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)} mil`;
  return String(Math.round(v));
}

export default function MonthChart({ rows, cards, cardColors }: Props) {
  // Chaves simples (c0, c1...) evitam problemas com nomes de cartão com ponto
  const data = rows.map((r) => {
    const item: Record<string, string | number> = { label: formatMonth(r.month) };
    r.values.forEach((v, i) => {
      item[`c${i}`] = Math.round(v * 100) / 100;
    });
    return item;
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#dce2e8" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#5b6875" }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: "#5b6875" }}
            tickFormatter={shortMoney}
          />
          <Tooltip
            cursor={{ fill: "#e1efed" }}
            formatter={(value) => formatMoney(Number(value))}
          />
          {cards.map((card, i) => (
            <Bar
              key={card}
              dataKey={`c${i}`}
              name={card}
              stackId="gasto"
              fill={cardColors[card]}
              maxBarSize={56}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
