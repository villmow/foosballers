<script setup>
import { useLayout } from '@/layout/composables/layout';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import { onMounted, ref } from 'vue';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();

const username = ref('User');
const nestedMenuitems = ref([]);
const menu = ref();
const items = ref([
    {
        label: 'Settings',
        icon: 'pi pi-fw pi-cog',
    },
    {
        label: 'Logout',
        icon: 'pi pi-fw pi-file',
        command: () => {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = '/auth/login';
        }
    },
]);

function toggle(event) {
    menu.value.toggle(event);
}

onMounted(() => {
    // Get the user's name from local storage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    username.value = user.name || user.username || 'User';
    
    // Update the menu items with the user's name
    nestedMenuitems.value = [
        {
            label: 'Settings',
            icon: 'pi pi-fw pi-cog',
            command: () => {
                // Handle settings click
            }
        },
        {
            label: 'Logout',
            icon: 'pi pi-fw pi-file',
            command: () => {
                // Remove user from local storage
                localStorage.removeItem('user');
                // Optionally remove token if stored separately
                localStorage.removeItem('token');
                // Redirect to login page
                window.location.href = '/login';
            }
        }
    ];
});
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/" class="layout-topbar-logo">
                <span>FOOSBALLER</span>
            </router-link>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu flex items-center">
                <button type="button" class="layout-topbar-action" @click="toggleDarkMode">
                    <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
                </button>
            </div>
            <div class="layout-topbar-menu hidden lg:block flex items-center">
                <div class="layout-topbar-menu-content">
                    <Button 
                        icon="pi pi-user" 
                        severity="contrast"
                        rounded 
                        outlined 
                        aria-label="User" 
                        @click="toggle" 
                        aria-haspopup="true" 
                        aria-controls="overlay_menu" 
                    />
                    <Menu ref="menu" id="overlay_menu" :model="items" :popup="true" />
                </div>
            </div>
        </div>  
    </div>
</template>

<style lang="scss" scoped>
:deep(.p-menubar) {
    border: none;
    background: transparent;
    box-shadow: none;
}

:deep(.p-menubar-root-list) {
    background: transparent;

}

:deep(.p-menu) {
    /* Right-align only the dropdown popup */
    position: absolute;
    right: 0;
    left: auto;
    inset-inline-end: 0;
}

.layout-topbar-actions {
    display: flex;
    align-items: center;
}

.layout-topbar-menu,
.layout-config-menu {
    display: flex;
    align-items: center;
}

.layout-topbar-menu-content {
    position: relative;
}

</style>
