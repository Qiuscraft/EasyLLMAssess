<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui-pro'
import type {StdQuestion, StdQuestionVersion} from "~/server/types/mysql";
import { UButton } from "#components";
import CreateDatasetButton from "~/components/std-question/CreateDatasetButton.vue";
import Pagination from "~/components/common/Pagination.vue";
import {responseToStdQuestions, sortStdQuestionVersionsByCreationTime} from "~/utils/std-question";
import FloatingLabeledInput from "~/components/common/FloatingLabeledInput.vue";

const UCheckbox = resolveComponent('UCheckbox')

const data = ref<StdQuestion[]>([]);
const loading = ref(true);
const total = ref(0);
const totalNoFilter = ref(0);

const sort_by = ref('desc')
const content = ref('')
const answer = ref('')
const page_size = ref(5)
const page = ref(1)
const onlyShowQuestionWithAnswer = ref(true);

const params = computed(() => {
  return {
    page: page.value,
    page_size: page_size.value,
    sort_by: sort_by.value,
    content: content.value,
    answer: answer.value,
    only_show_answered: onlyShowQuestionWithAnswer.value,
  };
});

async function fetchData() {
  loading.value = true;
  try {
    const response = await $fetch('/api/v1/std-question', {
      method: 'GET',
      params: params.value,
    });

    data.value = responseToStdQuestions(response.std_questions);
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

onMounted(async () => {
  await fetchData();
  // 确保表格初始状态为降序排序
  if (table?.value?.tableApi) {
    table.value.tableApi.getColumn('id')?.toggleSorting(true);
  }
});

const columns: TableColumn<StdQuestion>[] = [
  {
    id: 'select',
    header: ({ table }: { table: any }) =>
        h(UCheckbox, {
          modelValue: table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : table.getIsAllPageRowsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
              table.toggleAllPageRowsSelected(!!value),
          'aria-label': 'Select all'
        }),
    cell: ({ row }: { row: any }) =>
        h(UCheckbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          'aria-label': 'Select row'
        })
  },
  {
    accessorKey: 'id',
    header: ( { column } : { column: any } ) => {
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
    cell: ({ row }: { row: any }) => h('div', { innerHTML: row.original.versions[0].content }),
  },
  {
    accessorKey: 'answer',
    header: ({  }) => {
      return h(FloatingLabeledInput, {
        modelValue: answer.value,
        'onUpdate:modelValue': (newValue: string) => {
          answer.value = newValue;
        },
        label: "Answer"
      })
    },
    cell: ({ row }: { row: any }) => h('div', { innerHTML: row.original.versions[0].answer.content }),
  },
  {
    id: 'view',
    header: 'Actions',
    cell: ({ row }: { row: any }) => h(UButton, {
      label: 'View',
      color: 'neutral',
      variant: 'subtle',
      onClick: () => viewingRow.value = row.original
    })
  },
]

watch([page, page_size], async () => {
  await fetchData();
}, { deep: true });

watch([content, answer, onlyShowQuestionWithAnswer], async () => {
  if (page.value === 1) {
    await fetchData();
  } else {
    page.value = 1; // Reset to first page when filters change
  }
});

const table = useTemplateRef('table')

const viewingRow = ref<StdQuestion | null>(null)
const viewingRowSorted = computed(() => {
  if (!viewingRow.value) return null;
  return sortStdQuestionVersionsByCreationTime(viewingRow.value);
})
const rowSelection = ref<Record<number, boolean>>({ })

const columnPinning = ref({
  left: [],
  right: ['view']
})

const selected_id_list = computed(() => {
  return Object.keys(rowSelection.value)
    .filter(id => rowSelection.value[Number(id)])
    .map(Number);
})

const handleSubmit = () => {
  rowSelection.value = {};
}

const viewingVersion = ref<StdQuestionVersion | null>(null);
watch(viewingRow, () => {
  if (viewingRowSorted.value) {
    viewingVersion.value = viewingRowSorted.value.versions[0];
  } else {
    viewingVersion.value = null;
  }
});
</script>

<template>
  <UCheckbox v-model="onlyShowQuestionWithAnswer" color="primary" label="Only show the questions that have standard answer" />
  <div class="flex-1 w-full">
    <CreateDatasetButton :id_list="selected_id_list" @submit="handleSubmit" />

    <UTable
        sticky
        ref="table"
        v-model:row-selection="rowSelection"
        :data="data"
        :columns="columns"
        :loading="loading"
        v-model:column-pinning="columnPinning"
        :get-row-id="row => String(row.id)"
    />

    <Pagination
        v-model:page="page"
        v-model:page_size="page_size"
        :total="total"
    />

    <UModal
        v-if="viewingRow && viewingVersion"
        v-model:open="viewingVersion"
        fullscreen
        :title="`Standard Question #${viewingRow.id}-${viewingVersion.version}`"
    >
      <template #body>
        <UPageCard class="p-4 space-y-4">
          <UPageCard
              :title="`Standard Question: ${viewingVersion.content}`"
              :description="`Standard Answer: ${viewingVersion.answer?.content}` || 'No standard answer available.'"
          >
            <UTable
                v-if="viewingVersion.answer"
                :data="viewingVersion.answer.scoringPoints"
                :columns="[
                { accessorKey: 'content', header: 'Point' },
                { accessorKey: 'score', header: 'Score' }
              ]"
            />
          </UPageCard>
        </UPageCard>
      </template>
    </UModal>

    <div class="px-4 py-3.5 border-t border-accented text-sm text-muted">
      {{ selected_id_list.length || 0 }} / {{ totalNoFilter }} row(s) selected.
    </div>
  </div>
</template>

<style scoped>
</style>
