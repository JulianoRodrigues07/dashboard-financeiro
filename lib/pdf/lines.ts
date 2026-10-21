/**
 * Transforma o conteúdo de um PDF em linhas de texto, na ordem de leitura.
 * Os itens de texto do PDF vêm soltos, com posição (x, y); aqui eles são
 * agrupados pela altura (y) e ordenados da esquerda para a direita.
 */

type TextItem = { str: string; x: number; y: number; width: number };

type PdfPageLike = {
  getTextContent: () => Promise<{ items: unknown[] }>;
};

export type PdfDocLike = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPageLike>;
};

function toTextItems(items: unknown[]): TextItem[] {
  const out: TextItem[] = [];
  for (const raw of items) {
    const item = raw as { str?: string; transform?: number[]; width?: number };
    if (typeof item.str !== "string" || !item.transform || item.str === "") continue;
    out.push({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width ?? 0,
    });
  }
  return out;
}

function groupIntoLines(items: TextItem[]): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextItem[][] = [];

  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - item.y) <= 3) {
      last.push(item);
    } else {
      lines.push([item]);
    }
  }

  return lines
    .map((line) => {
      line.sort((a, b) => a.x - b.x);
      let text = "";
      let prevEnd: number | null = null;
      for (const item of line) {
        if (prevEnd !== null && item.x - prevEnd > 1) text += " ";
        text += item.str;
        prevEnd = item.x + item.width;
      }
      return text.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);
}

export async function linesFromPdf(doc: PdfDocLike): Promise<string[]> {
  const all: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    all.push(...groupIntoLines(toTextItems(content.items)));
  }
  return all;
}
