import type { ParseResult, Transaction } from "../types";
import { categorize } from "./categorize";

const AMOUNT = "-?\\d{1,3}(?:\\.\\d{3})*,\\d{2}";
const ROW = new RegExp(`^(\\d{2})/(\\d{2})\\s+(.+?)\\s+(${AMOUNT})$`);
const SECTION_HEADER = /\(final\s*\*?(\d{3,4})\)/;
const SECTION_TOTAL = new RegExp(
  `^Lançamentos no cartão\\s*\\(final\\s*\\*?(\\d{3,4})\\)\\s*(${AMOUNT})$`
);
const PAYMENT = /^(PAGAMENTO|PAGTO|PGTO)\b/i;

const pad = (n: number) => String(n).padStart(2, "0");
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function parseAmount(text: string): number {
  return Number(text.replace(/\./g, "").replace(",", "."));
}

function findDueDate(lines: string[]) {
  for (let i = 0; i < lines.length; i++) {
    if (/vence em/i.test(lines[i])) {
      const m = `${lines[i]} ${lines[i + 1] ?? ""}`.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) return { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) };
    }
  }
  return null;
}

/** "HAVAN ... 09/10 ..." e "ALLIANZ ... 03 de 10 ..." indicam parcela 9/10 e 3/10. */
function splitInstallment(description: string): { installment: string; rest: string } {
  const patterns = [/\s(\d{1,2})\s+de\s+(\d{1,2})(?=\s|$)/i, /\s(\d{2})\/(\d{2})(?=\s|$)/];
  for (const pattern of patterns) {
    const m = description.match(pattern);
    if (m) {
      const n = Number(m[1]);
      const total = Number(m[2]);
      if (n >= 1 && total >= 1 && n <= total) {
        return {
          installment: `${n}/${total}`,
          rest: description.replace(m[0], " "),
        };
      }
    }
  }
  return { installment: "À vista", rest: description };
}

function cleanPlace(text: string): string {
  return text.replace(/\s+/g, " ").trim().replace(/\sBRA$/, "");
}

/**
 * Lê as linhas de texto de uma fatura de cartão do Porto Bank.
 * A data da compra na fatura não traz o ano, então ele é deduzido a partir do
 * vencimento: nenhuma compra é posterior ao vencimento da própria fatura.
 */
export function parsePortoLines(lines: string[]): ParseResult {
  const due = findDueDate(lines);
  const hasDetail = lines.some((l) => /Lançamentos:\s*compras e saques/i.test(l));

  if (!due || !hasDetail) {
    throw new Error(
      "Não reconheci esse PDF. Por enquanto só leio faturas de cartão do Porto Bank."
    );
  }

  const invoice = `${due.year}-${pad(due.month)}`;
  const transactions: Transaction[] = [];
  const stated = new Map<string, number>();
  const sums = new Map<string, number>();
  let paymentsTotal = 0;
  let currentCard: string | null = null;
  let currentDigits = "";

  for (const line of lines) {
    const total = line.match(SECTION_TOTAL);
    if (total) {
      stated.set(total[1], parseAmount(total[2]));
      currentCard = null;
      continue;
    }

    const header = line.match(SECTION_HEADER);
    if (header && !ROW.test(line)) {
      currentDigits = header[1];
      currentCard = `Porto final ${header[1]}`;
      continue;
    }

    if (!currentCard) continue;

    const row = line.match(ROW);
    if (!row) continue;

    const day = Number(row[1]);
    const month = Number(row[2]);
    const amount = parseAmount(row[4]);
    const description = row[3];

    if (PAYMENT.test(description)) {
      paymentsTotal += Math.abs(amount);
      continue;
    }

    const year =
      month < due.month || (month === due.month && day <= due.day) ? due.year : due.year - 1;
    const { installment, rest } = splitInstallment(description);
    const place = cleanPlace(rest);

    transactions.push({
      id: `pdf${transactions.length}`,
      date: `${year}-${pad(month)}-${pad(day)}`,
      invoice,
      amount,
      place: place || "Sem descrição",
      installment,
      card: currentCard,
      category: categorize(place),
    });
    sums.set(currentDigits, (sums.get(currentDigits) ?? 0) + amount);
  }

  if (transactions.length === 0) {
    throw new Error("Li o PDF, mas não encontrei a lista de compras da fatura.");
  }

  const notes: string[] = [];
  const mismatches: string[] = [];
  for (const [digits, value] of stated) {
    const read = sums.get(digits) ?? 0;
    if (Math.abs(read - value) > 0.009) {
      mismatches.push(
        `cartão final ${digits}: li ${brl(read)} e a fatura informa ${brl(value)}`
      );
    }
  }
  if (mismatches.length > 0) {
    notes.push(`Atenção, a soma não bate com a fatura (${mismatches.join("; ")}). Confira se alguma compra ficou de fora.`);
  } else if (stated.size > 0) {
    const sum = [...stated.values()].reduce((a, b) => a + b, 0);
    notes.push(`A soma das compras lidas bate com o total da fatura (${brl(sum)}).`);
  }
  if (paymentsTotal > 0) {
    notes.push(
      `O pagamento da fatura anterior (${brl(paymentsTotal)}) foi ignorado, porque não é gasto.`
    );
  }
  notes.push(
    "Faturas em PDF não trazem categoria. Sugeri uma pelo nome da loja; o que não deu para adivinhar ficou como Sem categoria."
  );

  return {
    transactions,
    skipped: [],
    cardMissing: false,
    suggestedCard: "",
    notes,
  };
}
