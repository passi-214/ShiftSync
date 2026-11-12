<script setup lang="ts">
import type { NameStat } from '~~/server/domain/types'

/** Accessible autocomplete (WAI-ARIA combobox). The server ranks suggestions; this only displays them. */
const props = defineProps<{
  modelValue: string
  fetchSuggestions: (q: string) => Promise<NameStat[]>
  label: string
  placeholder: string
  listLabel: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const uid = useId()
const items = ref<NameStat[]>([])
const open = ref(false)
const active = ref(-1)
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

async function refresh(q: string) {
  const mine = ++seq
  const found = await props.fetchSuggestions(q)
  if (mine !== seq) return // a newer keystroke superseded this request
  items.value = found.filter((n) => n.name !== q.trim())
  active.value = -1
  open.value = items.value.length > 0
}

function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  emit('update:modelValue', v)
  clearTimeout(timer)
  timer = setTimeout(() => refresh(v), 120)
}

function choose(n: NameStat) {
  emit('update:modelValue', n.name)
  open.value = false
  seq++ // drop in-flight requests
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!open.value) return void refresh(props.modelValue)
    e.preventDefault()
    const n = items.value.length
    active.value = (active.value + (e.key === 'ArrowDown' ? 1 : -1) + n) % n
  } else if (e.key === 'Enter' && open.value && active.value >= 0) {
    e.preventDefault() // select instead of submitting the form
    choose(items.value[active.value])
  } else if (e.key === 'Escape' && open.value) {
    e.preventDefault()
    open.value = false
  }
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="combo">
    <label :for="`${uid}-in`" class="combo-label">{{ label }}</label>
    <input
      :id="`${uid}-in`" :value="modelValue" type="text" autocomplete="off" required
      role="combobox" aria-autocomplete="list" :aria-expanded="open" :aria-controls="`${uid}-list`"
      :aria-activedescendant="active >= 0 ? `${uid}-opt-${active}` : undefined" :placeholder="placeholder"
      @input="onInput" @keydown="onKey" @focus="refresh(modelValue)" @blur="open = false"
    >
    <ul v-show="open" :id="`${uid}-list`" role="listbox" :aria-label="listLabel" class="combo-list">
      <li
        v-for="(n, i) in items" :id="`${uid}-opt-${i}`" :key="n.name" role="option"
        :aria-selected="i === active" :class="{ active: i === active }"
        @mousedown.prevent="choose(n)"
      >{{ n.name }}</li>
    </ul>
  </div>
</template>
