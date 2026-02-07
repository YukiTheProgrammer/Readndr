import { extractText, getDocumentProxy } from "unpdf";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  // Strip null bytes — Postgres UTF-8 columns reject \x00
  return text.replace(/\0/g, "");
}
