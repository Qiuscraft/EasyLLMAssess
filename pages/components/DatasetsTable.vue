<script setup lang="ts">
import type {Dataset} from "~/server/types/mysql";
import type {TableColumn} from "@nuxt/ui-pro";

const query = ref(
  {
    id: undefined,
    name: undefined,
    version: undefined,
    order_field: 'created_at',
    order_by: 'desc',
    page: 1,
    page_size: 10
  }
)

const datasets = ref<Dataset[]>([])
const loading = ref(true)
const total = ref(0)

async function fetchData() {
  loading.value = true;
  try {
    const response = await $fetch('/api/v1/dataset', {
      method: 'GET',
      query: query.value
    });
    total.value = response.total;
    datasets.value = response.datasets;
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
})

const columns: TableColumn<Dataset>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => `#${row.getValue('id')}`
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => `#${row.getValue('name')}`,
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => `#${row.getValue('version')}`,
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => new Date(row.getValue('created_at')).toLocaleString(),
  },
]
</script>

<template>
  <UTable :data="datasets" :columns="columns" class="flex-1" />
</template>