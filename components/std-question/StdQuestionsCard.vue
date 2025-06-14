<script setup lang="ts">
import {type StdQuestion, type StdQuestionVersion} from "~/server/types/mysql";

const props = defineProps(['questions']);
const versionSortedQuestions = computed(() => {
  return sortStdQuestionVersionsByCreationTime(props.questions);
})
const selectedVersionString = ref<Record<number, string>>({});

const versionOptions = computed(() => {
  const options: Record<number, string[]> = {};
  if (versionSortedQuestions.value) {
    for (const question of versionSortedQuestions.value) {
      options[question.id] = question.versions.map(v => `${v.version}`);
    }
  }
  return options;
});

const selectedVersion = computed<Record<number, StdQuestionVersion>>(() => {
  const versions: Record<number, StdQuestionVersion> = {};
  if (versionSortedQuestions.value) {
    for (const question of versionSortedQuestions.value) {
      const versionString = selectedVersionString.value[question.id];
      versions[question.id] = getVersionByString(question, versionString) || question.versions[0];
    }
  }
  return versions;
});

watch(props.questions, () => {
  selectedVersionString.value = {};
  if (props.questions) {
    for (const question of versionSortedQuestions.value) {
      selectedVersionString.value[question.id] = question.versions[0].version;
    }
  }
}, { immediate: true });

function sortStdQuestionVersionsByCreationTime(questions: StdQuestion[]): StdQuestion[] {
  if (!questions) {
    return [];
  }
  return questions.map(question => {
    const sortedVersions = [...question.versions].sort((a, b) => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    return { ...question, versions: sortedVersions };
  });
}

function getVersionByString(question: StdQuestion, versionString: string): StdQuestionVersion | undefined {
  return question.versions.find(v => v.version === versionString);
}
</script>

<template>
  <UPageCard title="Standard Questions">
    <UPageCard
      v-for="sq in props.questions"
      :description="`Standard Answer: ${selectedVersion[sq.id].answer.content}`"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <span>Standard Question #{{sq.id}}-</span>
          <USelect
              v-model="selectedVersionString[sq.id]"
              :items="versionOptions[sq.id]"
              class="w-48"
          />
          <span>: {{selectedVersion[sq.id].content}}</span>
        </div>
      </template>
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