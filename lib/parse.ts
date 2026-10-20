import Papa from "papaparse";
import { readSheet } from "read-excel-file/web-worker";
import type { ParseResult, Transaction } from "./types";

type Cell = unknown;
type Field = "date" | "amount" | "place" | "installment" | "card" | "category";

/**
 * Nomes de coluna aceitos para cada campo. Os nomes são comparados sem acento,
 * sem espaço e em minúsculas. Para aceitar um nome novo, basta incluir aqui.
 */
const HEADER_ALIASES: Record<Field, string[]> = {
  date: ["data", "datadacompra", "datacompra", "dia"],
  amount: ["valor", "valorrs", "total", "preco"],
  place: [
    "ondefoiacompra",
    "onde",
    "local",
    "estabelecimento",
    "descricao",
    "lancamento",
    "historico",
    "compra",
    "loja",
  ],
  installment: [
    "parcela",
    "parcelas",
    "numerodeparcela",
    "numerodaparcela",
    "nparcela",
    "tipo",
  ],
  card: ["cartao", "cartaodecredito"],
  category: ["categoria"],
};

const FIELD_LABELS: Record<Field, string> = {
  date: "data",
  amount: "valor",
  place: "onde foi a compra",
  installment: "parcela",
  card: "cartão",
  category: "categoria",
};

function normalizeHeader(value: Cell): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findColumns(row: Cell[]): Partial<Record<Field, number>> {
  const found: Partial<Record<Field, number>> = {};
  row.forEach((cell, index) => {
    const name = normalizeHeader(cell);
    if (!name) return;
    (Object.keys(HEADER_ALIASES) as Field[]).forEach((field) => {
      if (found[field] === undefined && HEADER_ALIASES[field].includes(name)) {
        found[field] = index;
      }
    });
  });
  return found;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Confere se o dia existe de verdade (31/02 não existe). */
function buildDate(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isDate(value: Cell): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/** Datas lidas do Excel chegam em UTC, então usamos os getters UTC. */
function dateFromObject(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function parseDate(value: Cell): string | null {
  if (isDate(value)) return dateFromObject(value);

  if (typeof value === "number" && value > 20000 && value < 80000) {
    // Número de série do Excel
    return dateFromObject(new Date(Math.round((value - 25569) * 86400 * 1000)));
  }

  if (typeof value === "string") {
    const text = value.trim();

    let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      return buildDate(Number(match[1]), Number(match[2]), Number(match[3]));
    }

    match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
    if (match) {
      const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
      return buildDate(year, Number(match[2]), Number(match[1]));
    }
  }

  return null;
}

function parseAmount(value: Cell): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  let text = value.trim();
  if (!text) return null;

  // Negativo: entre parênteses ou com sinal de menos antes do primeiro número
  const negative = /^\(.*\)$/.test(text) || /^[^\d]*-/.test(text);
  text = text.replace(/[^\d.,]/g, "");
  if (!text) return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    // O separador que aparece por último é o decimal
    if (lastComma > lastDot) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    text = text.replace(",", ".");
  } else if (lastDot !== -1 && /^\d{1,3}(\.\d{3})+$/.test(text)) {
    // "1.234" é mil duzentos e trinta e quatro
    text = text.replace(/\./g, "");
  }

  const number = Number(text);
  if (!Number.isFinite(number)) return null;
  return negative ? -number : number;
}

function parseInstallment(value: Cell): string {
  if (value === null || value === undefined || value === "") return "À vista";
  // O Excel costuma transformar "2/4" em data (2 de abril). Desfazemos isso.
  if (isDate(value)) return `${value.getUTCDate()}/${value.getUTCMonth() + 1}`;

  const raw = String(value).trim();
  if (!raw) return "À vista";

  const plain = normalizeHeader(raw);
  if (plain.includes("vista")) return "À vista";

  // "Parcela 2 de 5", "2/5", "Parcela 2/5" viram "2/5"
  const match = raw.match(/(\d+)\s*(?:\/|de)\s*(\d+)/i);
  if (match) return `${Number(match[1])}/${Number(match[2])}`;

  return raw;
}

/** Tira espaços repetidos e o código do país no fim ("... PASSO FUNDO BRA"). */
function cleanPlace(value: Cell): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\sBRA$/, "");
}

/** Textos todo em maiúsculas ("SUPERMERCADO") viram "Supermercado". */
function cleanCategory(value: Cell): string {
  const raw = String(value ?? "").trim();
  if (raw && raw === raw.toUpperCase() && raw !== raw.toLowerCase()) {
    return raw.charAt(0) + raw.slice(1).toLowerCase();
  }
  return raw;
}

function text(value: Cell, fallback: string): string {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function rowsToTransactions(rows: Cell[][], suggestedCard: string): ParseResult {
  // Procura o cabeçalho nas primeiras linhas
  let headerIndex = -1;
  let columns: Partial<Record<Field, number>> = {};
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const found = findColumns(rows[i]);
    if (found.date !== undefined && found.amount !== undefined) {
      headerIndex = i;
      columns = found;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error(
      "Não encontrei as colunas obrigatórias. A primeira linha precisa ter pelo menos “data” e “valor”."
    );
  }

  const transactions: Transaction[] = [];
  const skipped: ParseResult["skipped"] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) {
      continue;
    }

    const line = i + 1;
    const date = parseDate(row[columns.date!]);
    const amount = parseAmount(row[columns.amount!]);

    if (!date) {
      skipped.push({ line, reason: "data não reconhecida" });
      continue;
    }
    if (amount === null) {
      skipped.push({ line, reason: "valor não reconhecido" });
      continue;
    }

    const cell = (field: Field): Cell =>
      columns[field] === undefined ? null : row[columns[field]!];

    transactions.push({
      id: `t${line}`,
      date,
      amount,
      place: cleanPlace(cell("place")) || "Sem descrição",
      installment: parseInstallment(cell("installment")),
      card: text(cell("card"), "Sem cartão"),
      category: cleanCategory(cell("category")) || "Sem categoria",
    });
  }

  if (transactions.length === 0) {
    throw new Error("A planilha foi lida, mas nenhuma linha de compra pôde ser aproveitada.");
  }

  return {
    transactions,
    skipped,
    cardMissing: columns.card === undefined,
    suggestedCard,
  };
}

/** "inter-from-2026-09-01.csv" vira "Inter". */
function suggestCardName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const first = base.split(/[-_\s\d]/)[0] ?? "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "";
}

async function readCsv(file: File): Promise<Cell[][]> {
  const buffer = await file.arrayBuffer();
  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    // CSV salvo pelo Excel costuma vir em Windows-1252
    content = new TextDecoder("windows-1252").decode(buffer);
  }
  content = content.replace(/^\uFEFF/, "");
  const result = Papa.parse<string[]>(content, { skipEmptyLines: true });
  return result.data;
}

export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  const suggested = suggestCardName(file.name);

  if (name.endsWith(".csv")) {
    return rowsToTransactions(await readCsv(file), suggested);
  }

  if (name.endsWith(".xlsx")) {
    const rows = (await readSheet(file)) as Cell[][];
    return rowsToTransactions(rows, suggested);
  }

  throw new Error("Formato não suportado. Envie um arquivo .xlsx ou .csv.");
}

export { FIELD_LABELS };