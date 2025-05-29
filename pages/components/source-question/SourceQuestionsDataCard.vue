<script setup lang="ts">
import type { SrcQuestion } from "~/server/types/mysql";
import type { TableColumn } from '@nuxt/ui-pro'
import StdQuestionsCard from "~/pages/components/std-question/StdQuestionsCard.vue";
import {h} from "vue";
import {UButton} from "#components";

const data = ref<SrcQuestion[]>([]);
const loading = ref(true);

const sorting = ref([
  {
    id: 'id',
    desc: true
  }
])

watch(sorting, async () => {
  await fetchData(sorting.value[0].desc);
}, { deep: true });

const columns: TableColumn<SrcQuestion>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'ID',
        icon: isSorted
            ? isSorted === 'asc'
                ? 'i-lucide-arrow-up-narrow-wide'
                : 'i-lucide-arrow-down-wide-narrow'
            : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => row.getValue('id'),
  },
  {
    accessorKey: 'content',
    header: 'Content',
    cell: ({ row }: { row: any }) => h('div', {
      innerHTML: row.getValue('content'),
      style: {
        display: '-webkit-box',
        '-webkit-line-clamp': '3',
        '-webkit-box-orient': 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }),
  },
  {
    id: 'view',
    header: 'Actions',
  }
]

async function fetchData(desc: boolean = true) {
  data.value = [];
  loading.value = true;
  try {
    const response = await $fetch('/api/v1/src-question', {
      method: 'GET',
      query: {
        order_by: desc ? 'desc' : 'asc',
      }
    });

    data.value = response["src-questions"];
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
  right: ['view']
})
</script>

<template>
  <UTable
    sticky
    :loading="loading"
    :data="data"
    :columns="columns"
    v-model:column-pinning="columnPinning"
    class="flex-1 max-h-[600px]"
    v-model:sorting="sorting"
  >
    <template #view-cell="{ row }">
      <UModal fullscreen :title="`Source Question #${row.original.id}`">
        <UButton label="View" color="neutral" variant="subtle" />
        <template #body>
          <div v-html="row.original.content"></div>
          <StdQuestionsCard :std_questions="row.original.stdQuestions" />
        </template>
      </UModal>
    </template>
  </UTable>
</template>

<style scoped>
</style>
