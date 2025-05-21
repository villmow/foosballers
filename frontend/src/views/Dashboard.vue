<script setup>
import MatchCreationWidget from '@/components/dashboard/MatchConfigurationWidget.vue';
import MatchWidget from '@/components/dashboard/MatchWidget.vue';
import { ref } from 'vue';

const playerSetup = ref('2v2');
</script>

<template>
  <div class="flex flex-row justify-center items-start gap-8 min-h-[60vh]">
    <MatchWidget :playerSetup="playerSetup" />
    <MatchCreationWidget v-model="playerSetup" />
  </div>
</template>
