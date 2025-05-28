// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  runtimeConfig: {
    mysql: {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'your_password',
      database: 'EasyLLMAssess',
    },
  },
})
