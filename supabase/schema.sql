-- Rode este arquivo inteiro uma vez no SQL Editor do Supabase.

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  amount numeric(12, 2) not null,
  place text not null,
  installment text not null default 'À vista',
  card text not null,
  category text not null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date);

-- Cada pessoa só enxerga e altera as próprias compras.
alter table public.transactions enable row level security;

create policy "ver proprias compras" on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));

create policy "criar proprias compras" on public.transactions
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "editar proprias compras" on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "apagar proprias compras" on public.transactions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Importação: apaga as compras dos cartões e meses que aparecem no arquivo
-- e grava as novas, tudo numa só transação. Enviar a mesma fatura duas vezes
-- não duplica nada.
create or replace function public.replace_transactions(rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted integer;
begin
  delete from public.transactions t
  using (
    select distinct
      r ->> 'card' as card,
      to_char((r ->> 'date')::date, 'YYYY-MM') as month
    from jsonb_array_elements(rows) as r
  ) p
  where t.user_id = auth.uid()
    and t.card = p.card
    and to_char(t.date, 'YYYY-MM') = p.month;

  insert into public.transactions (date, amount, place, installment, card, category)
  select
    (r ->> 'date')::date,
    (r ->> 'amount')::numeric,
    r ->> 'place',
    r ->> 'installment',
    r ->> 'card',
    r ->> 'category'
  from jsonb_array_elements(rows) as r;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke execute on function public.replace_transactions(jsonb) from public, anon;
grant execute on function public.replace_transactions(jsonb) to authenticated;
