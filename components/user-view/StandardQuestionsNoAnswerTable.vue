<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui-pro'
import type { StdQuestion } from "~/server/types/mysql";
import { UButton } from "#components";
import SubmitButton from "~/components/user-view/SubmitButton.vue";
import Pagination from "~/components/common/Pagination.vue";
import { responseToStdQuestions } from "~/utils/std-question";
import FloatingLabeledInput from "~/components/common/FloatingLabeledInput.vue";

const USelect = resolveComponent('USelect')

const data = ref<StdQuestion[]>([]);
const loading = ref(true);
const total = ref(0);
const totalNoFilter = ref(0);

// 存储每行当前显示的版本索引
const currentVersionIndices = ref<Record<number, number>>({});

const sort_by = ref('desc')
const content = ref('')
const page_size = ref(5);
const page = ref(1);

async function fetchData() {
  loading.value = true;
  try {
    const response = await $fetch('/api/v1/std-question-no-answer', {
      method: 'GET',
      params: {
        page_size: page_size.value,
        sort_by: sort_by.value,
        content: content.value,
        page: page.value,
        only_show_no_answered: true
      }
    });

    data.value = responseToStdQuestions(response.std_questions);

    // 初始化每行当前显示的版本索引为0
    data.value.forEach(question => {
      if (!currentVersionIndices.value[question.id]) {
        currentVersionIndices.value[question.id] = 0;
      }
    });

    total.value = response.total || 0;
    totalNoFilter.value = response.total_no_filter || 0;
  } catch (error) {
    useToast().add({
      title: "Data Load Failed",
      description: error instanceof Error ? error.message : "Unknown error",
      color: 'error'
    });
  } finally {
    loading.value = false;
  }
}

// 根据问题ID和当前版本索引获取当前显示的版本
const getCurrentVersion = (questionId: number) => {
  const question = data.value.find(q => q.id === questionId);
  if (!question) return null;

  const versionIndex = currentVersionIndices.value[questionId] || 0;
  return question.versions[versionIndex];
};

// 获取指定问题的版本选项
const getVersionOptions = (questionId: number) => {
  const question = data.value.find(q => q.id === questionId);
  if (!question) return [];

  return question.versions.map((version, index) => ({
    label: `${version.version}`,
    value: index
  }));
};

// 更改当前显示的版本
const changeVersion = (questionId: number, versionIndex: number) => {
  currentVersionIndices.value[questionId] = versionIndex;
};

const columns: TableColumn<StdQuestion>[] = [
  {
    accessorKey: 'id',
    header: ( { column }: { column: any} ) => {
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'ID',
        icon: sort_by.value === 'desc' ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide',
        class: '-mx-2.5',
        onClick: async () => {
          sort_by.value = sort_by.value === 'desc' ? 'asc' : 'desc';
          await fetchData();
          column.toggleSorting(sort_by.value === 'desc')
        }
      })
    },
    cell: ({ row }: { row: any }) => row.getValue('id'),
  },
  {
    accessorKey: 'content',
    header: ({  }) => {
      return h(FloatingLabeledInput, {
        modelValue: content.value,
        'onUpdate:modelValue': (newValue: string) => {
          content.value = newValue;
        },
        label: "Question"
      })
    },
    cell: ({ row }: { row: any }) => {
      const questionId = row.original.id;
      const currentVersion = getCurrentVersion(questionId);
      return h('div', { innerHTML: currentVersion?.content || '' });
    },
  },
  {
    id: 'version',
    header: 'Version',
    cell: ({ row }: { row: any }) => {
      const questionId = row.original.id;
      const versionOptions = getVersionOptions(questionId);
      const currentVersionIndex = currentVersionIndices.value[questionId] || 0;

      return h(USelect, {
        modelValue: currentVersionIndex,
        items: versionOptions,
        size: 'sm',
        class: 'w-24',
        'onUpdate:modelValue': (newValue: number) => {
          changeVersion(questionId, newValue);
        }
      });
    }
  },
  {
    id: 'view',
    header: 'Actions',
    cell: ({ row }: { row: any }) => {
      const questionId = row.original.id;
      const currentVersion = getCurrentVersion(questionId);
      return h(SubmitButton, {
        question: currentVersion ? { ...row.original, currentVersion } : row.original,
      });
    },
  }
]

watch([content, page_size], async () => {
  if (page.value !== 1) {
    page.value = 1; // 重置页码
  } else {
    await fetchData();
  }
}, { deep: true });

const columnPinning = ref({
  left: [],
  right: ['view']
})

watch(page, async () => {
  await fetchData();
}, { immediate: true });

const table = useTemplateRef('table')

onMounted(async () => {
  await fetchData();
  // 确保表格初始状态为降序排序
  if (table?.value?.tableApi) {
    table.value.tableApi.getColumn('id')?.toggleSorting(true);
  }
});
</script>

<template>
  <div class="flex-1 w-full">
    <UTable
        sticky
        ref="table"
        :data="data"
        :columns="columns"
        :loading="loading"
        v-model:column-pinning="columnPinning"
    />
    <Pagination
        v-model:page="page"
        v-model:page_size="page_size"
        :total="total"
    />
  </div>
</template>

<style scoped>
</style>
