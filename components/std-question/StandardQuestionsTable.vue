<script setup lang="ts">
import type {StdQuestion, StdQuestionVersion, Category} from "~/server/types/mysql";
import { UButton, USelect, UCheckbox, UTable, UBadge } from "#components";
import CreateDatasetButton from "~/components/std-question/CreateDatasetButton.vue";
import Pagination from "~/components/common/Pagination.vue";
import {responseToStdQuestions, sortStdQuestionVersionsByCreationTime} from "~/utils/std-question";
import FloatingLabeledInput from "~/components/common/FloatingLabeledInput.vue";

const data = ref<StdQuestion[]>([]);
const loading = ref(true);
const total = ref(0);
const totalNoFilter = ref(0);

// 存储每行当前显示的版本索引
const currentVersionIndices = ref<Record<number, number>>({});

const sort_by = ref('desc')
const content = ref('')
const answer = ref('')
const page_size = ref(5)
const page = ref(1)
const onlyShowQuestionWithAnswer = ref(true);
const selectedCategory = ref(''); // 添加分类筛选变量
const selectedTags = ref<string[]>([]); // 添加标签筛选变量
const tagOptions = ref<{ label: string; value: string }[]>([]);

const params = computed(() => {
  return {
    page: page.value,
    page_size: page_size.value,
    sort_by: sort_by.value,
    content: content.value,
    answer: answer.value,
    only_show_answered: onlyShowQuestionWithAnswer.value,
    // Handle "All Categories" option (value 'all') by sending empty string
    category: selectedCategory.value === 'all' ? '' : selectedCategory.value,
    tags: selectedTags.value,
  };
});

async function fetchData() {
  loading.value = true;
  try {
    const response = await $fetch('/api/v1/std-question', {
      method: 'GET',
      params: params.value,
    });

    data.value = responseToStdQuestions(response.std_questions);

    // 初始化每行当前显示的版本索引为0
    data.value.forEach(question => {
      if (!currentVersionIndices.value[question.id]) {
        currentVersionIndices.value[question.id] = 0;
      }
    });

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
  await fetchCategoryData();
  await fetchTagsData(); // 添加获取标签数据
  await fetchData();
  // 确保表格初始状态为降序排序
  if (table?.value?.tableApi) {
    table.value.tableApi.getColumn('id')?.toggleSorting(true);
  }
});

// 根据问题ID和当前版本索引获取当前显示的版本
const getCurrentVersion = (questionId: number) => {
  const question = data.value.find(q => q.id === questionId);
  if (!question) return null;

  const versionIndex = currentVersionIndices.value[questionId] || 0;
  return question.versions[versionIndex];
};

// 获取指定问题的版本选项
const getVersionOptions = (questionId: number) => {
  const question = data.value.find(q => q.id === questionId);
  if (!question) return [];

  return question.versions.map((version, index) => ({
    label: `${version.version}`,
    value: index
  }));
};

// 更新当前显示的版本
const changeVersion = (questionId: number, versionIndex: number) => {
  currentVersionIndices.value[questionId] = versionIndex;
};

