// All tunables live here and can be overridden via env (NUXT_<PATH_IN_SNAKE_CASE>),
// e.g. NUXT_GOOGLE_CLIENT_ID=... or NUXT_ESTIMATION_AFTER_SHOW_DURATION_MIN=120
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/main.css'],

  runtimeConfig: {
    sessionTtlHours: 168,
    maxUploadBytes: 5 * 1024 * 1024,
    calendar: {
      timezone: 'Europe/Berlin',
      address: 'Theater Freiburg, Bertoldstraße 46, 79098 Freiburg'
    },
    estimation: {
      receptionDurationMin: 90,
      afterShowDurationMin: 90
    },
    // Optional. Without these the "Google Calendar" button falls back to the .ics import page.
    google: {
      clientId: '',
      clientSecret: '',
      redirectUri: '' // default: <current origin>/api/google/callback
    }
  },

  nitro: {
    // Swap `fs` for `redis` / `cloudflare-kv` etc. to scale out; no code changes needed.
    storage: { sessions: { driver: 'fs', base: './.data/sessions' } }
  }
})
