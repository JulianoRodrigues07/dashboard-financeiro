-- Rode este arquivo UMA vez no SQL Editor do Supabase, se você já tinha rodado
-- o schema.sql antes. Ele adiciona a coluna "invoice" (mês da fatura) e troca a
-- função de importação para substituir dados por cartão e fatura.
-- As compras que já estão salvas passam a valer como fatura do mês da compra.

alter table public.transactions add column if not exists invoice text;

update public.transactions
set invoice = to_char(date, 'YYYY-MM')
where invoice is null;

alter table public.transactions alter column invoice set not null;

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
      coalesce(r ->> 'invoice', to_char((r ->> 'date')::date, 'YYYY-MM')) as invoice
    from jsonb_array_elements(rows) as r
  ) p
  where t.user_id = auth.uid()
    and t.card = p.card
    and t.invoice = p.invoice;

  insert into public.transactions (date, invoice, amount, place, installment, card, category)
  select
    (r ->> 'date')::date,
    coalesce(r ->> 'invoice', to_char((r ->> 'date')::date, 'YYYY-MM')),
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
