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
  /** A planilha não tem coluna de cartão (ex.: extrato exportado de um banco) */
  cardMissing: boolean;
  /** Sugestão de nome do cartão, tirada do nome do arquivo */
  suggestedCard: string;
  /** Linhas que não puderam ser lidas, com o motivo */
  skipped: { line: number; reason: string }[];
};