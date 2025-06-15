<script setup lang="ts">
import type { Assessment } from "~/server/types/mysql";
import type { TableColumn } from '@nuxt/ui-pro'
import Pagination from "~/components/common/Pagination.vue";
import {UButton} from "#components";

const data = ref<Assessment[]>([]);
const loading = ref(true);

const sorting = ref([
  {
    id: 'id',
    desc: true
  }
])

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
    cell: ({ row }: { row: any }) => {
      const assessment = row.original;
      return assessment.datasetVersion?.datasetId || 'N/A';
    },
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
    id: 'actions',
    header: 'Actions',
    cell: ({ row }: { row: any }) => h('div', {}), // 暂时不展示任何内容
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
</template>

<style scoped>
</style>