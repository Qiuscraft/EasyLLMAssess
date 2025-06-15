<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Model Configuration</h1>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        @click="isModalOpen = true"
      >
        Add Model
      </UButton>
    </div>

    <UCard class="w-full">
      <UTable
        :data="modelStore.models"
        :columns="columns"
        :ui="{ tbody: 'model-table-tbody' }"
      />
    </UCard>

    <!-- Add Model Modal -->
    <UModal
      v-model:open="isModalOpen"
      title="Add New Model"
      :ui="{ footer: 'justify-end' }"
      @close="closeModal"
    >
      <template #body>
        <div class="space-y-4">
          <div class="relative w-full">
            <UInput
              v-model="newModel.model"
              placeholder="e.g., gpt-3.5-turbo"
              class="peer w-full"
            >
              <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                <span class="inline-flex bg-default px-1">Model Name</span>
              </label>
            </UInput>
          </div>

          <div class="relative w-full">
            <UInput
              v-model="newModel.apiBaseurl"
              placeholder="e.g., https://api.openai.com/v1"
              class="peer w-full"
            >
              <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                <span class="inline-flex bg-default px-1">API Base URL</span>
              </label>
            </UInput>
          </div>

          <div class="relative w-full">
            <div class="relative">
              <UInput
                v-model="newModel.apiKey"
                :type="showApiKeyInput ? 'text' : 'password'"
                placeholder="Enter your API key"
                class="peer w-full"
              >
                <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                  <span class="inline-flex bg-default px-1">API Key</span>
                </label>
                <template #trailing>
                  <button
                    type="button"
                    class="text-gray-500 hover:text-gray-700 focus:outline-none"
                    @click="showApiKeyInput = !showApiKeyInput"
                  >
                    <div
                      :class="showApiKeyInput ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                      class="size-5"
                      aria-hidden="true"
                    ></div>
                  </button>
                </template>
              </UInput>
            </div>
          </div>

          <div class="relative w-full">
            <UInput
              v-model="newModel.maxConcurrency"
              placeholder="e.g., 50"
              class="peer w-full"
            >
              <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                <span class="inline-flex bg-default px-1">Max Concurrency</span>
              </label>
            </UInput>
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          @click="closeModal"
        />
        <UButton
          label="Submit"
          color="primary"
          @click="addNewModel(close)"
          :loading="isSubmitting"
          loading-auto
          :disabled="!isFormValid"
        />
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Confirm Deletion"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <p>Are you sure you want to delete this model?</p>
        <p class="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
      </template>

      <template #footer="{ close }">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          @click="isDeleteModalOpen = false"
        />
        <UButton
          label="Delete"
          color="error"
          @click="confirmDelete"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useModelStore, type ModelConfig } from '~/stores/modelStore'
resolveComponent('UBadge');
const modelStore = useModelStore()

// Modal and new model related states
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const isDeleteModalOpen = ref(false)
const modelIndexToDelete = ref(-1)
const showApiKeyInput = ref(false)

// Default state for new model
const defaultNewModel = {
  model: '',
  apiBaseurl: 'https://api.openai.com/v1',
  apiKey: '',
  maxConcurrency: '50'
}

// New model data
const newModel = reactive({ ...defaultNewModel })

// Computed property to check if form is valid
const isFormValid = computed(() => {
  return newModel.model && newModel.apiBaseurl && newModel.apiKey
})

// Function to close modal and reset form
function closeModal() {
  isModalOpen.value = false
  showApiKeyInput.value = false
  Object.assign(newModel, defaultNewModel)
}

// Add new model
async function addNewModel(close: () => void) {
  isSubmitting.value = true

  try {
    // Validate input
    if (!isFormValid.value) {
      return
    }

    // Convert maxConcurrency to number
    const modelConfig: ModelConfig = {
      model: newModel.model,
      apiBaseurl: newModel.apiBaseurl,
      apiKey: newModel.apiKey,
      maxConcurrency: parseInt(newModel.maxConcurrency) || 50
    }

    // Add to store
    modelStore.addModel(modelConfig)

    // Reset form
    Object.assign(newModel, defaultNewModel)
    showApiKeyInput.value = false

    // Close Modal
    isModalOpen.value = false
  } finally {
    isSubmitting.value = false
  }
}

// Open delete confirmation modal
function openDeleteModal(index: number) {
  modelIndexToDelete.value = index
  isDeleteModalOpen.value = true
}

// Confirm delete action
function confirmDelete() {
  if (modelIndexToDelete.value >= 0) {
    // Delete the model
    modelStore.deleteModel(modelIndexToDelete.value)

    // Reset index
    modelIndexToDelete.value = -1
  }

  // Close delete modal
  isDeleteModalOpen.value = false
}

// Table column definitions
const columns: TableColumn<ModelConfig>[] = [
  {
    id: 'model',
    accessorKey: 'model',
    header: 'Model Name',
    sortable: true
  },
  {
    id: 'apiBaseurl',
    accessorKey: 'apiBaseurl',
    header: 'API Base URL'
  },
  {
    id: 'apiKey',
    accessorKey: 'apiKey',
    header: 'API Key',
    cell: ({ row }) => {
      const apiKey = row.getValue('apiKey');
      // 使用一个唯一键来存储每行的状态
      const rowId = `apiKey-visibility-${row.index}`;

      // 如果状态不存在，则初始化为false
      if (typeof window !== 'undefined' && !window[rowId]) {
        window[rowId] = false;
      }

      return h('div', { class: 'flex items-center gap-2' }, [
        h('div', {}, window[rowId] && apiKey ? apiKey : (apiKey ? '••••••••' + apiKey.slice(-4) : 'Not Set')),
        apiKey ? h('button', {
          class: 'text-gray-500 hover:text-gray-700 focus:outline-none',
          onClick: () => {
            window[rowId] = !window[rowId];
            // 强制组件重新渲染
            modelStore.$forceUpdate();
          }
        }, [
          h('div', {
            class: window[rowId] ? 'i-lucide-eye-off' : 'i-lucide-eye',
            style: 'width: 20px; height: 20px;'
          })
        ]) : null
      ]);
    }
  },
  {
    id: 'maxConcurrency',
    accessorKey: 'maxConcurrency',
    header: 'Max Concurrency',
    cell: ({ row }) => {
      const value = row.getValue('maxConcurrency');
      return h('div', { class: 'flex justify-start' }, value || 'Not Set')
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      return h('div', { class: 'flex justify-start' }, [
        h(resolveComponent('UButton'), {
          color: 'error',
          variant: 'soft',
          size: 'sm',
          icon: 'i-lucide-trash-2',
          onClick: () => openDeleteModal(row.index)
        }, 'Delete')
      ])
    }
  }
]
</script>
