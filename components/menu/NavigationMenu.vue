<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items = ref<NavigationMenuItem[]>([
  {
    label: 'Homepage',
    icon: 'i-lucide-house',
    to: '/',
  },
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
  {
    label: 'Datasets',
    icon: 'i-lucide-database',
    to: '/datasets',
  },
])
</script>

<template>
  <UNavigationMenu :items="items" class="w-full justify-center" />
</template>



<style scoped>

</style>