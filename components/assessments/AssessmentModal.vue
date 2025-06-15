<script setup lang="ts">
import type { Assessment, ModelAnswer, ScoreProcess, StdQuestionVersion } from "~/server/types/mysql";
import type { TableColumn } from '@nuxt/ui-pro';
import {UButton} from "#components";

const props = defineProps<{
  assessment: Assessment | null;
  isOpen: boolean;
}>();

const emit = defineEmits(['update:isOpen']);

// Create a computed property to handle the open state for UModal v-model:open
const open = computed({
  get: () => props.isOpen,
  set: (value) => emit('update:isOpen', value)
});

// 处理modelAnswers与问题版本的关联
const processedModelAnswers = computed(() => {
  if (!props.assessment?.modelAnswers || !props.assessment?.datasetVersion?.stdQuestionVersions) {
    return [];
  }

  // 创建stdQuestionVersionId到stdQuestionVersion的映射
  const questionVersionMap = new Map<number, StdQuestionVersion>();
  props.assessment.datasetVersion.stdQuestionVersions.forEach(qv => {
    questionVersionMap.set(qv.id, qv);
  });

  // 为每个modelAnswer关联对应的questionVersion
  return props.assessment.modelAnswers.map(answer => {
    const questionVersion = questionVersionMap.get(answer.stdQuestionVersionId);

    // 计算每个问题的最大总分
    let maxPossibleScore = 0;
    if (answer.scoreProcesses && answer.scoreProcesses.length > 0) {
      maxPossibleScore = answer.scoreProcesses.reduce((sum, process) =>
        sum + (Number(process.scoringPointMaxScore) || 0), 0);
    }

    return {
      ...answer,
      questionVersion: questionVersion || answer.questionVersion,
      maxPossibleScore // 添加最大可能分数字段
    };
  });
});

const modelAnswersColumns: TableColumn<ModelAnswer>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }: { row: any }) => row.getValue('id'),
  },
  {
    accessorKey: 'content',
    header: 'Response Content',
    cell: ({ row }: { row: any }) => {
      const content = row.getValue('content');
      return content.length > 100 ? content.slice(0, 100) + '...' : content;
    },
  },
  {
    accessorKey: 'questionVersion',
    header: 'Question',
    cell: ({ row }: { row: any }) => {
      const modelAnswer = row.original;
      return modelAnswer.questionVersion?.content || 'N/A';
    }
  },
  {
    accessorKey: 'totalScore',
    header: 'Score',
    cell: ({ row }: { row: any }) => {
      const modelAnswer = row.original;
      const score = modelAnswer.totalScore?.toFixed(2) || '0';
      const maxScore = modelAnswer.maxPossibleScore?.toFixed(2) || '0';
      return `${score}/${maxScore}`;
    }
  },
  {
    id: 'details',
    header: 'Details',
    cell: ({ row }: { row: any }) => {
      return h('div', { class: 'flex gap-2' }, [
        h(UButton, {
          color: 'primary',
          variant: 'ghost',
          size: 'xs',
          icon: 'i-lucide-eye',
          onClick: () => showScoreProcesses(row.original)
        })
      ]);
    }
  }
];

const selectedAnswer = ref<ModelAnswer | null>(null);
const showScoreDetails = ref(false);

const scoreProcessColumns: TableColumn<ScoreProcess>[] = [
  {
    accessorKey: 'scoringPointContent',
    header: 'Scoring Point',
    cell: ({ row }: { row: any }) => row.getValue('scoringPointContent'),
  },
  {
    accessorKey: 'scoringPointMaxScore',
    header: 'Max Score',
    cell: ({ row }: { row: any }) => row.getValue('scoringPointMaxScore'),
  },
  {
    accessorKey: 'score',
    header: 'Score',
    cell: ({ row }: { row: any }) => row.getValue('score'),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }: { row: any }) => row.getValue('type'),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }: { row: any }) => row.getValue('description'),
  }
];

function showScoreProcesses(modelAnswer: ModelAnswer) {
  selectedAnswer.value = modelAnswer;
  showScoreDetails.value = true;
}

function closeScoreDetails() {
  showScoreDetails.value = false;
}

