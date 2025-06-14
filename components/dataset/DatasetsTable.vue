<script setup lang="ts">
import type {Dataset, StdQuestion, StdQuestionVersion} from "~/server/types/mysql";
import type {TableColumn} from "@nuxt/ui-pro";
import {h} from "vue";
import {UButton, UInput} from "#components";
import StdQuestionsCard from "~/components/std-question/StdQuestionsCard.vue";
import Pagination from "~/components/common/Pagination.vue";

const page = ref(1)
const page_size = ref(5)

const searchName = ref('')

const sorting = ref([
  {
    id: 'created_at',
    desc: true
  }
])

const query = computed(() => ({
  name: searchName.value,
  order_field: sorting.value[0]?.id || 'created_at',
  order_by: sorting.value[0]?.desc ? 'desc' : 'asc',
  page: page.value,
  page_size: page_size.value,
}))

const datasets = ref<Dataset[]>([])
const loading = ref(true)
const total = ref(0)

async function fetchData() {
  loading.value = true;
  datasets.value = [];
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

const viewingRow = ref<Dataset | null>(null)
const formattedQuestions = computed<StdQuestion[]>(() => {
  if (!viewingRow.value) return [];

  // 将questionVersions转换为StdQuestion格式
  const questionVersionsMap = new Map<number, StdQuestionVersion[]>();

  // 按stdQuestionId分组
  viewingRow.value.questionVersions.forEach(version => {
    if (!questionVersionsMap.has(version.stdQuestionId)) {
      questionVersionsMap.set(version.stdQuestionId, []);
    }
    questionVersionsMap.get(version.stdQuestionId)?.push(version);
  });

  // 转换为StdQuestion数组
  return Array.from(questionVersionsMap.entries()).map(([id, versions]) => ({
    id,
    versions
  }));
})

const columns: TableColumn<Dataset>[] = [
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
    cell: ({ row }) => `${row.getValue('id')}`
  },
  {
    accessorKey: 'name',
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
          h("span", { class: "inline-flex bg-default px-1" }, "Dataset Name")
        ])
      ])
    },
    cell: ({ row }) => `${row.getValue('name')}`,
  },
  {
    accessorKey: 'version',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Version',
        icon: isSorted
            ? isSorted === 'asc'
                ? 'i-lucide-arrow-up-narrow-wide'
                : 'i-lucide-arrow-down-wide-narrow'
            : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => `${row.getValue('version')}`,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Created At',
        icon: isSorted
            ? isSorted === 'asc'
                ? 'i-lucide-arrow-up-narrow-wide'
                : 'i-lucide-arrow-down-wide-narrow'
            : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => new Date(row.getValue('created_at')).toLocaleString(),
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

watch(query, async () => {
  await fetchData();
}, { deep: true });

const columnPinning = ref({
  left: [],
  right: ['view']
})
</script>

<template>
  <UTable
    :data="datasets"
    :columns="columns"
    :loading="loading"
    v-model:column-pinning="columnPinning"
    v-model:sorting="sorting"
  />

  <Pagination
      v-model:page="page"
      v-model:page_size="page_size"
      :total="total"
  />

  <UModal v-if="viewingRow" v-model:open="viewingRow" fullscreen :title="`Dataset #${viewingRow.id}`">
    <template #body>
      <UPageCard
          :title="`${viewingRow.name} - ${viewingRow.version}`"
          :description="`Created At: ${viewingRow.created_at}`"
      >
        <StdQuestionsCard :questions="formattedQuestions" />
      </UPageCard>
    </template>
  </UModal>
</template>