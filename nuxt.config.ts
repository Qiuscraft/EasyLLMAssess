// https://nuxt.com/docs/api/configuration/nuxt-config

import tailwindcss from "@tailwindcss/vite";

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
  modules: [
      '@nuxt/ui-pro',
      '@pinia/nuxt',
      '@pinia-plugin-persistedstate/nuxt'
  ],
  pinia: {
    storesDirs: ['./store/**'],
  },
  piniaPersistedstate: {
    storage: 'cookies',
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
