<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui-pro'
import type { StdQuestion } from "~/server/types/mysql";
import { UButton, UInput } from "#components";
import SubmitButton from "~/components/user-view/SubmitButton.vue";
import Pagination from "~/components/common/Pagination.vue";

const data = ref<StdQuestion[]>([]);
const loading = ref(true);
const total = ref(0);
const totalNoFilter = ref(0);

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

const columns: TableColumn<StdQuestion>[] = [
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
          h("span", { class: "inline-flex bg-default px-1" }, "Question")
        ])
      ])
    },
    cell: ({ row }) => h('div', { innerHTML: row.getValue('content') }),
  },
  {
    id: 'view',
    header: 'Actions',
    cell: ({ row }) => h(SubmitButton, {
      question: row.original,
    }),
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
