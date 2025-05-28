<script setup lang="ts">
const open = ref(false)
const fileContent = ref('')
const loading = ref(false)

const toast = useToast()

function handleFileChange(event) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      fileContent.value = e.target.result
    }
    reader.readAsText(file)
  }
}

async function handleSubmit() {
  loading.value = true
  const response = await $fetch('/api/v1/data', {
    method: 'POST',
    body: fileContent.value
  });
  loading.value = false
  if (response.success) {
    toast.add({
      title: "数据导入成功！",
      color: 'success'
    })
  } else {
    toast.add({
      title: "数据导入失败，请检查文件格式。",
      description: response.message,
      color: 'error'
    })
  }
  fileContent.value = '';
  open.value = false;
}

</script>
<template>
  <UModal v-model:open="open" title="导入数据" description="上传你的数据json文件（支持拖拽）。" :ui="{ footer: 'justify-end' }">
    <UButton label="导入数据" color="neutral" variant="subtle" />

    <template #body>
      <UInput type="file" @change="handleFileChange" />
    </template>

    <template #footer>
      <UButton label="取消" color="neutral" variant="outline" @click="open = false" />
      <UButton label="确认" color="neutral" :disabled="!fileContent || loading" :loading="loading" @click="handleSubmit" />
    </template>
  </UModal>
</template>