const columns: TableColumn<StdQuestion>[] = [
  {
    id: 'select',
    header: ({ table }: { table: any }) =>
        h(UCheckbox, {
          modelValue: table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : table.getIsAllPageRowsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
              table.toggleAllPageRowsSelected(!!value),
          'aria-label': 'Select all'
        }),
    cell: ({ row }: { row: any }) =>
        h(UCheckbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          'aria-label': 'Select row'
        })
  },
  {
    accessorKey: 'id',
    header: ( { column } : { column: any } ) => {
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
    cell: ({ row }: { row: any }) => row.getValue('id'),
  },
  {
    accessorKey: 'content',
    header: ({  }) => {
      return h(FloatingLabeledInput, {
        modelValue: content.value,
        'onUpdate:modelValue': (newValue: string) => {
          content.value = newValue;
        },
        label: "Question"
      })
    },
    cell: ({ row }: { row: any }) => {
      const questionId = row.original.id;
      const currentVersion = getCurrentVersion(questionId);
      return h('div', { innerHTML: currentVersion?.content || '' });
    },
  },
  {
    id: 'version',
    header: 'Version',
    cell: ({ row }: { row: any }) => {
      const questionId = row.original.id;
      const versionOptions = getVersionOptions(questionId);
      const currentVersionIndex = currentVersionIndices.value[questionId] || 0;

      // 如果只有一个版本，直接显示文本
      if (versionOptions.length <= 1) {
        const currentVersion = getCurrentVersion(questionId);
        return h('div', { class: 'text-sm text-center' }, currentVersion?.version || '1');
      }

      // 有多个版本时显示选择框
      return h(USelect, {
        modelValue: currentVersionIndex,
        items: versionOptions,
        size: 'sm',
        'onUpdate:modelValue': (newValue: number) => {
          changeVersion(questionId, newValue);
        }
      });
    }
  },
  {
    id: 'tags',
    header: () => {
      return h(USelect, {
        modelValue: selectedTags.value,
        items: tagOptions.value,
        placeholder: "Select Tags",
        size: "sm",
        class: "w-48",
        multiple: true,
        'onUpdate:modelValue': (newValue: string[]) => {
          selectedTags.value = newValue;
        }
      });
    },
    cell: ({ row }: { row: any }) => {
      const questionId = row.original.id;
      const currentVersion = getCurrentVersion(questionId);
      if (!currentVersion?.tags || currentVersion.tags.length === 0) {
        return h('div', { class: 'text-sm text-muted' }, 'No tags');
      }

      return h('div', { class: 'flex flex-wrap gap-1' },
        currentVersion.tags.map(tag =>
          h(UBadge, {
            color: getTagColorByFirstLetter(tag),
            size: 'sm',
            class: 'px-1.5 py-0.5',
            label: tag
          })
        )
      );
    }
  },
  {
    id: 'category',
    header: () => {
      return h(USelect, {
        modelValue: selectedCategory.value,
        items: categoryOptions.value,
        placeholder: "Category",
        size: "sm",
        class: "w-48",
        'onUpdate:modelValue': (newValue: string) => {
          selectedCategory.value = newValue;
        }
      });
    },
    cell: ({ row }: { row: any }) => {
      const questionId = row.original.id;
      const currentVersion = getCurrentVersion(questionId);
      return h('div', { class: 'text-sm' }, currentVersion?.category || 'Uncategorized');
    }
  },
  {
    accessorKey: 'answer',
    header: ({  }) => {
      return h(FloatingLabeledInput, {
        modelValue: answer.value,
        'onUpdate:modelValue': (newValue: string) => {
          answer.value = newValue;
        },
        label: "Answer"
      })
    },
    cell: ({ row }: { row: any }) => {
      const questionId = row.original.id;
      const currentVersion = getCurrentVersion(questionId);
      return h('div', { innerHTML: currentVersion?.answer?.content || 'No standard answer available.' });
    },
  },
  {
    id: 'view',
    header: 'Actions',
    cell: ({ row }: { row: any }) => h(UButton, {
      label: 'View',
      color: 'neutral',
      variant: 'subtle',
      onClick: () => viewingRow.value = row.original
    })
  },
]

watch([page, page_size], async () => {
  await fetchData();
}, { deep: true });

watch([content, answer, onlyShowQuestionWithAnswer, selectedCategory, selectedTags], async () => {
  if (page.value === 1) {
    await fetchData();
  } else {
    page.value = 1; // Reset to first page when filters change
  }
}, { deep: true });

// 获取分类列表数据
const categoryOptions = ref<{ label: string; value: string; description?: string }[]>([
  { label: 'All', value: 'all', description: 'Show all questions' }
]);

const table = useTemplateRef('table')

const viewingRow = ref<StdQuestion | null>(null)
const viewingRowSorted = computed(() => {
  if (!viewingRow.value) return null;
  return sortStdQuestionVersionsByCreationTime(viewingRow.value);
})
const rowSelection = ref<Record<number, boolean>>({ })

const columnPinning = ref({
  left: [],
  right: ['view']
})
computed(() => {
  return Object.keys(rowSelection.value)
      .filter(id => rowSelection.value[Number(id)])
      .map(Number);
});
const selected_version_id_list = computed(() => {
  // 获取选中行的问题ID
  const selectedQuestionIds = Object.keys(rowSelection.value)
    .filter(id => rowSelection.value[Number(id)])
    .map(Number);

  // 将问题ID转换为对应的当前选中版本的版本ID
  const versionIds: number[] = [];
  selectedQuestionIds.forEach(questionId => {
    const question = data.value.find(q => q.id === questionId);
    if (question) {
      const versionIndex = currentVersionIndices.value[questionId] || 0;
      const version = question.versions[versionIndex];
      if (version) {
        versionIds.push(version.id);
      }
    }
  });

  return versionIds;
})

const handleSubmit = () => {
  rowSelection.value = {};
}

const viewingVersion = ref<StdQuestionVersion | null>(null);
const isModalOpen = ref(false);

watch(viewingRow, () => {
  if (viewingRowSorted.value) {
    // 如果有查看某一行，使用该行当前选中的版本
    if (viewingRowSorted.value.id && currentVersionIndices.value[viewingRowSorted.value.id] !== undefined) {
      const versionIndex = currentVersionIndices.value[viewingRowSorted.value.id];
      viewingVersion.value = viewingRowSorted.value.versions[versionIndex];
    } else {
      viewingVersion.value = viewingRowSorted.value.versions[0];
    }
    isModalOpen.value = true;
  } else {
    viewingVersion.value = null;
    isModalOpen.value = false;
  }
});

