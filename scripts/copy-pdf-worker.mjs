// Copia o worker do pdf.js para a pasta public, de onde o navegador o carrega.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const from = "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs";
if (existsSync(from)) {
  mkdirSync("public", { recursive: true });
  copyFileSync(from, "public/pdf.worker.min.mjs");
}
