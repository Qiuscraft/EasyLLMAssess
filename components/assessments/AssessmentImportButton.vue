<script setup lang="ts">
const emit = defineEmits(['import-success'])
const open = ref(false)
const fileContent = ref('')
const loading = ref(false)

const toast = useToast()

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target?.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target) {
        fileContent.value = e.target.result as string
      }
    }
    reader.readAsText(file)
  }
}

async function handleSubmit() {
  if (!fileContent.value) {
    toast.add({
      title: "Please select a file",
      color: 'warning'
    })
    return
  }

  loading.value = true

  try {
    // Validate JSON format
    let assessmentData;
    try {
      assessmentData = JSON.parse(fileContent.value);
    } catch (error) {
      toast.add({
        title: "Invalid JSON format",
        color: 'error'
      })
      loading.value = false
      return;
    }

    // Validate required fields
    if (!assessmentData.dataset_version_id || !assessmentData.model || !Array.isArray(assessmentData.model_answers)) {
      toast.add({
        title: "Data format error",
        description: "Missing required fields",
        color: 'error'
      })
      loading.value = false
      return;
    }

    const response = await $fetch('/api/v1/assessment', {
      method: 'POST',
      body: assessmentData
    });

    toast.add({
      title: "Assessment imported successfully",
      description: `Assessment ID: ${response.assessment_id}`,
      color: 'success'
    })

    emit('import-success')
  } catch (error: any) {
    toast.add({
      title: "Import failed",
      description: error.message || "Unknown error",
      color: 'error'
    })
  } finally {
    loading.value = false
    fileContent.value = ''
    open.value = false
  }
}
</script>

<template>
  <div>
    <UButton
      label="Import Assessment"
      icon="i-heroicons-arrow-up-tray"
      color="neutral"
      variant="subtle"
      @click="open = true"
    />

    <UModal
      v-model:open="open"
      title="Import Assessment"
      description="Upload assessment JSON file"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="space-y-4">
          <UInput
            type="file"
            accept=".json"
            @change="handleFileChange"
          />

          <div class="text-sm text-gray-500">
            <p>File format requirements:</p>
            <pre class="bg-gray-100 p-2 rounded mt-2 text-xs overflow-auto">
{
  "dataset_version_id": number,
  "model": "model_name",
  "model_answers": [
    {
      "content": "model answer content",
      "std_question_version_id": number,
      "score_processes": [
        {
          "type": "score type",
          "description": "score description",
          "score": number,
          "scoring_point_content": "scoring point content"
        }
      ]
    }
  ]
}
            </pre>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          @click="open = false"
        />
        <UButton
          label="Submit"
          color="neutral"
          :loading="loading"
          :disabled="!fileContent || loading"
          @click="handleSubmit"
        />
      </template>
    </UModal>
  </div>
</template>

<style scoped>

</style>