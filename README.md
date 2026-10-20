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
- Ao importar uma planilha, o sistema mostra um resumo por mês e cartão para conferir. Ao salvar, as compras daquele cartão naquele mês são substituídas pelas do arquivo. Enviar a mesma fatura duas vezes não duplica.
- Colunas da planilha: data, valor, onde foi a compra, parcela, cartão, categoria. Exemplo em public/modelo-gastos.csv.

## Onde mexer

- lib/parse.ts: leitura da planilha. Para aceitar um nome de coluna novo, edite HEADER_ALIASES.
- lib/types.ts e supabase/schema.sql: formato da compra. Uma coluna nova começa nos dois.
- lib/db.ts: leitura e gravação no banco.
- lib/filters.ts: regras dos filtros.
- components/: telas.
