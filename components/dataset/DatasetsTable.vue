<script setup lang="ts">
import type {Dataset, StdQuestion, StdQuestionVersion} from "~/server/types/mysql";
import type {TableColumn} from "@nuxt/ui-pro";
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

    // 将每个数据集的每个版本作为独立条目处理
    const flattenedDatasets: Dataset[] = [];
    response.datasets.forEach(dataset => {
      if (dataset.versions && dataset.versions.length > 0) {
        dataset.versions.forEach(version => {
          flattenedDatasets.push({
            ...dataset,
            // 存储当前版本信息，以便在视图中使用
            currentVersion: version,
            // 保留原始版本数组，但已不再需要进行版本切换
            versions: [version]
          });
        });
      } else {
        flattenedDatasets.push(dataset);
      }
    });

    datasets.value = flattenedDatasets;
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

// 获取当前数据集版本对象
const getCurrentDatasetVersion = (dataset: Dataset) => {
  if (!dataset.versions || dataset.versions.length === 0) return null;
  return dataset.versions[0]; // 现在每个数据集只有一个版本
}

const formattedQuestions = computed<StdQuestion[]>(() => {
  if (!viewingRow.value) return [];

  // 获取当前数据集版本
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
      // 显示当前版本的名称
      return dataset.versions && dataset.versions.length > 0
        ? dataset.versions[0].version
        : 'N/A';
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
      return dataset.versions && dataset.versions.length > 0
        ? dataset.versions[0].id
        : 'N/A';
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
  // 获取当前数据集版本
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

  // 创建��载链接
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
            <!-- 显示版本信息，但不提供切换功能 -->
            <div v-if="viewingRow.versions && viewingRow.versions.length > 0">
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