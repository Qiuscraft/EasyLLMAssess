<script setup lang="ts">
const value = ref('')
const fileName = ref('')
const fileContent = ref('')

function handleFileChange(event) {
  const file = event.target.files[0]
  if (file) {
    fileName.value = file.name

    const reader = new FileReader()
    reader.onload = (e) => {
      fileContent.value = e.target.result
    }
    reader.readAsText(file)
  }
}
</script>

<template>
  <UInput v-model="value" type="file" @change="handleFileChange" />
  <div>选择的文件: {{ fileName }}</div>
  <div>文件内容: {{fileContent}}</div>
</template>