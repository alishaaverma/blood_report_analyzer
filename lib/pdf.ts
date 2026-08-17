interface PdfTextItem {
  str: string;
  transform: number[];
}

function isTextItem(item: unknown): item is PdfTextItem {
  return (
    typeof item === "object" && item !== null && "str" in item && "transform" in item
  );
}

function pageText(items: unknown[]) {
  const lines = new Map<number, string[]>();
  for (const item of items) {
    if (!isTextItem(item)) continue;
    const y = Math.round(item.transform[5]);
    lines.set(y, [...(lines.get(y) ?? []), item.str]);
  }
  return [...lines.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, words]) => words.join(" "))
    .join("\n");
}

export async function extractPdfText(buffer: Buffer) {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ]);

  // PDF.js disables browser workers in Node and uses its worker module on the
  // main thread. Register it explicitly because Next.js may otherwise resolve
  // the fallback worker relative to a generated server chunk.
  const workerGlobal = globalThis as typeof globalThis & {
    pdfjsWorker?: { WorkerMessageHandler: typeof worker.WorkerMessageHandler };
  };
  workerGlobal.pdfjsWorker = { WorkerMessageHandler: worker.WorkerMessageHandler };

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(pageText(content.items));
    }
    return pages.join("\n");
  } finally {
    await document.destroy();
  }
}
