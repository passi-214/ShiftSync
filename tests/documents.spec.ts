import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { InputError } from '../server/domain/errors'
import { MultiFormatExtractor, sniffFormat } from '../server/modules/schedule/documentTextExtractor'
import { parseSchedule } from '../server/modules/schedule/scheduleParser'
import { SAMPLE } from './fixtures'

const docx = new Uint8Array(readFileSync(new URL('./files/sample-roster.docx', import.meta.url)))

describe('document formats', () => {
  it('detects formats by content, not by name', () => {
    expect(sniffFormat(new TextEncoder().encode('%PDF-1.7 ...'))).toBe('pdf')
    expect(sniffFormat(docx)).toBe('docx')
    expect(sniffFormat(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0]))).toBeNull() // legacy .doc
    expect(sniffFormat(new TextEncoder().encode('hello'))).toBeNull()
  })
  it('reads a Word roster to the same result as the PDF text', async () => {
    const fromDocx = parseSchedule(await new MultiFormatExtractor().extract(docx))
    const fromText = parseSchedule(SAMPLE)
    expect(fromDocx.blocks.length).toBeGreaterThan(5)
    expect(fromDocx).toEqual(fromText)
  })
  it('maps unsupported and broken files to error codes', async () => {
    const x = new MultiFormatExtractor()
    await expect(x.extract(new TextEncoder().encode('plain text'))).rejects.toMatchObject({ code: 'unsupported_file' })
    await expect(x.extract(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]))).rejects.toMatchObject({ code: 'read_failed' })
    await expect(x.extract(new TextEncoder().encode('%PDF-1.4 broken'))).rejects.toBeInstanceOf(InputError)
  })
})
