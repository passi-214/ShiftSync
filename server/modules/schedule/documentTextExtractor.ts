import mammoth from 'mammoth'
import { extractText, getDocumentProxy } from 'unpdf'
import { InputError } from '../../domain/errors'

/** Port: anything that turns an uploaded roster file into plain text. */
export interface DocumentTextExtractor {
  extract(file: Uint8Array): Promise<string>
}

export type DocumentFormat = 'pdf' | 'docx'

/** Detects the format from the file's first bytes (never trust file names or MIME types). */
export function sniffFormat(file: Uint8Array): DocumentFormat | null {
  const head = Buffer.from(file.subarray(0, 5))
  if (head.toString('latin1') === '%PDF-') return 'pdf'
  // .docx is a zip container. (Legacy binary .doc starts with D0 CF 11 E0 and is rejected.)
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) return 'docx'
  return null
}

export class UnpdfExtractor implements DocumentTextExtractor {
  async extract(file: Uint8Array): Promise<string> {
    const doc = await getDocumentProxy(new Uint8Array(file))
    const { text } = await extractText(doc, { mergePages: true })
    return Array.isArray(text) ? text.join('\n') : text
  }
}

/** Word files: paragraphs and table cells become plain text; the parser ignores line breaks anyway. */
export class MammothExtractor implements DocumentTextExtractor {
  async extract(file: Uint8Array): Promise<string> {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(file) })
    return value
  }
}

/** Routes to the right extractor. Add a format (e.g. .odt, .txt) by adding an entry. */
export class MultiFormatExtractor implements DocumentTextExtractor {
  constructor(private extractors: Record<DocumentFormat, DocumentTextExtractor> = { pdf: new UnpdfExtractor(), docx: new MammothExtractor() }) {}

  async extract(file: Uint8Array): Promise<string> {
    const format = sniffFormat(file)
    if (!format) throw new InputError('unsupported_file')
    try {
      return await this.extractors[format].extract(file)
    } catch {
      throw new InputError('read_failed') // corrupt, encrypted, or a zip that is not a Word document
    }
  }
}
