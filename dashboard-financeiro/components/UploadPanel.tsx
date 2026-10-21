"use client";

import { useRef, useState } from "react";

type Props = {
  onFile: (file: File) => void;
  onSample: () => void;
  error: string | null;
  loading: boolean;
};

export default function UploadPanel({ onFile, onSample, error, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <section className="mx-auto max-w-2xl py-16">
      <h1 className="text-4xl font-bold tracking-tight">Gastos nos cartões</h1>
      <p className="mt-3 text-lg text-muted">
        Envie a planilha com as compras e veja tudo somado, por cartão, por
        categoria e por mês. O arquivo é lido aqui no navegador e não é enviado
        para nenhum servidor.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={`mt-8 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? "border-brand bg-brand-soft" : "border-line bg-surface"
        }`}
      >
        <p className="text-lg font-semibold">Arraste a planilha para cá</p>
        <p className="mt-1 text-muted">Aceita arquivos .xlsx e .csv</p>
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-brand px-6 font-semibold text-white hover:bg-[#093f3b] disabled:opacity-60"
        >
          {loading ? "Lendo planilha..." : "Escolher arquivo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="sr-only"
          aria-label="Escolher planilha de gastos"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#fbeae6] px-4 py-3 text-danger">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-2 text-muted">
        <p>
          A primeira linha da planilha deve ter as colunas: data, valor, onde
          foi a compra, parcela, cartão e categoria.{" "}
          <a className="font-semibold text-brand underline" href="/modelo-gastos.csv" download>
            Baixar planilha modelo
          </a>
        </p>
        <p>
          Quer só dar uma olhada?{" "}
          <button
            type="button"
            onClick={onSample}
            className="font-semibold text-brand underline"
          >
            Ver com dados de exemplo
          </button>
        </p>
      </div>
    </section>
  );
}
