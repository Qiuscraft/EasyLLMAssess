<script setup lang="ts">

import SourceQuestionsDataCard from "~/components/source-question/SourceQuestionsDataCard.vue";
import ImportButton from "~/components/source-question/ImportButton.vue";

const sourceQuestionsDataCard = ref();

async function handleImport() {
  await sourceQuestionsDataCard.value?.fetchData();
}
</script>

<template>
  <ImportButton @import="handleImport" />
  <SourceQuestionsDataCard ref="sourceQuestionsDataCard" />
</template>

<style scoped>

</style>