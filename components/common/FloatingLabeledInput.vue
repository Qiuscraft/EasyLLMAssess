<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  label: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputValue = ref(props.modelValue)

watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue
})

watch(inputValue, (newValue) => {
  emit('update:modelValue', newValue)
})
</script>

<template>
  <div class="relative">
    <UInput
        v-model="inputValue"
        :placeholder="placeholder || ''"
        :ui="{ base: 'peer' }"
    >
      <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
        <span class="inline-flex bg-default px-1">{{ label }}</span>
      </label>
    </UInput>
  </div>
</template>