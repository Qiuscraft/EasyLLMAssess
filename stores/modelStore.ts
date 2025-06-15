import { defineStore } from 'pinia'

export interface ModelConfig {
  apiBaseurl: string
  apiKey: string
  model: string
  maxConcurrency: number
}

export const useModelStore = defineStore('model', {
  state: () => ({
    models: [] as ModelConfig[]
  }),
  actions: {
    addModel(model: ModelConfig) {
      this.models.push(model)
    },
    updateModel(index: number, model: ModelConfig) {
      if (index >= 0 && index < this.models.length) {
        this.models[index] = model
      }
    },
    deleteModel(index: number) {
      if (index >= 0 && index < this.models.length) {
        this.models.splice(index, 1)
      }
    }
  },
  persist: {
    enabled: true
  }
})
