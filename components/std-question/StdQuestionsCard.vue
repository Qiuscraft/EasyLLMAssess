<script setup lang="ts">

import {type StdQuestionVersion} from "~/server/types/mysql";

const props = defineProps(['questions']);
const selectedVersion = ref<Record<number, StdQuestionVersion>>({});

watch(props.questions, () => {
  selectedVersion.value = {};
  if (props.questions) {
    for (const question of props.questions) {
      if (question.versions && question.versions.length > 0) {
        let latestVersion = question.versions[0];
        for (const version of question.versions) {
          if (version.createdAt > latestVersion.createdAt) {
            latestVersion = version;
          }
        }
        selectedVersion.value[question.id] = latestVersion;
      }
    }
  }
}, { immediate: true });
</script>

<template>
  <UPageCard title="Standard Questions">
    <UPageCard
      v-for="sq in props.questions"
      :title="`Standard Question #${sq.id}-${selectedVersion[sq.id].version}: ${selectedVersion[sq.id].content}`"
      :description="`Standard Answer: ${selectedVersion[sq.id].answer.content}`"
    >
      <UTable
        :data="selectedVersion[sq.id].answer.scoringPoints"
        :columns="[
          {
            accessorKey: 'content',
            header: 'Scoring Point',
            cell: ({ row }) => row.getValue('content')
          },
          {
            accessorKey: 'score',
            header: 'Score',
            cell: ({ row }) => row.getValue('score')
          }
        ]"
      />
    </UPageCard>
  </UPageCard>
</template>

<style scoped>

</style>