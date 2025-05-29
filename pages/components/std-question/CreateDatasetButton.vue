<script setup lang="ts">
const props = defineProps(['id_list'])
const emit = defineEmits(['submit'])

const open = ref(false)
const loading = ref(false)

const toast = useToast()

async function handleSubmit() {
  loading.value = true
  try {
    await $fetch('/api/v1/dataset', {
      method: 'POST',
      body: {
        dataset_name: name.value,
        version_name: version.value,
        std_questions: props.id_list,
      }
    });
    toast.add({
      title: `Dataset ${name.value}-${version.value} created successfully!`,
      color: 'success'
    });
    name.value = '';
    version.value = '1.0';
    open.value = false;
    emit('submit');
  } catch (error) {
    toast.add({
      title: "Dataset creation failed",
      description: (error as Error).message,
      color: 'error'
    })
  }
  loading.value = false
}

const name = ref('')
const version = ref('1.0')

</script>
<template>
  <UModal v-model:open="open" title="Create Dataset" :ui="{ footer: 'justify-end' }" >
    <UButton label="Create Dataset with Selected Questions" color="neutral" variant="subtle" :disabled="props.id_list.length === 0" />

    <template #body>
      <UInput v-model="name" placeholder="" :ui="{ base: 'peer' }">
        <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
          <span class="inline-flex bg-default px-1">Dataset Name</span>
        </label>
      </UInput>
      <UInput v-model="version" placeholder="" :ui="{ base: 'peer' }">
        <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
          <span class="inline-flex bg-default px-1">Dataset Version</span>
        </label>
      </UInput>
    </template>

    <template #footer>
      <UButton label="Cancel" color="neutral" variant="outline" @click="open = false" />
      <UButton label="Submit" color="neutral" :disabled="props.id_list.length === 0 || loading || version === '' || name === ''" :loading="loading" @click="handleSubmit" />
    </template>
  </UModal>
</template>
