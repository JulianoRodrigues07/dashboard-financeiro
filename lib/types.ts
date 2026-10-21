export type Transaction = {
  id: string;
  /** Data da compra, no formato AAAA-MM-DD */
  date: string;
  /**
   * Mês da fatura em que a compra foi cobrada, no formato AAAA-MM.
   * É por ele que o painel agrupa meses e que uma importação substitui dados.
   * Em planilhas e extratos por data, é o próprio mês da compra.
   */
  invoice: string;
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
  /** A planilha não tem coluna de cartão (ex.: extrato exportado de um banco) */
  cardMissing: boolean;
  /** Sugestão de nome do cartão, tirada do nome do arquivo */
  suggestedCard: string;
  /** Avisos para mostrar na conferência antes de salvar */
  notes: string[];
};
