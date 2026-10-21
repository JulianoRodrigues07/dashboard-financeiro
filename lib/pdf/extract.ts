import { linesFromPdf, type PdfDocLike } from "./lines";

/** Abre o PDF no navegador e devolve o texto, linha por linha. */
export async function readPdfLines(file: File): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Arquivo copiado para a pasta public pelo script de instalação
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());

  try {
    const doc = await pdfjs.getDocument({ data }).promise;
    return await linesFromPdf(doc as unknown as PdfDocLike);
  } catch (e) {
    if (e && typeof e === "object" && (e as { name?: string }).name === "PasswordException") {
      throw new Error(
        "Esse PDF tem senha. Abra o arquivo, salve uma cópia sem senha (imprimir como PDF) e envie de novo."
      );
    }
    throw new Error("Não consegui ler esse PDF. Confira se o arquivo não está danificado.");
  }
}
