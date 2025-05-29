<script setup lang="ts">
const props = defineProps(['std_questions'])
</script>

<template>
  <UPageCard title="Standard Questions">
    <UPageCard
        v-for="sq in props.std_questions.original.stdQuestions"
        :title="`Standard Question #${sq.id}: ${sq.content}`"
        :description="`Standard Answer: ${sq.answer}`"
    >
      <UTable
          :data="sq.points"
          :columns="[
                  {
                    accessorKey: 'content',
                    header: 'Point',
                    cell: ({ row }) => row.getValue('content')
                  },
                  {
                    accessorKey: 'score',
                    header: 'Score',
                    cell: ({ row }) => row.getValue('score')
                  }
                ]"
      />
    </UPageCard>
  </UPageCard>
</template>

<style scoped>

</style>