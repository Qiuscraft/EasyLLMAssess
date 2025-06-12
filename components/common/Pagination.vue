<script setup lang="ts">
const props = withDefaults(defineProps<{
  page: number;
  page_size: number;
  total: number;
  description?: string;
  page_size_items?: number[];
}>(), {
  page: 1,
  page_size: 5,
  total: 0,
  description: '每页条目数：',
  page_size_items: () => [5, 10, 20, 50, 100]
});

// 定义用于双向绑定的事件
const emit = defineEmits(['update:page', 'update:page_size']);

// 创建计算属性用于本地状态管理
const currentPage = computed({
  get: () => props.page,
  set: (value) => emit('update:page', value)
});

const currentPageSize = computed({
  get: () => props.page_size,
  set: (value) => emit('update:page_size', value)
});
</script>

<template>
  <div class="flex items-center justify-between mt-4">
    <UPagination
        show-edges
        :items-per-page="props.page_size"
        :total="props.total"
        v-model:page="currentPage"
    />
    <div class="flex items-center gap-2">
      <span>{{props.description}}</span>
      <USelect v-model="currentPageSize" :items="props.page_size_items" />
    </div>
  </div>
</template>