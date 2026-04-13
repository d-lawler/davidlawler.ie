export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',

  future: {
    compatibilityVersion: 4,
  },

  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  css: ['~/assets/scss/main.scss'],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/variables" as *;',
        },
      },
    },
  },

  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
  ],

  eslint: {
    config: {
      standalone: false,
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})
