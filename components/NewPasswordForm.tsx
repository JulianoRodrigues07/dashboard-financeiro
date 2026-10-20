"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  onDone: () => void;
};

export default function NewPasswordForm({ onDone }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (password !== confirm) {
      setError("As duas senhas precisam ser iguais.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(
        /at least \d+ characters|password should be/i.test(error.message)
          ? "A senha precisa ter pelo menos 6 caracteres."
          : `Não foi possível salvar a nova senha: ${error.message}`
      );
      return;
    }
    onDone();
  }

  const inputClass =
    "mt-2 min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-ink";

  return (
    <section className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Criar nova senha</h1>
      <p className="mt-3 text-lg text-muted">
        Escolha a nova senha da sua conta. Depois de salvar, você já entra no painel.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <label className="block font-semibold">
          Nova senha
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block font-semibold">
          Repita a nova senha
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {busy ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </section>
  );
}
