<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AssessmentImportButton from '~/components/assessments/AssessmentImportButton.vue'

interface ScoreProcess {
  id: number
  type: string
  description: string
  score: number
  scoring_point_content: string
  model_answer_id: number
}

interface ModelAnswer {
  id: number
  content: string
  total_score: number
  std_question_version_id: number
  assessment_id: number
  score_processes?: ScoreProcess[]
}

interface Assessment {
  id: number
  model: string
  total_score: number
  dataset_version_id: number
  model_answers?: ModelAnswer[]
}

const assessments = ref<Assessment[]>([])
const loading = ref(false)
const expandedAssessments = ref<Set<number>>(new Set())

// Load assessment list
async function fetchAssessments() {
  loading.value = true
  try {
    const response = await $fetch('/api/v1/assessment')
    assessments.value = response
  } catch (error) {
    console.error('Failed to fetch assessments', error)
  } finally {
    loading.value = false
  }
}

// Toggle expand/collapse state
function toggleExpand(id: number) {
  if (expandedAssessments.value.has(id)) {
    expandedAssessments.value.delete(id)
  } else {
    expandedAssessments.value.add(id)
  }
}

// Load assessment details
async function loadAssessmentDetails(assessment: Assessment) {
  if (!assessment.model_answers && expandedAssessments.value.has(assessment.id)) {
    try {
      const response = await $fetch(`/api/v1/assessment/${assessment.id}`)
      const index = assessments.value.findIndex(a => a.id === assessment.id)
      if (index !== -1) {
        assessments.value[index] = response
      }
    } catch (error) {
      console.error('Failed to fetch assessment details', error)
    }
  }
}

// Refresh list after successful import
function handleImportSuccess() {
  fetchAssessments()
}

onMounted(() => {
  fetchAssessments()
})
</script>

<template>
  <div>
    <!-- Page title and import button -->
    <div class="flex justify-between items-center p-4 border-b">
      <h1 class="text-2xl font-semibold">Assessment Management</h1>
      <AssessmentImportButton @import-success="handleImportSuccess" />
    </div>

    <!-- Assessment list -->
    <div class="p-4">
      <!-- Loading state -->
      <ULoadingBlock v-if="loading" class="h-32" />

      <!-- Empty state -->
      <UAlert
        v-else-if="assessments.length === 0"
        title="No assessments available"
        description="Click the import button in the top right corner to add assessment data"
        color="info"
        class="mt-4"
        icon="i-heroicons-information-circle"
      />

      <!-- Assessment list card -->
      <UCard
        v-else
        class="mt-4"
      >
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-medium">Assessment List</h2>
          </div>
        </template>

        <UTable
          :columns="[
            { key: 'id', label: 'ID' },
            { key: 'model', label: 'Model' },
            { key: 'total_score', label: 'Total Score' },
            { key: 'dataset_version_id', label: 'Dataset Version' },
            { key: 'actions', label: 'Actions' }
          ]"
          :rows="assessments"
          class="w-full"
        >
          <template #actions-data="{ row }">
            <UButton
              size="sm"
              variant="ghost"
              :icon="expandedAssessments.has(row.id) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              @click="toggleExpand(row.id); loadAssessmentDetails(row)"
            >
              {{ expandedAssessments.has(row.id) ? 'Collapse' : 'Details' }}
            </UButton>
          </template>
        </UTable>

        <!-- Expanded details -->
        <div
          v-for="assessment in assessments"
          :key="assessment.id"
          v-show="expandedAssessments.has(assessment.id)"
          class="mt-2 p-3 border-t bg-gray-50"
        >
          <div v-if="!assessment.model_answers" class="flex justify-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-gray-400" />
            <span class="ml-2 text-sm text-gray-500">Loading...</span>
          </div>

          <div v-else-if="assessment.model_answers.length === 0" class="text-sm text-gray-500 py-2">
            This assessment has no model answer data
          </div>

          <div v-else class="space-y-4">
            <h3 class="text-md font-medium">Model Answers ({{ assessment.model_answers.length }})</h3>

            <UAccordion v-for="answer in assessment.model_answers" :key="answer.id" :items="[
              {
                label: `Question ID: ${answer.std_question_version_id} - Score: ${answer.total_score}`,
                slot: 'answer-' + answer.id,
                defaultOpen: false
              }
            ]">
              <template #answer-{{ answer.id }}>
                <div class="p-2">
                  <div class="border p-3 rounded bg-white mb-3">
                    <p class="whitespace-pre-wrap text-sm">{{ answer.content }}</p>
                  </div>

                  <h4 class="text-sm font-medium mb-2">Scoring Process</h4>
                  <div v-if="answer.score_processes && answer.score_processes.length > 0">
                    <UTable
                      :columns="[
                        { key: 'type', label: 'Type' },
                        { key: 'score', label: 'Score' },
                        { key: 'scoring_point_content', label: 'Scoring Point' },
                        { key: 'description', label: 'Description' }
                      ]"
                      :rows="answer.score_processes"
                      class="w-full text-sm"
                    />
                  </div>
                  <div v-else class="text-sm text-gray-500">
                    No scoring data available
                  </div>
                </div>
              </template>
            </UAccordion>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<style scoped>
/* Custom styles */
</style>