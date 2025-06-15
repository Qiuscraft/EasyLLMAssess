<script setup lang="ts">
import { type CandidateAnswer} from "~/server/types/mysql";
import type {InsertingScoringPoint} from "~/server/types/inserting";

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  answer: {
    type: Object as () => CandidateAnswer,
    required: false,
  },
});

// 添加 emit 以便可以更新 open 状态
const emit = defineEmits(['update:open']);

// 定义关闭 Modal 的函数
function closeModal() {
  emit('update:open', false);
}

const submitAnswer = ref<string>('');

watch(() => props.answer, (newAnswer) => {
  if (newAnswer) {
    submitAnswer.value = newAnswer.content;
    insertingPoints.value = [
      { content: '', score: 1 }
    ];
  }
}, { immediate: true })

const insertingPoints = ref<InsertingScoringPoint[]>([
  { content: '', score: 1 }
]);

// 添加新的评分点
function addInsertingPoint() {
  insertingPoints.value.push({ content: '', score: 1 });
}

// 删除评分点
function removeInsertingPoint(index: number) {
  insertingPoints.value.splice(index, 1);
}

// 计算总分
const totalScore = computed(() => {
  return insertingPoints.value.reduce((sum, point) => sum + point.score, 0);
});

const disabled = computed(() => {
  return insertingPoints.value.some(point => !point.content);
});

const submitting = ref(false);

const toast = useToast()

async function handleSubmit() {
  if (props.answer) {
    submitting.value = true;
    try {
      await $fetch('/api/v1/standard-answer', {
        method: 'POST',
        body: {
          std_question_version_id: props.answer.questionVersion.id,
          answer: submitAnswer.value,
          scoring_points: insertingPoints.value,
        },
      });
      toast.add({
        title: "Standard Answer Submitted Successfully.",
        color: 'success'
      })
      closeModal();
    } catch (error) {
      toast.add({
        title: "Data Import Failed. Please check the file format.",
        description: error.statusMessage,
        color: 'error'
      })
    } finally {
      submitting.value = false;
    }
  }
}
</script>

<template>
  <div v-if="answer">
    <UModal
        :open="open"
        title="Adopt Candidate Answer"
        description="This candidate answer will become a standard answer after your adopting."
        :ui="{
          footer: 'justify-end',
          content: 'max-w-4xl',
        }"
        @update:open="(value) => emit('update:open', value)"
    >
      <template #body>
        <UPageCard title="Question" :description="answer.questionVersion.content" />
        <UPageCard title="Answer">
          <UTextarea v-model="submitAnswer" :rows="1" autoresize class="w-full" />
        </UPageCard>

        <UPageCard title="Scoring Points" description="You should provide scoring points and their scores for this answer.">
          <div class="text-sm text-gray-500">Total Score: {{ totalScore }}</div>

          <div v-for="(point, index) in insertingPoints" :key="index">
            <div class="flex gap-3">
              <UTextarea v-model="point.content" :rows="1" autoresize class="w-full" placeholder="Type scoring point content..." />
              <UInput v-model.number="point.score" type="number" min="0" class="w-24" />
              <UButton
                  v-if="insertingPoints.length > 1"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  @click="removeInsertingPoint(index)"
              />
            </div>
          </div>

          <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-plus"
              class="inline-flex w-auto"
              @click="addInsertingPoint"
          >
            Add Scoring Point
          </UButton>

        </UPageCard>

      </template>

      <template #footer>
        <UButton label="Cancel" color="neutral" variant="outline" @click="closeModal" />
        <UButton label="Submit" color="neutral" :disabled="disabled" :loading="submitting" @click="handleSubmit"/>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
</style>