watch (isModalOpen, (newValue) => {
  if (!newValue) {
    viewingRow.value = null;
    viewingVersion.value = null;
  }
})

// 获取分类数据
async function fetchCategoryData() {
  try {
    const categories = await $fetch('/api/v1/category', {
      method: 'GET'
    }) as Category[];

    // 确保我们已经有了问题总数
    if (totalNoFilter.value === 0) {
      // 如果totalNoFilter还没有值，先获取一次问题总数
      const response = await $fetch('/api/v1/std-question', {
        method: 'GET',
        params: {
          page: 1,
          page_size: 1,
        },
      });
      totalNoFilter.value = response.total_no_filter || 0;
    }

    // 将获取的分类数据转换为下拉菜单选项格式
    const options = categories.map(category => ({
      label: `${category.name} (${category.count})`,
      value: category.name,
      description: `${category.count} questions`
    }));

    // 保留"��部分类"选项并添加获取的分类
    // 使用totalNoFilter作为所有问题的总数量，包括未分类的问题
    categoryOptions.value = [
      { label: `All (${totalNoFilter.value})`, value: 'all', description: `${totalNoFilter.value} questions total` },
      ...options
    ];
  } catch (error) {
    useToast().add({
      title: "Failed to load categories",
      description: error instanceof Error ? error.message : "Unknown error",
      color: 'error'
    });
  }
}

// 获取标签数据
async function fetchTagsData() {
  try {
    const tags = await $fetch('/api/v1/tag', {
      method: 'GET',
      params: {
        size: 100 // 获取较多的标签以便筛选
      }
    });

    // 将获取的标签数据转换为下拉菜单选项格式
    tagOptions.value = tags.map((tag: any) => ({
      label: `${tag.tag} (${tag.count})`,
      value: tag.tag
    }));
  } catch (error) {
    useToast().add({
      title: "Failed to load tags",
      description: error instanceof Error ? error.message : "Unknown error",
      color: 'error'
    });
  }
}

// 获取标签颜色的辅助函数
const getTagColorByFirstLetter = (tag: string): string => {
  if (!tag || tag.length === 0) return 'primary';

  // 获取首字母并转为小写
  const firstLetter = tag.charAt(0).toLowerCase();

  // 根据首字母分配颜色 - 使用UBadge组件支持的颜色值
  switch (true) {
    case /[a-c]/.test(firstLetter): return 'primary';   // a, b, c
    case /[d-f]/.test(firstLetter): return 'success';   // d, e, f
    case /[g-i]/.test(firstLetter): return 'warning';   // g, h, i
    case /[j-l]/.test(firstLetter): return 'error';     // j, k, l
    case /[m-o]/.test(firstLetter): return 'secondary'; // m, n, o
    case /[p-r]/.test(firstLetter): return 'info';      // p, q, r
    case /[s-u]/.test(firstLetter): return 'warning';   // s, t, u
    case /[v-x]/.test(firstLetter): return 'success';   // v, w, x
    case /[y-z]/.test(firstLetter): return 'primary';   // y, z
    case /[0-9]/.test(firstLetter): return 'neutral';   // 数字
    default: return 'neutral';                          // 其他字符
  }
};
</script>

<template>
  <div class="flex items-center gap-4 mb-4 flex-wrap">
    <UCheckbox v-model="onlyShowQuestionWithAnswer" color="primary" label="Only show the questions that have standard answer" />
  </div>

  <div class="flex-1 w-full">
    <CreateDatasetButton :id_list="selected_version_id_list" @submit="handleSubmit" />

    <UTable
        sticky
        ref="table"
        v-model:row-selection="rowSelection"
        :data="data"
        :columns="columns"
        :loading="loading"
        v-model:column-pinning="columnPinning"
        :get-row-id="row => String(row.id)"
    />

    <Pagination
        v-model:page="page"
        v-model:page_size="page_size"
        :total="total"
    />

    <UModal
        v-if="viewingRow && viewingVersion"
        v-model:open="isModalOpen"
        fullscreen
        :title="`Standard Question #${viewingRow.id}-${viewingVersion.version}`"
    >
      <template #body>
        <UPageCard class="p-4 space-y-4">
          <UPageCard
              :title="`Standard Question: ${viewingVersion.content}`"
              :description="`Standard Answer: ${viewingVersion.answer?.content || 'No standard answer available.'}`"
          >
            <UTable
                v-if="viewingVersion.answer"
                :data="viewingVersion.answer.scoringPoints"
                :columns="[
                { accessorKey: 'content', header: 'Scoring Point' },
                { accessorKey: 'score', header: 'Score' }
              ]"
            />
          </UPageCard>
        </UPageCard>
      </template>
    </UModal>

    <div class="px-4 py-3.5 border-t border-accented text-sm text-muted">
      <div>{{ selected_version_id_list.length || 0 }} / {{ totalNoFilter }} total question versions selected.</div>
    </div>
  </div>
</template>

<style scoped>
</style>
