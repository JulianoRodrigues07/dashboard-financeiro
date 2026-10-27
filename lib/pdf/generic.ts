import type { ParseResult, Transaction } from "../types";
import { categorize } from "./categorize";
import { cleanPlace, splitInstallment } from "./porto";

/**
 * Leitor genérico de fatura em PDF, para bancos que ainda não têm leitor
 * próprio. Procura linhas no formato "data  descrição  valor", em estes estilos:
 *   05/09 PADARIA 45,90      05/09/2026 PADARIA R$ 45,90      05 SET PADARIA R$ 45,90
 * Como cada banco monta a fatura de um jeito, é uma leitura por aproximação: a
 * tela de conferência mostra todas as linhas lidas e compara com o total.
 */

const MONEY = "(?:-\\s*)?(?:R\\$\\s*)?(?:-\\s*)?\\d{1,3}(?:\\.\\d{3})*,\\d{2}(?:\\s*-|\\s*CR)?";
const TRAIL_AMOUNT = new RegExp(`\\s(${MONEY})$`, "i");
const ANY_AMOUNT = new RegExp(MONEY, "gi");
const DATE_NUM = /^(\d{2})\/(\d{2})(?:\/(\d{4}|\d{2}))?\s+/;
const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const DATE_ABBR = new RegExp(
  `^(\\d{1,2})[\\s/]+(${MONTHS.join("|")})\\.?(?:\\s+\\d{2}:\\d{2})?\\s+`,
  "i"
);
/** "Passo Fundo Presencial Loja X": cidade e canal que alguns bancos colocam antes do nome. */
const CHANNEL_PREFIX = /^.*?\b(?:Presencial|Online)\s+/i;
/** Textos fixos que alguns emissores colocam antes do nome do estabelecimento. */
const FIXED_PREFIXES = [
  /^Parcela de compra lojista MasterCard\s*-?\s*/i,
  /^Compra a Vista sem Juros MasterCard\s*-?\s*/i,
];
/** Títulos que abrem a lista de parcelas de faturas futuras, que não são desta fatura. */
const FUTURE_SECTION = /^(compras parceladas\b|pr[oó]ximas faturas\b|parcelas a vencer\b)/i;
const DETAIL_SECTION = /^(lan[cç]amentos|transa[cç][oõ]es|detalhamento)\b/i;

const SKIP_DESCRIPTION =
  /^(PAGAMENTOS?|PAGTO|PGTO|SALDO|TOTAL|CREDITO ROTATIVO)\b|vencimento|fechamento|emiss[aã]o|limite|pagamento m[ií]nimo/i;

// Emissores e lojas vêm antes dos bancos que só emitem o boleto (Itaú, Santander).
const BANKS: [RegExp, string][] = [
  [/renner|meu cart[aã]o/i, "Renner"],
  [/riachuelo|midway/i, "Riachuelo"],
  [/carrefour/i, "Carrefour"],
  [/mercado pago/i, "Mercado Pago"],
  [/picpay/i, "PicPay"],
  [/porto\s*bank/i, "Porto"],
  [/nubank|nu pagamentos/i, "Nubank"],
  [/sicredi/i, "Sicredi"],
  [/sicoob/i, "Sicoob"],
  [/banco inter|\binter\b/i, "Inter"],
  [/c6 bank|\bc6\b/i, "C6"],
  [/\bxp\b/i, "XP"],
  [/btg/i, "BTG"],
  [/banrisul/i, "Banrisul"],
  [/bradesco/i, "Bradesco"],
  [/caixa econ/i, "Caixa"],
  [/banco do brasil|ourocard/i, "Banco do Brasil"],
  [/ita[uú]/i, "Itaú"],
  [/santander/i, "Santander"],
];

const pad = (n: number) => String(n).padStart(2, "0");
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function parseMoney(token: string): number {
  const negative = /-/.test(token) || /CR\s*$/i.test(token);
  const digits = token.replace(/[^\d,]/g, "").replace(",", ".");
  const value = Number(digits);
  return negative ? -value : value;
}

