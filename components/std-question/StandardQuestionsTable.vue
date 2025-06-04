<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {StdQuestion} from "~/server/types/mysql";
import {UButton} from "#components";
import CreateDatasetButton from "~/components/std-question/CreateDatasetButton.vue";

const UCheckbox = resolveComponent('UCheckbox')

const data = ref<StdQuestion[]>([]);
const loading = ref(true);
const total = ref(0);
const totalNoFilter = ref(0);

const sort_by = ref('desc')

async function fetchData() {
  loading.value = true;
  try {
    const response = await $fetch('/api/v1/std-question', {
      method: 'GET',
      params: {
        page_size: 32767,
        sort_by: sort_by.value,
      }
    });

    data.value = response.std_questions;
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
    header: ( { column } ) => {
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
  {
    id: 'view',
    header: 'Actions',
    cell: ({ row }) => h(UButton, {
      label: 'View',
      color: 'neutral',
      variant: 'subtle',
      onClick: () => viewingRow.value = row.original
    })
  },
]

const table = useTemplateRef('table')

const viewingRow = ref<StdQuestion | null>(null)
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
</script>

<template>
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
        class="flex-1 max-h-[500px]"
    />

    <UModal v-if="viewingRow" v-model:open="viewingRow" fullscreen :title="`Standard Question #${viewingRow.id}`">
      <template #body>
        <UPageCard class="p-4 space-y-4">
          <UPageCard
              :title="`Standard Question: ${viewingRow.content}`"
              :description="`Standard Answer: ${viewingRow.answer}`"
          >
            <UTable
                :data="viewingRow.points"
                :columns="[
                { accessorKey: 'content', header: 'Point' },
                { accessorKey: 'score', header: 'Score' }
              ]"
            />
          </UPageCard>
        </UPageCard>
      </template>
      <template #footer>
        <UButton label="Close" color="gray" @click="viewingRow = null" />
      </template>
    </UModal>

    <div class="px-4 py-3.5 border-t border-accented text-sm text-muted">
      {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} / {{ totalNoFilter }} row(s) selected.
    </div>
  </div>
</template>


<style scoped>
</style>
