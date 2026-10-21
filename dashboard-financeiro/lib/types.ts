export type Transaction = {
  id: string;
  /** Data no formato AAAA-MM-DD */
  date: string;
  amount: number;
  place: string;
  /** Exemplo: "2/4" ou "À vista" */
  installment: string;
  card: string;
  category: string;
};

export type ParseResult = {
  transactions: Transaction[];
  /** Linhas que não puderam ser lidas, com o motivo */
  skipped: { line: number; reason: string }[];
};
