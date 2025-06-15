<script setup lang="ts">
import type { StdQuestion, StdQuestionVersion } from "~/server/types/mysql";
import { useUserStore } from "~/stores/userStore";

const props = defineProps({
  question: {
    type: Object as () => StdQuestion & { currentVersion?: StdQuestionVersion },
    required: true
  }
});
const toast = useToast();
const userStore = useUserStore();

const open = ref(false);
const username = ref('')
const answer = ref('')
const submitting = ref(false);

// 监听open变化，确保在打开对话框时设置用户名
watch(open, (newValue) => {
  if (newValue) {
    // 打开对话框时自动填充已保存的用户名
    username.value = userStore.username || '';
  }
}, { immediate: true });

// 获取当前版本
const currentVersion = computed(() => {
  return props.question.currentVersion ||
    (props.question.versions && props.question.versions.length > 0 ? props.question.versions[0] : null);
});

const close = () => {
  open.value = false;
  handleOpenChange(false);
}

const handleOpenChange = (value: boolean) => {
  if (value) {
    // 打开对话框时自动填充已保存的用户名
    username.value = userStore.username || '';
  } else {
    // 重置答案，但保留用户名
    answer.value = '';
  }
}

const handleSubmit = async () => {
  if (!currentVersion.value) {
    toast.add({
      title: "Error",
      description: "No question version found",
      color: 'error',
    });
    return;
  }

  submitting.value = true;
  try {
    await $fetch('/api/v1/candidate-answer', {
      method: 'POST',
      body: {
        std_question_version_id: currentVersion.value.id,
        username: username.value,
        answer: answer.value,
      }
    });
    toast.add({
      title: "Answer Submitted Successfully",
      color: 'success',
    });
  } catch (error) {
    toast.add({
      title: "Answer Submitted Failed. Please contact support.",
      description: error instanceof Error ? error.message : "Unknown error",
      color: 'error',
    });
  } finally {
    submitting.value = false;
    close();
  }
}
</script>

<template>
  <UButton label="Submit Answer" color="neutral" variant="subtle" @click="open = true" />

  <UModal
    v-model:open="open"
    :title="`Submit Your Answer`"
    :description="currentVersion?.content || 'No question content available'"
    :ui="{ footer: 'justify-end' }"
    @update:open="handleOpenChange"
  >
    <template #body>
      <UInput v-model="username" placeholder="" :ui="{ base: 'peer' }" class="w-full">
        <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
          <span class="inline-flex bg-default px-1">Username</span>
        </label>
      </UInput>
      <UTextarea v-model="answer" autoresize placeholder="Answer" :ui="{ base: 'peer' }" class="w-full">
        <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
          <span class="inline-flex bg-default px-1">Answer</span>
        </label>
      </UTextarea>
    </template>

    <template #footer>
      <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
      <UButton label="Submit" color="neutral" :disabled="!username || !answer || submitting" @click="handleSubmit" />
    </template>
  </UModal>
</template>

<style scoped>

</style>