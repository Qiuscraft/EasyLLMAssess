<script setup lang="ts">
const emit = defineEmits(['import'])
const open = ref(false)
const fileContent = ref('')
const loading = ref(false)

const toast = useToast()

const exampleJson = `[
  {
    "content": "string",
    "answers": [
      "string"
    ],
    "std_questions": [
      {
        "versions": [
          {
            "content": "string",
            "version": "string",
            "category": "string",
            "tags": [
              "string"
            ],
            "answer": {
              "content": "string",
              "scoring_points": [
                {
                  "content": "string",
                  "score": "string"
                }
              ]
            }
          }
        ]
      }
    ]
  }
]`

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
  loading.value = true
  const response = await $fetch('/api/v1/data', {
    method: 'POST',
    body: fileContent.value
  });
  loading.value = false
  if (response.success) {
    toast.add({
      title: "Data Imported Successfully",
      color: 'success'
    })
  } else {
    toast.add({
      title: "Data Import Failed. Please check the file format.",
      description: response.message,
      color: 'error'
    })
  }
  fileContent.value = '';
  open.value = false;
  emit('import', fileContent.value);
}

</script>
<template>
  <UModal v-model:open="open" title="Import Source Questions" description="Upload your data json file. (Draggable)" :ui="{ footer: 'justify-end' }">
    <UButton label="Import Source Questions" color="neutral" variant="subtle" />

    <template #body>
      <div class="space-y-4">
        <UInput type="file" @change="handleFileChange" />

        <div class="text-sm text-gray-500">
          <p>File format requirements:</p>
          <pre class="bg-gray-100 p-2 rounded mt-2 text-xs overflow-auto">{{ exampleJson }}</pre>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton label="Cancel" color="neutral" variant="outline" @click="open = false" />
      <UButton label="Submit" color="neutral" :disabled="!fileContent || loading" :loading="loading" @click="handleSubmit" />
    </template>
  </UModal>
</template>
