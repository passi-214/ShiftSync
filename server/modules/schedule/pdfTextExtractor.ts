import { extractText, getDocumentProxy } from 'unpdf'

/** Port: swap the implementation (OCR, other lib) without touching the parser. */
export interface PdfTextExtractor {
  extract(pdf: Uint8Array): Promise<string>
}

export class UnpdfExtractor implements PdfTextExtractor {
  async extract(pdf: Uint8Array): Promise<string> {
    const doc = await getDocumentProxy(new Uint8Array(pdf))
    const { text } = await extractText(doc, { mergePages: true })
    return Array.isArray(text) ? text.join('\n') : text
  }
}
