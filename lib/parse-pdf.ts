import { extractText, extractImages, getDocumentProxy } from "unpdf";
import { encodePNG } from "./png-encode";

export interface ExtractedImage {
  dataUrl: string; // base64 PNG data URL
  pageNum: number;
  imageIndex: number; // sequential index across all pages (0-based)
}

export async function extractTextFromPdf(
  buffer: Buffer
): Promise<{ text: string; images: ExtractedImage[] }> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });

  // Extract images from all pages
  const images: ExtractedImage[] = [];
  let globalIndex = 0;

  for (let page = 1; page <= pdf.numPages; page++) {
    try {
      const pageImages = await extractImages(pdf, page);
      for (const img of pageImages) {
        // Skip tiny images (icons, bullets, etc.) — must be at least 50x50
        if (img.width < 50 || img.height < 50) continue;

        // Encode as PNG
        const pngBuf = encodePNG(
          img.data,
          img.width,
          img.height,
          img.channels as 1 | 3 | 4
        );
        const dataUrl = `data:image/png;base64,${pngBuf.toString("base64")}`;

        images.push({
          dataUrl,
          pageNum: page,
          imageIndex: globalIndex,
        });
        globalIndex++;
      }
    } catch {
      // Skip pages where image extraction fails
    }
  }

  // Strip null bytes — Postgres UTF-8 columns reject \x00
  return { text: text.replace(/\0/g, ""), images };
}
