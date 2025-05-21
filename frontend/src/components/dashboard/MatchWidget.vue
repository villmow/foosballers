<script setup>
import { ref, watch } from 'vue';

// Props for configuration
const props = defineProps({
  playerSetup: {
    type: String,
    default: '2v2',
  },
});

// State for player names
const teamAPlayers = ref([
  { name: '' },
  { name: '' },
]);
const teamBPlayers = ref([
  { name: '' },
]);

// Adjust player slots based on playerSetup
watch(
  () => props.playerSetup,
  (setup) => {
    if (setup === '1v1') {
      teamAPlayers.value = [{ name: '' }];
      teamBPlayers.value = [{ name: '' }];
    } else {
      teamAPlayers.value = [{ name: '' }, { name: '' }];
      teamBPlayers.value = [{ name: '' }, { name: '' }];
    }
  },
  { immediate: true }
);

const teamNames = ref(['Team A', 'Team B']);

// State for team colors
const teamAColor = ref('#65bc7b');
const teamBColor = ref('#000000');

function resetPlayerNames() {
  teamAPlayers.value.forEach((player) => (player.name = ''));
  teamBPlayers.value.forEach((player) => (player.name = ''));
}

function swapTeams() {
  const tempPlayers = JSON.parse(JSON.stringify(teamAPlayers.value));
  teamAPlayers.value = JSON.parse(JSON.stringify(teamBPlayers.value));
  teamBPlayers.value = tempPlayers;
}
</script>

<template>
  <div class="card flex flex-col gap-6 w-full max-w-xl mx-auto">
    <div class="flex items-center gap-6 font-semibold text-2xl mb-2">
        <span>Players</span>
        <Button
            label="API"
            icon="pi pi-refresh"
            severity="secondary"
            text
        />
    </div>

    <div class="flex flex-col gap-4">
      <div
        v-for="(team, tIdx) in [teamAPlayers, teamBPlayers]"
        :key="tIdx"
        class="flex flex-col gap-2"
      >
        <div class="flex items-center gap-4">
          <div class="font-semibold text-lg">{{ teamNames[tIdx] }}</div>
          <div class="flex items-center gap-2">
            <ColorPicker
              v-if="tIdx === 0"
              v-model="teamAColor"
              style="width: 2rem"
            />
            <ColorPicker
              v-else
              v-model="teamBColor"
              style="width: 2rem"
            />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div
            v-for="(player, pIdx) in team"
            :key="pIdx"
            class="flex flex-row items-center gap-2"
          >
            <label :for="`player-${tIdx}-${pIdx}`" class="w-20"
              >Player {{ pIdx + 1 }}</label
            >
            <input
              :id="`player-${tIdx}-${pIdx}`"
              v-model="team[pIdx].name"
              type="text"
              class="input input-bordered w-full max-w-xs"
              placeholder="Enter name"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="flex gap-4 mt-4">
      <Button label="Start" icon="pi pi-play" severity="primary" />
      <Button
        label="Reset"
        icon="pi pi-refresh"
        severity="danger"
        @click="resetPlayerNames"
        outlined
      />
      <Button
        label="Swap"
        icon="pi pi-sync"
        severity="secondary"
        @click="swapTeams"
        outlined
      />
    </div>
  </div>
</template>

<style scoped>
.input {
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
}
</style>
