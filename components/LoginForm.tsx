"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  onDemo: () => void;
};

export default function LoginForm({ onDemo }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message;
      if (msg === "Invalid login credentials") {
        setError("E-mail ou senha incorretos.");
      } else if (/email not confirmed/i.test(msg)) {
        setError(
          "Esse e-mail ainda não foi confirmado. No Supabase, em Authentication, abra o usuário e confirme o e-mail."
        );
      } else if (/invalid api key|apikey/i.test(msg)) {
        setError("A chave do Supabase no .env.local está incorreta. Use a chave pública (anon ou publishable).");
      } else if (/failed to fetch|network/i.test(msg)) {
        setError("Não consegui falar com o Supabase. Confira a URL no .env.local e a conexão com a internet.");
      } else {
        setError(`Não foi possível entrar: ${msg}`);
      }
    }
    setBusy(false);
  }

  const inputClass =
    "mt-2 min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-ink";

  return (
    <section className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Gastos nos cartões</h1>
      <p className="mt-3 text-lg text-muted">
        Entre para ver os gastos salvos de todos os meses.
      </p>

      {supabase ? (
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block font-semibold">
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block font-semibold">
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-[#fbeae6] px-4 py-3 text-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-xl bg-brand px-6 font-semibold text-white hover:bg-[#093f3b] disabled:opacity-60"
          >
            {busy ? "Entrando..." : "Entrar"}
          </button>
        </form>
      ) : (
        <p className="mt-8 rounded-xl bg-brand-soft px-4 py-3 text-brand">
          O banco de dados ainda não está configurado. Preencha as variáveis
          NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (veja o
          README).
        </p>
      )}

      <p className="mt-8 text-muted">
        Quer só dar uma olhada?{" "}
        <button type="button" onClick={onDemo} className="font-semibold text-brand underline">
          Ver com dados de exemplo
        </button>
      </p>
    </section>
  );
}
