<script setup lang="ts">
import type { Assessment } from "~/server/types/mysql";
import type { TableColumn } from '@nuxt/ui-pro'
import Pagination from "~/components/common/Pagination.vue";
import {UButton} from "#components";
import AssessmentModal from "~/components/assessments/AssessmentModal.vue";

const data = ref<Assessment[]>([]);
const loading = ref(true);

// 控制 Modal 的显示状态
const isModalOpen = ref(false);
// 选中的 assessment 数据
const selectedAssessment = ref<Assessment | null>(null);

const sorting = ref([
  {
    id: 'id',
    desc: true
  }
])

// 打开 Modal 并设置选中的 assessment
function openAssessmentModal(assessment: Assessment) {
  console.log("Opening modal with assessment:", assessment);
  selectedAssessment.value = assessment;
  isModalOpen.value = true;
}

watch(sorting, async () => {
  await fetchData();
}, { deep: true });

const columns: TableColumn<Assessment>[] = [
  {
    accessorKey: 'id',
    header: ({ column }: { column: any }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Assessment ID',
        icon: isSorted
            ? isSorted === 'asc'
                ? 'i-lucide-arrow-up-narrow-wide'
                : 'i-lucide-arrow-down-wide-narrow'
            : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }: { row: any }) => row.getValue('id'),
  },
  {
    accessorKey: 'datasetName',
    header: 'Dataset Name',
    cell: ({ row }: { row: any }) => row.getValue('datasetName'),
  },
  {
    accessorKey: 'datasetVersion',
    header: 'Dataset Version',
    cell: ({ row }: { row: any }) => {
      const assessment = row.original;
      return assessment.datasetVersion?.version || 'N/A';
    },
  },
  {
    accessorKey: 'model',
    header: 'Model Name',
    cell: ({ row }: { row: any }) => row.getValue('model'),
  },
  {
    accessorKey: 'score',
    header: 'Score',
    cell: ({ row }: { row: any }) => {
      const assessment = row.original;

      // 计算正确的总分，而不是使用后端传回的可能有误的 totalScore
      let calculatedTotalScore = 0;
      // 计算最大分数
      let maxScore = 0;

      if (assessment.modelAnswers && assessment.modelAnswers.length > 0) {
        assessment.modelAnswers.forEach(answer => {
          // 计算单个 ModelAnswer 的总分
          let modelAnswerScore = 0;

          if (answer.scoreProcesses && answer.scoreProcesses.length > 0) {
            answer.scoreProcesses.forEach(process => {
              // 累加每个评分过程的得分
              modelAnswerScore += Number(process.score) || 0;
              // 累加最大可能得分
              maxScore += Number(process.scoringPointMaxScore) || 0;
            });
          }

          // 更新 ModelAnswer 的 totalScore
          answer.totalScore = modelAnswerScore;
          // 累加到总评分
          calculatedTotalScore += modelAnswerScore;
        });
      }

      // 更新 assessment 的总分为计算出的正确值
      assessment.totalScore = calculatedTotalScore;

      // 格式化为两位小数
      const formattedTotal = Number(calculatedTotalScore).toFixed(2);
      const formattedMax = Number(maxScore).toFixed(2);

      return `${formattedTotal}/${formattedMax}`;
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }: { row: any }) => {
      return h('div', { class: 'flex gap-2' }, [
        h(UButton, {
          label: 'View',
          color: "neutral",
          variant: "outline",
          size: 'sm',
          icon: 'i-lucide-eye',
          onClick: () => openAssessmentModal(row.original)
        })
      ]);
    }
  }
]

const total = ref(0);
const page = ref(1);
const page_size = ref(5);

watch([page, page_size], async () => {
  await fetchData();
});

async function fetchData() {
  data.value = [];
  total.value = 0;
  loading.value = true;
  try {
    const response = await $fetch('/api/v1/assessment', {
      method: 'GET',
      query: {
        sort_order: sorting.value[0].desc ? 'desc' : 'asc',
        page: page.value,
        page_size: page_size.value,
      }
    });

    data.value = response;
    total.value = response.length; // 如果API没有返回总数，这里使用当前返回的数据长度
  } catch (error) {
    useToast().add({
      title: "Data Load Error",
      description: error instanceof Error ? error.message : "Unknown error",
      color: 'error'
    });
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await fetchData();
});

const columnPinning = ref({
  left: [],
  right: ['actions']
})

defineExpose({
  fetchData
});
</script>

<template>
  <UTable
    sticky
    :loading="loading"
    :data="data"
    :columns="columns"
    v-model:column-pinning="columnPinning"
    class="flex-1"
    v-model:sorting="sorting"
  />
  <Pagination
      v-model:page="page"
      v-model:page_size="page_size"
      :total="total"
  />

  <!-- 修正 prop 名称的绑定 -->
  <AssessmentModal
    v-model:isOpen="isModalOpen"
    :assessment="selectedAssessment"
  />
</template>

<style scoped>
</style>