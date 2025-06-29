require('@/assets/main.scss');

import { createApp } from 'vue'
import App from './App.vue'
import axios from 'axios'
import VueAxios from 'vue-axios'
// import VueI18n from 'vue-i18n'
import i18n from './i18n'

const app = createApp(App).use(i18n)

// app.use(VueI18n)

app.use(VueAxios, axios)

app.provide('axios', app.config.globalProperties.axios)

app.mount('#app')

