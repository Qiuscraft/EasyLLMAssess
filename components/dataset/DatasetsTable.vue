<script setup lang="ts">
import type {Dataset, StdQuestion, StdQuestionVersion} from "~/server/types/mysql";
import type {TableColumn} from "@nuxt/ui-pro";
import {UButton, UInput, USelect} from "#components";
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

// 用于跟踪每个数据集选中的版本
const selectedVersions = ref<Record<number, number>>({})

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

    // 初始化每个数据集的选中版本为最新版本
    datasets.value.forEach(dataset => {
      if (dataset.versions && dataset.versions.length > 0) {
        // 假设版本按时间降序排序，第一个是最新的
        selectedVersions.value[dataset.id] = dataset.versions[0].id;
      }
    });
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
// 当前查看的数据集版本ID
const currentViewingVersionId = ref<number | null>(null)

// 获取当前选中版本的数据集版本对象
const getCurrentDatasetVersion = (dataset: Dataset) => {
  if (!dataset.versions || dataset.versions.length === 0) return null;

  const selectedVersionId = selectedVersions.value[dataset.id];
  return dataset.versions.find(v => v.id === selectedVersionId) || dataset.versions[0];
}

const formattedQuestions = computed<StdQuestion[]>(() => {
  if (!viewingRow.value) return [];

  // 获取当前选中的数据集版本
  const currentVersion = getCurrentDatasetVersion(viewingRow.value);
  if (!currentVersion) return [];

  // 将stdQuestionVersions转换为StdQuestion格式
  const questionVersionsMap = new Map<number, StdQuestionVersion[]>();

  // 按stdQuestionId分组
  currentVersion.stdQuestionVersions.forEach(version => {
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
    cell: ({ row }) => `${row.original.id}`
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
    cell: ({ row }) => `${row.original.name}`,
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
    cell: ({ row }) => {
      const dataset = row.original;

      // 如果没有版本或只有一个版本，直接显示版本文本
      if (!dataset.versions || dataset.versions.length <= 1) {
        return dataset.versions && dataset.versions.length > 0
          ? dataset.versions[0].version
          : 'N/A';
      }

      // 多个版本时，使用USelect显示版本选择器
      const selectedVersionId = selectedVersions.value[dataset.id] ||
        (dataset.versions.length > 0 ? dataset.versions[0].id : null);

      // 为USelect准备版本选项
      const options = dataset.versions.map(v => ({
        label: v.version,
        value: v.id,
      }));

      return h(USelect, {
        modelValue: selectedVersionId,
        options: options,
        'onUpdate:modelValue': (newValue: number) => {
          selectedVersions.value[dataset.id] = newValue;
        },
        size: 'sm',
        class: 'w-32'
      });
    },
  },
  {
    accessorKey: 'versionId',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Version ID',
        icon: isSorted
            ? isSorted === 'asc'
                ? 'i-lucide-arrow-up-narrow-wide'
                : 'i-lucide-arrow-down-wide-narrow'
            : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => {
      const dataset = row.original;
      const selectedVersionId = selectedVersions.value[dataset.id];

      if (!dataset.versions || dataset.versions.length === 0) {
        return 'N/A';
      }

      // 返回当前选中版本的ID
      return selectedVersionId || (dataset.versions.length > 0 ? dataset.versions[0].id : 'N/A');
    },
  },
  {
    accessorKey: 'createdAt',
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
    cell: ({ row }) => {
      const dataset = row.original;
      const currentVersion = getCurrentDatasetVersion(dataset);
      return currentVersion ? new Date(currentVersion.createdAt).toLocaleString() : 'N/A';
    },
  },
  {
    id: 'view',
    header: 'Actions',
    cell: ({ row }) => {
      return h('div', {
        class: 'flex gap-2'
      }, [
        // 查看按钮
        h(UButton, {
          label: 'View',
          color: 'neutral',
          variant: 'subtle',
          icon: 'i-lucide-eye',
          onClick: () => {
            viewingRow.value = row.original;
            currentViewingVersionId.value = selectedVersions.value[row.original.id];
          }
        }),
        // 导出按钮
        h(UButton, {
          label: 'Export',
          color: 'primary',
          variant: 'subtle',
          icon: 'i-lucide-download',
          onClick: () => exportDatasetVersion(row.original)
        })
      ]);
    }
  },
]

watch(query, async () => {
  await fetchData();
}, { deep: true });

const columnPinning = ref({
  left: [],
  right: ['view']
})

// 实现导出数据集版本为JSON文件的函数
const exportDatasetVersion = (dataset: Dataset) => {
  // 获取当前选中的数据集版本
  const currentVersion = getCurrentDatasetVersion(dataset);
  if (!currentVersion) {
    useToast().add({
      title: "Export Failed",
      description: "No available dataset version",
      color: 'error'
    });
    return;
  }

  // 创建Blob对象
  const dataStr = JSON.stringify(currentVersion, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });

  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dataset_${dataset.id}_version_${currentVersion.id}.json`;

  // 模拟点击下载
  document.body.appendChild(link);
  link.click();

  // 清理
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  useToast().add({
    title: "Export Successful",
    description: `Dataset version has been exported as a JSON file`,
    color: 'success'
  });
}
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
      <UPageCard v-if="viewingRow">
        <template #title>
          {{ viewingRow.name }}
        </template>
        <template #description>
          <div class="flex items-center gap-4">
            <div v-if="viewingRow.versions && viewingRow.versions.length > 1" class="flex items-center gap-2">
              <span>Version:</span>
              <USelect
                v-model="selectedVersions[viewingRow.id]"
                :options="viewingRow.versions.map(v => ({ label: v.version, value: v.id }))"
                size="sm"
                class="w-40"
              />
            </div>
            <div v-else-if="viewingRow.versions && viewingRow.versions.length === 1">
              <span>Version: {{ viewingRow.versions[0].version }}</span>
            </div>

            <div v-if="getCurrentDatasetVersion(viewingRow)">
              <span>Created: {{ new Date(getCurrentDatasetVersion(viewingRow)!.createdAt).toLocaleString() }}</span>
            </div>
          </div>
        </template>

        <StdQuestionsCard :questions="formattedQuestions" />
      </UPageCard>
    </template>
  </UModal>
</template>