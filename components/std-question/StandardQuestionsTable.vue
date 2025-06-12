<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {StdQuestion} from "~/server/types/mysql";
import {UButton, UInput} from "#components";
import CreateDatasetButton from "~/components/std-question/CreateDatasetButton.vue";
import Pagination from "~/components/common/Pagination.vue";

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

async function fetchData() {
  loading.value = true;
  try {
    const response = await $fetch('/api/v1/std-question', {
      method: 'GET',
      params: {
        page: page.value,
        page_size: page_size.value,
        sort_by: sort_by.value,
        content: content.value,
        answer: answer.value,
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
    header: ({  }) => {
      return h(UInput, {
        modelValue: content.value,
        'onUpdate:modelValue': async (newValue: string) => {
          content.value = newValue; // 更新绑定的值
        },
        placeholder: "",
        ui: { base: "peer" },
      }, [
        h("label", {
          class: "pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal",
        }, [
          h("span", { class: "inline-flex bg-default px-1" }, "Content")
        ])
      ])
    },
    cell: ({ row }) => h('div', { innerHTML: row.getValue('content') }),
  },
  {
    accessorKey: 'answer',
    header: ({  }) => {
      return h(UInput, {
        modelValue: answer.value,
        'onUpdate:modelValue': async (newValue: string) => {
          answer.value = newValue; // 更新绑定的值
        },
        placeholder: "",
        ui: { base: "peer" },
      }, [
        h("label", {
          class: "pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal",
        }, [
          h("span", { class: "inline-flex bg-default px-1" }, "Answer")
        ])
      ])
    },
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

watch([content, answer, page, page_size], async () => {
  await fetchData();
}, { deep: true });

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
        :get-row-id="row => row.id"
    />

    <Pagination
        v-model:page="page"
        v-model:page_size="page_size"
        :total="total"
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
      {{ selected_id_list.length || 0 }} / {{ totalNoFilter }} row(s) selected.
    </div>
  </div>
</template>


<style scoped>
</style>
