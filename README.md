# Gastos nos cartões

Painel em Next.js para acompanhar os gastos dos cartões de crédito. As compras ficam salvas por mês numa conta (Supabase), então não é preciso reabrir a planilha toda vez.

## Como rodar

    npm install
    cp .env.example .env.local     (preencha as duas variáveis)
    npm run dev

Abra http://localhost:3000. Sem as variáveis o site abre, mas só mostra os dados de exemplo.

## Configurar o Supabase (uma vez)

1. Crie um projeto em supabase.com.
2. Em SQL Editor, cole e rode o arquivo supabase/schema.sql inteiro.
3. Em Authentication, crie o usuário da sua mãe (e-mail e senha, marcando para confirmar automaticamente) e desative o cadastro de novos usuários.
4. Em Project Settings, API: copie a URL do projeto e a chave pública (anon) para .env.local.
5. Na Vercel, cadastre as mesmas duas variáveis em Settings, Environment Variables, e faça um novo deploy.

## Como os dados são guardados

- Cada compra fica na tabela transactions, ligada ao usuário. As regras de acesso (RLS) garantem que cada conta só enxerga as próprias compras.
- Cada compra tem a data da compra e o mês da fatura em que foi cobrada (campo invoice). O painel agrupa por mês da fatura.
- Ao importar, o sistema mostra um resumo por fatura e cartão para conferir. Ao salvar, as compras daquele cartão naquela fatura são substituídas pelas do arquivo. Enviar a mesma fatura duas vezes não duplica.
- Planilhas e extratos (.xlsx, .csv): colunas data, valor, onde foi a compra, parcela, cartão, categoria. O mês da fatura é o mês da compra. Exemplo em public/modelo-gastos.csv.
- Fatura em PDF do Porto Bank: o mês da fatura é o do vencimento, cada cartão da fatura vira um cartão ("Porto final 126") e o pagamento da fatura anterior é ignorado. A categoria é sugerida pelo nome da loja (regras em lib/pdf/categorize.ts). O leitor está em lib/pdf/porto.ts; para outro banco, crie um arquivo parecido.
- Se você já tinha rodado o schema.sql antes, rode também supabase/migracao-fatura.sql uma vez.

## Onde mexer

- lib/parse.ts: leitura da planilha. Para aceitar um nome de coluna novo, edite HEADER_ALIASES.
- lib/types.ts e supabase/schema.sql: formato da compra. Uma coluna nova começa nos dois.
- lib/db.ts: leitura e gravação no banco.
- lib/filters.ts: regras dos filtros.
- components/: telas.
