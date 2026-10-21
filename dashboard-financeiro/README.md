# Gastos nos cartões

Painel em Next.js para acompanhar os gastos dos cartões de crédito a partir da planilha que já é usada hoje.

## Como rodar

    npm install
    npm run dev

Abra http://localhost:3000.

## Como funciona

- A planilha (.xlsx ou .csv) é lida no próprio navegador. Nada é enviado a servidor.
- A última planilha fica guardada no navegador (localStorage), então ao reabrir a página os dados continuam lá.
- Colunas da v1: data, valor, onde foi a compra, parcela, cartão, categoria.
  A primeira linha deve ter esses nomes. Acentos e maiúsculas não importam.
- Exemplo de arquivo: public/modelo-gastos.csv

## Onde mexer

- lib/parse.ts: leitura da planilha. Para aceitar um nome de coluna novo, edite HEADER_ALIASES.
- lib/types.ts: formato de cada compra. Uma coluna nova começa aqui.
- lib/filters.ts: regras dos filtros.
- components/: telas (Dashboard, FilterBar, MonthChart, CategoryList, CardSplit, TransactionsTable).
