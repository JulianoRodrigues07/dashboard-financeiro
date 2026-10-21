import { formatMonth, formatMoney } from "@/lib/format";
import type { ParseResult } from "@/lib/types";

type Props = {
  result: ParseResult;
  fileName: string;
  cardName: string;
  onCardNameChange: (value: string) => void;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

type Group = { card: string; invoice: string; count: number; total: number };

function groupResult(result: ParseResult, cardName: string): Group[] {
  const map = new Map<string, Group>();
  for (const t of result.transactions) {
    const card = result.cardMissing ? cardName.trim() || "(informe o cartão)" : t.card;
    const key = `${card}|${t.invoice}`;
    const g = map.get(key) ?? { card, invoice: t.invoice, count: 0, total: 0 };
    g.count += 1;
    g.total += t.amount;
    map.set(key, g);
  }
  return [...map.values()].sort(
    (a, b) => a.invoice.localeCompare(b.invoice) || a.card.localeCompare(b.card, "pt-BR")
  );
}

export default function ImportReview({
  result,
  fileName,
  cardName,
  onCardNameChange,
  saving,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const groups = groupResult(result, cardName);
  const blockSave = result.cardMissing && !cardName.trim();
  const { skipped, notes } = result;

  return (
    <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Conferir antes de salvar</h1>
      <p className="mt-2 text-muted">
        Li {result.transactions.length} compras do arquivo {fileName}. Ao salvar,
        as compras de cada cartão nas faturas abaixo são substituídas pelas deste
        arquivo, então enviar a mesma fatura duas vezes não duplica nada.
      </p>

      {result.cardMissing && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <label className="block font-semibold">
            Esse arquivo não diz de qual cartão são as compras. Qual é?
            <input
              type="text"
              value={cardName}
              onChange={(e) => onCardNameChange(e.target.value)}
              placeholder="Ex.: Inter, Nubank final 1234"
              className="mt-2 min-h-12 w-full rounded-xl border border-line bg-surface px-4 font-normal text-ink"
            />
          </label>
          <p className="mt-2 text-sm text-muted">
            Todas as compras do arquivo serão salvas com esse nome. Use o mesmo
            nome nos próximos envios desse cartão para os meses se juntarem.
          </p>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[28rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-sm font-semibold text-muted">
              <th scope="col" className="px-4 py-3">Fatura</th>
              <th scope="col" className="px-4 py-3">Cartão</th>
              <th scope="col" className="px-4 py-3 text-right">Compras</th>
              <th scope="col" className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={`${g.card}|${g.invoice}`} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">{formatMonth(g.invoice)}</td>
                <td className="px-4 py-3">{g.card}</td>
                <td className="px-4 py-3 text-right tabular-nums">{g.count}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {formatMoney(g.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {notes.length > 0 && (
        <ul role="status" className="mt-4 space-y-2 rounded-xl bg-brand-soft px-4 py-3 text-brand">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {skipped.length > 0 && (
        <p role="status" className="mt-4 rounded-xl bg-brand-soft px-4 py-3 text-brand">
          {skipped.length} linha(s) não foram aproveitadas:{" "}
          {skipped
            .slice(0, 3)
            .map((s) => `linha ${s.line} (${s.reason})`)
            .join(", ")}
          {skipped.length > 3 ? " e outras" : ""}.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#fbeae6] px-4 py-3 text-danger">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving || blockSave}
          onClick={onConfirm}
          className="min-h-12 rounded-xl bg-brand px-6 font-semibold text-white hover:bg-[#093f3b] disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar compras"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="min-h-12 rounded-xl border border-line bg-surface px-6 font-semibold hover:border-muted disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </section>
  );
}
