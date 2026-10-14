import { DEFAULT_LOCALE, hasKey, translate, type Locale, type MessageKey } from '~~/locales'

/** Language state (cookie-backed, German by default) + translation helpers. */
export function useLocale() {
  const locale = useCookie<Locale>('shiftsync-locale', { default: () => DEFAULT_LOCALE, maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  const t = (key: MessageKey, params?: Record<string, string | number>) => translate(locale.value, key, params)
  /** Singular/plural pair: `key.one` / `key.other`. */
  const tn = (key: string, n: number, params: Record<string, string | number> = {}) =>
    translate(locale.value, `${key}.${n === 1 ? 'one' : 'other'}` as MessageKey, { count: n, ...params })
  /** API error code -> translated message (unknown codes fall back to the generic one). */
  const tError = (code: string | null) => t(code && hasKey(`err.${code}`) ? (`err.${code}` as MessageKey) : 'err.generic')

  useHead({ htmlAttrs: { lang: locale } })
  return { locale, t, tn, tError }
}
