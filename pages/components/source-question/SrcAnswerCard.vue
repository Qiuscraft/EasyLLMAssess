<script setup lang="ts">
const props = defineProps(['answers'])
</script>

<template>
  <UPageCard title="Source Answers">
    <UPageCard
        v-for="answer in props.answers"
        :title="`Answer #${answer.id}`"
        :key="answer.id"
    >
      <div v-html="answer.content"></div>
    </UPageCard>
  </UPageCard>
</template>

<style scoped>

</style>