function validDate(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function findDueDate(lines: string[]) {
  const counts = new Map<string, number>();
  for (let i = 0; i < lines.length; i++) {
    if (!/venc/i.test(lines[i])) continue;
    // Primeiro na própria linha; se for só um rótulo curto, olha a linha seguinte
    const text = lines[i].length <= 60 ? `${lines[i]} ${lines[i + 1] ?? ""}` : lines[i];
    const m = (lines[i].match(/(\d{2})\/(\d{2})\/(\d{4})/) ?? text.match(/(\d{2})\/(\d{2})\/(\d{4})/));
    if (m) counts.set(m[0], (counts.get(m[0]) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [date, n] of counts) if (!best || n > counts.get(best)!) best = date;
  if (!best) return null;
  const [d, mo, y] = best.split("/").map(Number);
  return { day: d, month: mo, year: y };
}

function findAnyFullDateYear(lines: string[]): number | null {
  let best: number | null = null;
  for (const line of lines) {
    for (const m of line.matchAll(/\b\d{2}\/\d{2}\/(20\d{2})\b/g)) {
      best = Math.max(best ?? 0, Number(m[1]));
    }
  }
  return best;
}

function findCardName(lines: string[]): string {
  const text = lines.slice(0, 80).join("\n");
  const bank = BANKS.find(([re]) => re.test(text))?.[1] ?? "";
  const final =
    text.match(/\bf(?:i)?nal\s*\*?\s*(\d{3,4})\b/i)?.[1] ??
    text.match(/(?:\*{2,}|•{2,}|x{2,})[.\s*•x-]*(\d{3,4})\b/i)?.[1];
  return [bank, final ? `final ${final}` : ""].filter(Boolean).join(" ");
}

function findStatedTotals(lines: string[]): number[] {
  const totals: number[] = [];
  const key =
    /total (da )?(sua )?fatura|total desta fatura|valor total|total a pagar|total geral|compras\s*\/\s*d[eé]bitos|despesas atuais/i;
  for (let i = 0; i < lines.length; i++) {
    if (!key.test(lines[i])) continue;
    const near = `${lines[i]} ${lines[i + 1] ?? ""}`;
    for (const m of near.matchAll(ANY_AMOUNT)) totals.push(Math.abs(parseMoney(m[0])));
  }
  return totals;
}

type Candidate = {
  day: number;
  month: number;
  yearText?: string;
  description: string;
  amount: number;
};

export function parseGenericLines(lines: string[], today = new Date()): ParseResult {
  const due = findDueDate(lines);
  const referenceYear = due?.year ?? findAnyFullDateYear(lines) ?? today.getFullYear();
  const candidates: Candidate[] = [];
  let paymentsTotal = 0;
  let inFutureSection = false;

  for (const line of lines) {
    if (FUTURE_SECTION.test(line)) {
      inFutureSection = true;
      continue;
    }
    if (DETAIL_SECTION.test(line)) inFutureSection = false;
    if (inFutureSection) continue;

    let day: number;
    let month: number;
    let yearText: string | undefined;
    let rest: string;

    const num = line.match(DATE_NUM);
    const abbr = num ? null : line.match(DATE_ABBR);
    if (num) {
      day = Number(num[1]);
      month = Number(num[2]);
      yearText = num[3];
      rest = line.slice(num[0].length);
    } else if (abbr) {
      day = Number(abbr[1]);
      month = MONTHS.indexOf(abbr[2].toUpperCase()) + 1;
      rest = line.slice(abbr[0].length);
    } else {
      continue;
    }

    const amountMatch = rest.match(TRAIL_AMOUNT);
    if (!amountMatch || amountMatch.index === undefined) continue;

    const amount = parseMoney(amountMatch[1]);
    const description = rest.slice(0, amountMatch.index).trim();
    if (!/[A-Za-zÀ-ÿ]{2}/.test(description)) continue;

    if (/^(PAGAMENTOS?|PAGTO|PGTO)\b/i.test(description)) {
      paymentsTotal += Math.abs(amount);
      continue;
    }
    if (SKIP_DESCRIPTION.test(description)) continue;

    candidates.push({ day, month, yearText, description, amount });
  }

  // Só remove cidade e canal quando a maioria das linhas tem a coluna "Presencial/Online"
  const withChannel = candidates.filter((c) => CHANNEL_PREFIX.test(c.description)).length;
  const stripChannel = withChannel >= 2 && withChannel >= candidates.length / 2;

  const transactions: Transaction[] = [];
  for (const c of candidates) {
    let year: number;
    if (c.yearText) {
      year = c.yearText.length === 2 ? 2000 + Number(c.yearText) : Number(c.yearText);
    } else if (due) {
      year =
        c.month < due.month || (c.month === due.month && c.day <= due.day)
          ? due.year
          : due.year - 1;
    } else {
      const candidate = validDate(referenceYear, c.month, c.day);
      year = candidate && new Date(candidate) > today ? referenceYear - 1 : referenceYear;
    }

    const date = validDate(year, c.month, c.day);
    if (!date) continue;

    let description = c.description;
    if (stripChannel) description = description.replace(CHANNEL_PREFIX, "");
    const { installment, rest: withoutInstallment } = splitInstallment(` ${description}`);
    let place = cleanPlace(withoutInstallment);
    for (const prefix of FIXED_PREFIXES) place = place.replace(prefix, "");
    place = place.replace(/[\s\-–]+$/, "");

    transactions.push({
      id: `pdf${transactions.length}`,
      date,
      invoice: date.slice(0, 7), // ajustado abaixo
      amount: c.amount,
      place: place || "Sem descrição",
      installment,
      card: "",
      category: categorize(place),
    });
  }

  if (transactions.length === 0) {
    throw new Error(
      "Não encontrei a lista de compras nesse PDF. Ele pode ter um formato que o site ainda não conhece. Se puder, baixe a fatura em CSV ou OFX no app do banco."
    );
  }

  const invoice = due
    ? `${due.year}-${pad(due.month)}`
    : transactions.map((t) => t.date).sort().at(-1)!.slice(0, 7);
  for (const t of transactions) t.invoice = invoice;

  const sum = transactions.reduce((acc, t) => acc + t.amount, 0);
  const stated = findStatedTotals(lines);
  const notes: string[] = [
    "Leitura aproximada: esse banco ainda não tem leitor próprio. Confira a lista de compras abaixo com a sua fatura antes de salvar.",
  ];
  if (stated.some((t) => Math.abs(t - sum) < 0.01)) {
    notes.push(`A soma das compras lidas (${brl(sum)}) bate com um total informado na fatura.`);
  } else {
    notes.push(
      `Não consegui confirmar o total pela fatura. A soma das compras lidas é ${brl(sum)}; compare com o total do seu PDF.`
    );
  }
  if (paymentsTotal > 0) {
    notes.push(`Linhas de pagamento (${brl(paymentsTotal)}) foram ignoradas, porque não são gastos.`);
  }
  if (!due) {
    notes.push(
      "Não achei a data de vencimento, então considerei a fatura do mês da última compra e deduzi o ano das datas."
    );
  }
  notes.push(
    "Se a fatura tiver mais de um cartão, todas as compras serão salvas juntas sob o nome que você informar."
  );

  return {
    transactions,
    skipped: [],
    cardMissing: true,
    suggestedCard: findCardName(lines),
    notes,
    showRows: true,
  };
}
