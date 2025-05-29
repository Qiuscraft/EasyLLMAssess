<script setup lang="ts">
import type { SrcQuestion } from "~/server/types/mysql";
import type { TableColumn } from '@nuxt/ui-pro'

const data = ref<SrcQuestion[]>([]);

const columns: TableColumn<SrcQuestion>[] = [
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
    id: 'view',
    header: 'Actions',
  }
]

async function fetchData() {
  try {
    const response = await $fetch('/api/v1/data', {
      method: 'GET',
    });

    if (response.success && response.data) {
      data.value = response.data;
    } else {
      useToast().add({
        title: "数据加载失败",
        description: response.message,
        color: 'error'
      });
    }
  } catch (error) {
    useToast().add({
      title: "数据加载失败",
      description: error instanceof Error ? error.message : "未知错误",
      color: 'error'
    });
  }
}

onMounted(async () => {
  await fetchData();
});

const columnPinning = ref({
  left: [],
  right: ['view']
})
</script>

<template>
  <UTable :data="data" :columns="columns" v-model:column-pinning="columnPinning">
    <template #view-cell="{ row }">
      <UModal fullscreen :title="`Source Question #${row.original.id}`">
        <UButton label="View" color="neutral" variant="subtle" />
        <template #body>
          <div v-html="row.original.content"></div>
          <UPageCard title="Standard Questions">
            <UPageCard
                v-for="sq in row.original.stdQuestions"
                :title="`Standard Question: ${sq.content}`"
                :description="`Standard Answer: ${sq.answer}`"
            >
              <UTable
                :data="sq.points"
                :columns="[
                  {
                    accessorKey: 'content',
                    header: 'Point',
                    cell: ({ row }) => row.getValue('content')
                  },
                  {
                    accessorKey: 'score',
                    header: 'Score',
                    cell: ({ row }) => row.getValue('score')
                  }
                ]"
              />
            </UPageCard>
          </UPageCard>
        </template>
      </UModal>
    </template>
  </UTable>
</template>

<style scoped>
</style>
