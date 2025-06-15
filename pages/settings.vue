<template>
  <div class="p-4">
    <!-- 用户名设置 -->
    <UCard class="w-full mb-6">
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">User Settings</h2>
        </div>
      </template>
      <div class="p-4">
        <div class="relative w-full max-w-sm">
          <UInput
            v-model="username"
            placeholder="Enter your username"
            class="peer w-full"
          >
            <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
              <span class="inline-flex bg-default px-1">Username</span>
            </label>
          </UInput>
        </div>
        <UButton
          class="mt-4"
          color="primary"
          :disabled="!username"
          @click="saveUsername"
        >
          Save Username
        </UButton>
      </div>
    </UCard>

    <!-- 模型配置标题 -->
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
import { useUserStore } from '~/stores/userStore'
resolveComponent('UBadge');
const modelStore = useModelStore()
const userStore = useUserStore()

// 用户名设置
const username = ref(userStore.username)
const toast = useToast()

// 保存用户名
function saveUsername() {
  if (username.value.trim()) {
    userStore.setUsername(username.value.trim())
    toast.add({
      title: '用户名已保存',
      color: 'success'
    })
  }
}

// Modal and new model related states
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const isDeleteModalOpen = ref(false)
const modelIndexToDelete = ref(-1)
const showApiKeyInput = ref(false)

// 用于存储每行API Key的可见性状态
const apiKeyVisibility = reactive({})

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

// Function to toggle API Key visibility
function toggleApiKeyVisibility(index) {
  apiKeyVisibility[index] = !apiKeyVisibility[index]
}

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
      const index = row.index;

      return h('div', { class: 'flex items-center gap-2' }, [
        h('div', {}, apiKeyVisibility[index] && apiKey ? apiKey : (apiKey ? '••••••••' + apiKey.slice(-4) : 'Not Set')),
        apiKey ? h('button', {
          class: 'text-gray-500 hover:text-gray-700 focus:outline-none',
          onClick: () => toggleApiKeyVisibility(index)
        }, [
          h('span', {}, apiKeyVisibility[index] ?
            // 使用SVG而不是图标类
            h('svg', {
              xmlns: 'http://www.w3.org/2000/svg',
              width: '20',
              height: '20',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round'
            }, [
              h('path', { d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' }),
              h('line', { x1: '1', y1: '1', x2: '23', y2: '23' })
            ]) :
            h('svg', {
              xmlns: 'http://www.w3.org/2000/svg',
              width: '20',
              height: '20',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round'
            }, [
              h('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
              h('circle', { cx: '12', cy: '12', r: '3' })
            ])
          )
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
