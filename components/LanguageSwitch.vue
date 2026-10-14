<script setup lang="ts">
import { LOCALES } from '~~/locales'
const { locale, t } = useLocale()
</script>

<template>
  <div class="lang" role="group" :aria-label="t('lang.label')">
    <button
      v-for="l in LOCALES" :key="l" type="button" :aria-pressed="locale === l"
      :class="{ active: locale === l }" @click="locale = l"
    >{{ l.toUpperCase() }}</button>
  </div>
</template>
