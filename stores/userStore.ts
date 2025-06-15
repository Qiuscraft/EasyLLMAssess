import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

export const useUserStore = defineStore('user', () => {
  // 使用 useStorage 将用户名持久化保存在本地
  const username = useStorage('easyllm-username', '')

  // 设置用户名
  function setUsername(newUsername: string) {
    username.value = newUsername
  }

  return {
    username,
    setUsername
  }
})
