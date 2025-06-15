<script setup lang="ts">
import AssessmentImportButton from '~/components/assessments/AssessmentImportButton.vue'
import AssessmentTable from "~/components/assessments/AssessmentTable.vue";

// 创建对表格组件的��用
const assessmentTableRef = ref<InstanceType<typeof AssessmentTable> | null>(null);

// 处理导入成功事件
function handleImportSuccess() {
  // 刷新表格数据
  assessmentTableRef.value?.fetchData();
}
</script>

<template>
  <AssessmentImportButton @import-success="handleImportSuccess" />
  <AssessmentTable ref="assessmentTableRef" />
</template>

<style scoped>
/* Custom styles */
</style>