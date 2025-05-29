<script setup lang="ts">
const links = ref([
  {
    label: 'Get started',
    color: 'neutral',
    to: '/source-questions',
  },
])
</script>

<template>
  <UPageCTA
      title="Welcome to EasyLLMAssess."
      description="Start to eval your llms' performance right now!"
      variant="soft"
      :links="links"
  />
</template>
