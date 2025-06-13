<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui-pro'
import type { CandidateAnswer, StdQuestion } from "~/server/types/mysql";
import FloatingLabeledInput from "~/components/common/FloatingLabeledInput.vue";
import SortButton from "~/components/common/SortButton.vue";
import Pagination from "~/components/common/Pagination.vue";

const loading = ref(true);

const search_std_question = ref('');
const search_author = ref('');
const search_content = ref('');

const sort_by = ref('desc');
const sort_field = ref('id');

const page = ref(1);
const page_size = ref(5);

const data = ref<CandidateAnswer[]>([]);
const total = ref(0);

const query = computed(() => {
  return {
    std_question: search_std_question.value,
    author: search_author.value,
    content: search_content.value,
    sort_by: sort_by.value,
    sort_field: sort_field.value,
    page: page.value,
    page_size: page_size.value,
  }
})

const sortButtonRefs = ref<Record<string, any>>({});

async function fetchData() {
  loading.value = true;
  try {
    const response = await $fetch('/api/v1/candidate-answer', {
      method: 'GET',
      params: query.value,
    });

    data.value = response.candidate_answers;
    total.value = response.total || 0;
  } catch (error) {
    useToast().add({
      title: "Data Load Failed",
      description: error.statusMessage,
      color: 'error'
    });
  } finally {
    loading.value = false;
  }
}

async function handleSortChange(field: string, direction: 'asc' | 'desc') {
  sort_field.value = field;
  sort_by.value = direction;

  // 重置其他排序按钮的状态
  Object.entries(sortButtonRefs.value).forEach(([key, ref]) => {
    if (key !== field && ref?.resetSort) {
      ref.resetSort();
    }
  });
}

const columns: TableColumn<StdQuestion>[] = [
  {
    accessorKey: 'id',
    header: ( { column } ) => {
      return h(SortButton, {
        label: 'ID',
        field: 'id',
        column: column,
        initialSortDirection: 'desc',
        onSortChange: handleSortChange,
        ref: (el: any) => { sortButtonRefs.value['id'] = el; },
      })
    },
    cell: ({ row }) => row.getValue('id'),
  },
  {
    accessorKey: 'std_question_id',
    header: ( { column } ) => {
      return h(SortButton, {
        label: 'Std Question ID',
        field: 'std_question_id',
        column: column,
        onSortChange: handleSortChange,
        ref: (el: any) => { sortButtonRefs.value['std_question_id'] = el; },
      })
    },
    cell: ({ row }) => row.original.std_question.id,
  },
  {
    accessorKey: 'std_question_content',
    header: ({}) => {
      return h(FloatingLabeledInput, {
        modelValue: search_std_question.value,
        'onUpdate:modelValue': (newValue: string) => {
          search_std_question.value = newValue;
          page.value = 1; // 重置页码
        },
        label: "Question Content"
      })
    },
    cell: ({ row }) => h('div', { innerHTML: row.original.std_question.content }),
  },
  {
    accessorKey: 'content',
    header: ({}) => {
      return h(FloatingLabeledInput, {
        modelValue: search_content.value,
        'onUpdate:modelValue': (newValue: string) => {
          search_content.value = newValue;
          page.value = 1; // 重置页码
        },
        label: "Answer Content"
      })
    },
    cell: ({ row }) => h('div', { innerHTML: row.getValue('content') }),
  },
  {
    accessorKey: 'author',
    header: ({}) => {
      return h(FloatingLabeledInput, {
        modelValue: search_author.value,
        'onUpdate:modelValue': (newValue: string) => {
          search_author.value = newValue;
          page.value = 1; // 重置页码
        },
        label: "Answer Author"
      })
    },
    cell: ({ row }) => h('div', { innerHTML: row.getValue('author') }),
  },
]

watch(query, async () => {
  await fetchData();
}, { deep: true });

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
