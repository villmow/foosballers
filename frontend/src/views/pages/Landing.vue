<script setup lang="ts">
import FeaturesWidget from '@/components/landing/FeaturesWidget.vue';
import FooterWidget from '@/components/landing/FooterWidget.vue';
import HeroWidget from '@/components/landing/HeroWidget.vue';
import HighlightsWidget from '@/components/landing/HighlightsWidget.vue';
import PricingWidget from '@/components/landing/PricingWidget.vue';
import { useAuth } from '@/composables/useAuth';

// @ts-ignore
import TopbarWidget from '@/components/landing/TopbarWidget.vue';

const { isAuthenticated } = useAuth();
</script>

<template>
    <div class="bg-surface-0 dark:bg-surface-900">
        <div id="home" class="landing-wrapper overflow-hidden">
            <div class="py-6 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static">
                <TopbarWidget />
            </div>
            <HeroWidget />
            <FeaturesWidget />
            <HighlightsWidget />
            <PricingWidget />
            <FooterWidget />
            <div v-if="!isAuthenticated" class="fixed bottom-8 right-8 z-50">
                <router-link to="/auth/login">
                    <button class="bg-primary text-white px-6 py-3 rounded-lg shadow-lg text-xl font-bold hover:bg-primary-700 transition">
                        Login to get started
                    </button>
                </router-link>
            </div>
            <div v-else class="fixed bottom-8 right-8 z-50">
                <router-link to="/">
                    <button class="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg text-xl font-bold hover:bg-green-700 transition">
                        Go to Dashboard
                    </button>
                </router-link>
            </div>
        </div>
    </div>
</template>
