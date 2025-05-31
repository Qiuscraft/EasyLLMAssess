<script setup lang="ts">
import type { SrcQuestion } from "~/server/types/mysql";
import type { TableColumn } from '@nuxt/ui-pro'
import StdQuestionsCard from "~/components/std-question/StdQuestionsCard.vue";
import SrcAnswerCard from "~/components/source-question/SrcAnswerCard.vue";
import {h} from "vue";
import {UButton, UInput} from "#components";

const data = ref<SrcQuestion[]>([]);
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

const searchName = ref('');

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
    header: ({  }) => {
      return h(UInput, {
        modelValue: searchName.value,
        'onUpdate:modelValue': (newValue: string) => {
          searchName.value = newValue; // 更新绑定的值
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
    cell: ({ row }) => h(UButton, {
      label: 'View',
      color: 'neutral',
      variant: 'subtle',
      onClick: () => viewing.value = row.original
    }),
  }
]

watch(searchName, async () => {
  await fetchData();
}, { deep: true });

const total = ref(0);

async function fetchData() {
  data.value = [];
  total.value = 0;
  loading.value = true;
  try {
    const response = await $fetch('/api/v1/src-question', {
      method: 'GET',
      query: {
        order_by: sorting.value[0].desc ? 'desc' : 'asc',
        page: page.value,
        page_size: page_size.value,
        content: searchName.value,
      }
    });

    data.value = response["src-questions"];
    total.value = response.total;
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

const page = ref(1);
const page_size = ref(5);

async function handlePageChange(newPage: number) {
  page.value = newPage;
  await fetchData();
}

onMounted(async () => {
  await fetchData();
});

const columnPinning = ref({
  left: [],
  right: ['view']
})

defineExpose({
  fetchData
});

const viewing = ref<SrcQuestion | null>(null);
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
  />
  <UPagination
      show-edges
      :items-per-page="page_size"
      :total="total"
      @update:page="handlePageChange"
  />
  <UModal v-if="viewing" v-model:open="viewing" fullscreen :title="`Source Question #${viewing.id}`">
    <UButton label="View" color="neutral" variant="subtle" />
    <template #body>
      <div v-html="viewing.content"></div>
      <SrcAnswerCard :answers="viewing.answers" />
      <StdQuestionsCard :std_questions="viewing.stdQuestions" />
    </template>
  </UModal>
</template>

<style scoped>
</style>
