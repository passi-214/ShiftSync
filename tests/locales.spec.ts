import { describe, expect, it } from 'vitest'
import { LOCALES, messages, translate } from '../locales'

describe('locales', () => {
  it('have identical keys and no empty strings', () => {
    const keys = Object.keys(messages.de).sort()
    for (const l of LOCALES) {
      expect(Object.keys(messages[l]).sort()).toEqual(keys)
      expect(Object.values(messages[l]).every((v) => v.length > 0)).toBe(true)
    }
  })
  it('interpolates params', () => {
    expect(translate('en', 'result.title.other', { count: 3, person: 'A B' })).toBe('3 shifts for A B')
    expect(translate('de', 'result.title.one', { count: 1, person: 'A B' })).toBe('1 Dienst für A B')
  })
})
