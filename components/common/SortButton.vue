<script setup lang="ts">
interface Props {
  label?: string;
  field: string;
  initialSortDirection?: 'asc' | 'desc' | 'none';
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  column?: any;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  initialSortDirection: 'none',
  onSortChange: undefined,
});

const sort_by = ref<'asc' | 'desc' | 'none'>(props.initialSortDirection);
const sort_field = ref(props.field);

const toggleSort = async () => {
  sort_by.value = sort_by.value === 'desc' ? 'asc' : 'desc';
  sort_field.value = props.field;

  if (props.column) {
    props.column.toggleSorting(sort_by.value === 'desc');
  }

  if (props.onSortChange) {
    props.onSortChange(props.field, sort_by.value);
  }
};

const resetSort = () => {
  sort_by.value = 'none';
};

defineExpose({
  resetSort
});
</script>

<template>
  <UButton
      color="neutral"
      variant="ghost"
      :label="label"
      :icon="sort_by === 'desc' ? 'i-lucide-arrow-down-wide-narrow' : sort_by === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-up-down'"
      class="-mx-2.5"
      @click="toggleSort"
  />
</template>

<style scoped>
</style>