function formatDate(date: Date | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US');
}

// Calculate total and maximum scores
const scoreInfo = computed(() => {
  if (!props.assessment) return { total: 0, max: 0 };

  let calculatedTotalScore = 0;
  let maxScore = 0;

  if (props.assessment.modelAnswers && props.assessment.modelAnswers.length > 0) {
    props.assessment.modelAnswers.forEach(answer => {
      if (answer.scoreProcesses && answer.scoreProcesses.length > 0) {
        answer.scoreProcesses.forEach(process => {
          calculatedTotalScore += Number(process.score) || 0;
          maxScore += Number(process.scoringPointMaxScore) || 0;
        });
      }
    });
  }

  return {
    total: calculatedTotalScore.toFixed(2),
    max: maxScore.toFixed(2)
  };
});
</script>

<template>
  <UModal
    v-model:open="open"
    fullscreen
    :title="`Assessment Details: ${assessment?.model || ''}`"
    :description="`Dataset: ${assessment?.datasetName || ''} ${assessment?.datasetVersion?.version || ''}`"
  >
    <template #default>
      <UButton label="View Details" color="primary" variant="soft" />
    </template>

    <template #body>
      <div class="flex flex-col gap-6">
        <!-- Assessment Overview -->
        <UPageCard
          title="Assessment Overview"
          :description="`Model: ${assessment?.model || 'N/A'} | Total Score: ${scoreInfo.total}/${scoreInfo.max}`"
          icon="i-lucide-clipboard-check"
          variant="soft"
          class="mb-4"
        >
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p class="text-sm text-muted">Dataset Name:</p>
              <p class="font-medium">{{ assessment?.datasetName || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm text-muted">Dataset Version:</p>
              <p class="font-medium">{{ assessment?.datasetVersion?.version || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm text-muted">Question Count:</p>
              <p class="font-medium">{{ assessment?.modelAnswers?.length || 0 }}</p>
            </div>
            <div>
              <p class="text-sm text-muted">Assessment ID:</p>
              <p class="font-medium">{{ assessment?.id || 'N/A' }}</p>
            </div>
          </div>
        </UPageCard>

        <!-- Model Responses -->
        <UPageCard
          title="Model Responses"
          description="All responses and scores from this model for the dataset questions"
          icon="i-lucide-message-square"
          variant="soft"
        >
          <UTable
            :columns="modelAnswersColumns"
            :data="processedModelAnswers"
            :loading="!assessment"
            class="mt-4"
          />
        </UPageCard>
      </div>

      <!-- Score Details Modal -->
      <UModal
        v-model:open="showScoreDetails"
        :title="`Score Details: ${selectedAnswer?.id || ''}`"
        size="3xl"
        :ui="{ content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-4rem)] max-w-4xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)] rounded-lg shadow-lg ring ring-default' }"
      >
        <template #body>
          <div class="mb-4">
            <h3 class="font-medium text-base mb-2">Question:</h3>
            <p class="text-sm text-muted mb-4">{{ selectedAnswer?.questionVersion?.content || 'N/A' }}</p>

            <h3 class="font-medium text-base mb-2">Model Response:</h3>
            <p class="text-sm text-muted mb-4 whitespace-pre-wrap">{{ selectedAnswer?.content || 'N/A' }}</p>

            <h3 class="font-medium text-base mb-2">Standard Answer:</h3>
            <p class="text-sm text-muted mb-4 whitespace-pre-wrap">{{ selectedAnswer?.questionVersion?.answer?.content || 'N/A' }}</p>

            <h3 class="font-medium text-base mb-2">Score Details:</h3>
            <UTable
              :columns="scoreProcessColumns"
              :data="selectedAnswer?.scoreProcesses || []"
              class="mt-2"
            />
          </div>
        </template>

        <template #footer>
          <UButton label="Close" color="neutral" variant="outline" @click="closeScoreDetails" />
        </template>
      </UModal>
    </template>

    <template #footer>
      <UButton label="Close" color="neutral" variant="outline" @click="open = false" />
    </template>
  </UModal>
</template>

<style scoped>
.whitespace-pre-wrap {
  white-space: pre-wrap;
}
</style>