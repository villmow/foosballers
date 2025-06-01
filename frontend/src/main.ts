import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import Aura from '@primeuix/themes/aura';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

import '@/assets/styles.scss';
import { setupAuthGuards } from '@/composables/useAuth';
import { useAuthStore } from '@/stores/auth';
import { useMatchConfigStore } from '@/stores/matchConfig';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.app-dark'
        }
    }
});
app.use(ToastService);
app.use(ConfirmationService);

// Initialize stores after Pinia is set up
const authStore = useAuthStore();
const matchConfigStore = useMatchConfigStore();

authStore.initialize();
matchConfigStore.initialize();

setupAuthGuards(router);

// socket.on('connect', () => {
//   sendMessage({ user: 'system', message: 'Hello from frontend!', timestamp: Date.now() });
// });

app.mount('#app');
