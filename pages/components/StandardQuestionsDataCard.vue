<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {SrcQuestion, StdQuestion} from "~/server/types/mysql";

const UCheckbox = resolveComponent('UCheckbox')

const data = ref<StdQuestion[]>([]);
const loading = ref(true);

async function fetchData() {
  loading.value = true;
  try {
    const response = await $fetch('/api/v1/data', {
      method: 'GET',
    });

    if (response.success && response.data) {
      data.value = [];
      const srcQuestions: SrcQuestion[] = response.data;
      data.value = srcQuestions.flatMap(srcQuestion => srcQuestion.stdQuestions);
    } else {
      useToast().add({
        title: "Data Load Failed",
        description: response.message,
        color: 'error'
      });
    }
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
});

const columns: TableColumn<StdQuestion>[] = [
  {
    id: 'select',
    header: ({ table }) =>
        h(UCheckbox, {
          modelValue: table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : table.getIsAllPageRowsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
              table.toggleAllPageRowsSelected(!!value),
          'aria-label': 'Select all'
        }),
    cell: ({ row }) =>
        h(UCheckbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          'aria-label': 'Select row'
        })
  },
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => row.getValue('id'),
  },
  {
    accessorKey: 'content',
    header: 'Content',
    cell: ({ row }) => h('div', { innerHTML: row.getValue('content') }),
  },
  {
    accessorKey: 'answer',
    header: 'Answer',
    cell: ({ row }) => h('div', { innerHTML: row.getValue('answer') }),
  },
]

const table = useTemplateRef('table')

const rowSelection = ref({ })
</script>

<template>
  <div class="flex-1 w-full">
    <UTable ref="table" v-model:row-selection="rowSelection" :data="data" :columns="columns" :loading="loading" />

    <div class="px-4 py-3.5 border-t border-accented text-sm text-muted">
      {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
      {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s) selected.
    </div>
  </div>
</template>


<style scoped>
</style>
