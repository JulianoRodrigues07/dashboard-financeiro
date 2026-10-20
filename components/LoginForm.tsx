"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  onDemo: () => void;
};

type Mode = "entrar" | "criar" | "esqueci";

const TITLES: Record<Mode, { heading: string; text: string; button: string; busy: string }> = {
  entrar: {
    heading: "Gastos nos cartões",
    text: "Entre para ver os gastos salvos de todos os meses.",
    button: "Entrar",
    busy: "Entrando...",
  },
  criar: {
    heading: "Criar conta",
    text: "Crie seu acesso. Cada conta enxerga só as próprias compras.",
    button: "Criar conta",
    busy: "Criando...",
  },
  esqueci: {
    heading: "Nova senha",
    text: "Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.",
    button: "Enviar link",
    busy: "Enviando...",
  },
};

function friendlyError(msg: string): string {
  if (msg === "Invalid login credentials") return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) {
    return "Esse e-mail ainda não foi confirmado. Abra o link que enviamos para a sua caixa de entrada (veja também o spam).";
  }
  if (/already registered|already been registered/i.test(msg)) {
    return "Esse e-mail já tem cadastro. Use a opção Entrar.";
  }
  if (/at least \d+ characters|password should be/i.test(msg)) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (/rate limit|too many|security purposes/i.test(msg)) {
    return "Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.";
  }
  if (/signups? (not allowed|are disabled|is disabled)|signup.*disabled/i.test(msg)) {
    return "Novos cadastros estão desativados no momento.";
  }
  if (/invalid api key|apikey/i.test(msg)) {
    return "A chave do Supabase está incorreta. Use a chave pública (anon ou publishable).";
  }
  if (/failed to fetch|network/i.test(msg)) {
    return "Não consegui falar com o Supabase. Confira a URL configurada e a conexão com a internet.";
  }
  return `Não foi possível continuar: ${msg}`;
}

export default function LoginForm({ onDemo }: Props) {
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(friendlyError(error.message));
      } else if (mode === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          setError(friendlyError(error.message));
        } else if (!data.session) {
          setInfo(
            "Enviamos um e-mail para confirmar o cadastro. Abra o link que está nele (veja também o spam) e depois volte aqui para entrar."
          );
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) {
          setError(friendlyError(error.message));
        } else {
          setInfo(
            "Se esse e-mail tiver cadastro, enviamos um link para criar uma nova senha. Veja também o spam."
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-2 min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-ink";
  const linkClass = "font-semibold text-brand underline";
  const t = TITLES[mode];

  return (
    <section className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-4xl font-bold tracking-tight">{t.heading}</h1>
      <p className="mt-3 text-lg text-muted">{t.text}</p>

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

          {mode !== "esqueci" && (
            <label className="block font-semibold">
              Senha
              <input
                type="password"
                autoComplete={mode === "criar" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              {mode === "criar" && (
                <span className="mt-1 block text-sm font-normal text-muted">
                  Mínimo de 6 caracteres.
                </span>
              )}
            </label>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-[#fbeae6] px-4 py-3 text-danger">
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="rounded-xl bg-brand-soft px-4 py-3 text-brand">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-xl bg-brand px-6 font-semibold text-white hover:bg-[#093f3b] disabled:opacity-60"
          >
            {busy ? t.busy : t.button}
          </button>

          <div className="space-y-2 text-muted">
            {mode === "entrar" && (
              <>
                <p>
                  Ainda não tem conta?{" "}
                  <button type="button" onClick={() => switchMode("criar")} className={linkClass}>
                    Criar conta
                  </button>
                </p>
                <p>
                  <button type="button" onClick={() => switchMode("esqueci")} className={linkClass}>
                    Esqueci minha senha
                  </button>
                </p>
              </>
            )}
            {mode !== "entrar" && (
              <p>
                <button type="button" onClick={() => switchMode("entrar")} className={linkClass}>
                  Voltar para Entrar
                </button>
              </p>
            )}
          </div>
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
        <button type="button" onClick={onDemo} className={linkClass}>
          Ver com dados de exemplo
        </button>
      </p>
    </section>
  );
}
