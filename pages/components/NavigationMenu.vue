<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items = ref<NavigationMenuItem[]>([
  {
    label: 'Source Questions',
    icon: 'i-lucide-message-circle-question',
    to: '/source-questions',
  },
  {
    label: 'Standard Questions',
    icon: 'i-lucide-mail-question',
    to: '/standard-questions',
  },
])
</script>

<template>
  <UNavigationMenu :items="items" class="w-full justify-center" />
</template>



<style scoped>

</style>