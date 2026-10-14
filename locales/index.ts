import de from './de'
import en from './en'

/** Add a language: create locales/xx.ts (typed like en.ts) and list it here. */
export const messages = { de, en } as const
export const LOCALES = ['de', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export type MessageKey = keyof typeof de
export const DEFAULT_LOCALE: Locale = 'de'

export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale)
export const hasKey = (k: string): k is MessageKey => k in de

export function translate(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  const text = (messages[locale] as Record<string, string>)[key] ?? de[key]
  return params ? text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : text
}
