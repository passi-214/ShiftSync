<script setup lang="ts">
const { locale, t, tn, tError } = useLocale()
const {
  name, typoCheck, file, roster, uploading, loading, errorCode, result, include,
  chooseFile, submit, toggleSpelling, suggest, loadExport
} = useShifts()
const route = useRoute()

useHead({ title: computed(() => t('app.title')) })

// Coming back from the Google redirect: restore the result and show what happened.
onMounted(() => { if (typeof route.query.export === 'string' && route.query.export) loadExport(route.query.export) })

const banner = computed(() => {
  const q = route.query
  if (q.google === 'done') {
    const failed = Number(q.failed ?? 0)
    return { ok: !failed, text: t('banner.googleDone', { added: Number(q.added ?? 0), updated: Number(q.updated ?? 0) }) + (failed ? ' ' + t('banner.googleFailed', { failed }) : '') }
  }
  if (q.google === 'cancelled') return { ok: false, text: t('banner.googleCancelled') }
  if (q.google === 'error') return { ok: false, text: t('banner.googleError') }
  return null
})

const ACCEPT = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const dragging = ref(false)
const onDrop = (e: DragEvent) => { dragging.value = false; chooseFile(e.dataTransfer?.files?.[0] ?? file.value) }
const onPick = (e: Event) => chooseFile((e.target as HTMLInputElement).files?.[0] ?? null)

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat(locale.value, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00`))

const icsUrl = (inline = false) => `${result.value!.links.ics}?lang=${locale.value}${inline ? '&inline=1' : ''}`
const googleUrl = computed(() => result.value?.links.googleAdd ? `${result.value.links.googleAdd}&lang=${locale.value}` : null)

/** No OAuth configured: hand over the file and open Google's import page. */
function googleFallback() {
  const a = document.createElement('a')
  a.href = icsUrl(); a.download = ''; a.click()
  window.open('https://calendar.google.com/calendar/u/0/r/settings/export', '_blank', 'noopener')
}

const rosterStatus = computed(() => uploading.value ? t('form.rosterReading') : roster.value ? t('form.rosterReady', { count: roster.value.names }) : null)
const didYouMean = (n: string) => { name.value = n; submit() }
</script>

<template>
  <main class="page">
    <LanguageSwitch />

    <header class="masthead">
      <h1>{{ t('app.title') }}</h1>
      <p>{{ t('app.subtitle') }}</p>
    </header>

    <form class="card" @submit.prevent="submit">
      <label
        class="drop" :class="{ over: dragging, filled: file }"
        @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop"
      >
        <input type="file" :accept="ACCEPT" @change="onPick">
        <span class="drop-main">{{ file ? file.name : t('form.drop') }}</span>
        <span class="drop-sub">{{ file ? t('form.dropChange') : t('form.dropSub') }}</span>
      </label>

      <p v-if="rosterStatus" class="status" role="status">{{ rosterStatus }}</p>

      <NameCombobox
        v-model="name" :fetch-suggestions="suggest" :label="t('form.nameLabel')"
        :placeholder="t('form.namePlaceholder')" :list-label="t('form.suggestions')"
      />

      <label class="check">
        <input v-model="typoCheck" type="checkbox">
        <span><strong>{{ t('form.typoCheck') }}</strong><small>{{ t('form.typoCheckHint') }}</small></span>
      </label>

      <button class="primary" :disabled="loading || uploading || !roster || name.length < 3">
        {{ loading ? t('form.loading') : t('form.submit') }}
      </button>
      <p v-if="errorCode" class="error" role="alert">{{ tError(errorCode) }}</p>
    </form>

    <details v-if="typoCheck && roster" class="typos">
      <summary>{{ t('typo.title', { count: roster.typoSuspects.length }) }}</summary>
      <template v-if="roster.typoSuspects.length">
        <p>{{ t('typo.hint') }}</p>
        <ul>
          <li v-for="s in roster.typoSuspects" :key="s.name">
            {{ t('typo.item', { name: s.name, count: s.occurrences, means: s.probablyMeans, meansCount: s.probablyMeansOccurrences }) }}
          </li>
        </ul>
      </template>
      <p v-else>{{ t('typo.none') }}</p>
    </details>

    <p v-if="banner" class="banner" :class="{ bad: !banner.ok }" role="status">{{ banner.text }}</p>

    <section v-if="result" class="result" aria-live="polite">
      <div class="result-head">
        <h2>{{ tn('result.title', result.shifts.length, { person: result.person }) }}</h2>
        <p v-if="result.period">{{ fmtDay(result.period.from) }} – {{ fmtDay(result.period.to) }}</p>
      </div>

      <div v-if="!result.shifts.length" class="empty">
        <p>{{ t('result.none') }}</p>
        <template v-if="result.similar.length">
          <p>{{ t('result.didYouMean') }}</p>
          <div class="names">
            <button v-for="n in result.similar" :key="n.name" type="button" @click="didYouMean(n.name)">{{ n.name }}</button>
          </div>
        </template>
      </div>

      <template v-else>
        <fieldset v-if="result.similar.length" class="similar">
          <legend>{{ t('similar.title') }}</legend>
          <p>{{ t('similar.hint') }}</p>
          <label v-for="n in result.similar" :key="n.name" class="check">
            <input type="checkbox" :checked="include.includes(n.name)" :disabled="loading || !roster" @change="toggleSpelling(n.name)">
            <span>{{ t('similar.item', { name: n.name, count: n.occurrences }) }}</span>
          </label>
        </fieldset>

        <ol class="shifts">
          <li v-for="s in result.shifts" :key="s.id" class="shift">
            <div class="call">
              <span class="start" :class="{ est: s.startIsEstimate }">{{ s.startIsEstimate ? '~' : '' }}{{ s.start }}</span>
              <span class="end">{{ t('result.until') }} {{ s.endIsEstimate ? '~' : '' }}{{ s.end }}</span>
            </div>
            <div class="info">
              <strong>{{ fmtDay(s.date) }}</strong>
              <span>{{ s.venueLabel }} · {{ t(`role.${s.role}`) }}</span>
              <span v-if="s.listedAs" class="listed">{{ t('shift.listedAsShort', { name: s.listedAs }) }}</span>
              <span v-if="s.tags.length || s.notes.length" class="notes">
                {{ [...s.tags.map((x) => t(`tag.${x}`)), ...s.notes].join(' · ') }}
              </span>
            </div>
          </li>
        </ol>
        <p class="legend">{{ t('result.legend') }}</p>

        <div class="actions">
          <div class="btns">
            <a class="primary" :href="icsUrl(true)">{{ t('action.apple') }}</a>
            <a v-if="googleUrl" class="primary" :href="googleUrl">{{ t('action.google') }}</a>
            <button v-else type="button" class="primary" @click="googleFallback">{{ t('action.google') }}</button>
            <a class="secondary" :href="icsUrl()" download>{{ t('action.download') }}</a>
          </div>
          <p v-if="!googleUrl" class="hint">{{ t('action.googleFallback') }}</p>

          <details>
            <summary>{{ t('help.title') }}</summary>
            <ul>
              <li>{{ t('help.apple') }}</li>
              <li>{{ t('help.outlook') }}</li>
              <li>{{ t('help.other') }}</li>
            </ul>
            <p>{{ t('help.update') }}</p>
          </details>
        </div>
      </template>
    </section>
  </main>
</template>
