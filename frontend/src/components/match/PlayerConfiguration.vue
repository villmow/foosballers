<script setup>
import { ref, watch } from 'vue';

// Props for configuration
const props = defineProps({
  playerSetup: {
    type: String,
    default: '2v2',
  },
  getMatchConfiguration: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue', 'match-started']);

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
const isLoadingAPI = ref(false);

function resetPlayerNames() {
  teamAPlayers.value.forEach((player) => (player.name = ''));
  teamBPlayers.value.forEach((player) => (player.name = ''));
  teamNames.value = ['Team A', 'Team B'];
}

function swapTeams() {
  const tempPlayers = JSON.parse(JSON.stringify(teamAPlayers.value));
  teamAPlayers.value = JSON.parse(JSON.stringify(teamBPlayers.value));
  teamBPlayers.value = tempPlayers;
  
  // Also swap team names and colors
  const tempNames = [...teamNames.value];
  teamNames.value = [tempNames[1], tempNames[0]];
  
  const tempColor = teamAColor.value;
  teamAColor.value = teamBColor.value;
  teamBColor.value = tempColor;
}

async function fetchPlayersFromAPI() {
  try {
    isLoadingAPI.value = true;
    // Simulate API call with default/example players
    // In a real implementation, this would call: GET /api/players/recent or similar
    console.log('Fetching players from API...');
    
    // Default player names based on current setup
    const defaultPlayers = {
      '1v1': {
        teamA: [{ name: 'Alice' }],
        teamB: [{ name: 'Bob' }],
        teamNames: ['Red Team', 'Blue Team']
      },
      '2v2': {
        teamA: [{ name: 'Alice' }, { name: 'Charlie' }],
        teamB: [{ name: 'Bob' }, { name: 'Diana' }],
        teamNames: ['Red Team', 'Blue Team']
      }
    };
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const currentSetup = props.playerSetup;
    const defaults = defaultPlayers[currentSetup];
    
    if (defaults) {
      teamAPlayers.value = [...defaults.teamA];
      teamBPlayers.value = [...defaults.teamB];
      teamNames.value = [...defaults.teamNames];
      
      // // Also set some default colors
      // teamAColor.value = '#e74c3c'; // Red
      // teamBColor.value = '#3498db'; // Blue
    }
    
    console.log('Players populated from API');
  } catch (error) {
    console.error('Failed to fetch players from API:', error);
  } finally {
    isLoadingAPI.value = false;
  }
}

async function startMatch() {
  // Validate that all required fields are filled
  const team1Players = teamAPlayers.value.filter(p => p.name.trim() !== '');
  const team2Players = teamBPlayers.value.filter(p => p.name.trim() !== '');
  
  const requiredPlayersPerTeam = props.playerSetup === '1v1' ? 1 : 2;
  
  if (team1Players.length < requiredPlayersPerTeam || team2Players.length < requiredPlayersPerTeam) {
    alert('Please fill in all player names before starting the match.');
    return;
  }
  
  if (!teamNames.value[0].trim() || !teamNames.value[1].trim()) {
    alert('Please provide team names before starting the match.');
    return;
  }
  
  try {
    // Get match configuration from parent component
    const matchConfig = props.getMatchConfiguration();
    
    const matchData = {
      playerSetup: props.playerSetup,
      teams: [
        {
          name: teamNames.value[0],
          color: teamAColor.value,
          players: team1Players.map(p => ({ name: p.name, playerId: null })), // Assuming playerId can be null initially
        },
        {
          name: teamNames.value[1],
          color: teamBColor.value,
          players: team2Players.map(p => ({ name: p.name, playerId: null })), // Assuming playerId can be null initially
        },
      ],
      ...matchConfig, // Spread the match configuration
      // Get user ID from context or store
    };
    
    console.log('Creating match with data:', matchData);
    
    // TODO: Call API to create match
    const response = await fetch('/api/matches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(matchData),
    });
    
    if (response.ok) {
      const match = await response.json();
      
      // Start the match
      const startResponse = await fetch(`/api/matches/${match.id}/start`, {
        method: 'POST',
      });
      
      if (startResponse.ok) {
        emit('match-started', match.id);
      } else {
        console.error('Failed to start match');
      }
    } else {
      console.error('Failed to create match');
    }
  } catch (error) {
    console.error('Error starting match:', error);
    alert('Failed to start match. Please try again.');
  }
}

function cancelMatch() {
  // Reset form or navigate back to dashboard
  resetPlayerNames();
}
</script>

<template>
  <div class="card flex flex-col gap-6 w-full max-w-xl mx-auto">
    <div class="flex items-center gap-6 font-semibold text-2xl mb-2">
        <span>Setup New Match</span>
        <Button
            :label="isLoadingAPI ? 'Loading...' : 'Fetch from API'"
            :icon="isLoadingAPI ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"
            :disabled="isLoadingAPI"
            severity="secondary"
            text
            @click="fetchPlayersFromAPI"
        />
    </div>

    <div class="text-sm text-gray-600">
      Mode: {{ props.playerSetup === '1v1' ? 'Singles' : 'Doubles' }}
    </div>

    <div class="flex flex-col gap-4">
      <div
        v-for="(team, tIdx) in [teamAPlayers, teamBPlayers]"
        :key="tIdx"
        class="flex flex-col gap-2"
      >
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <input
              v-model="teamNames[tIdx]"
              type="text"
              class="font-semibold text-lg border-b border-gray-300 bg-transparent focus:outline-none focus:border-blue-500"
              :placeholder="`Team ${tIdx + 1}`"
            />
          </div>
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
      <Button label="Start Match" icon="pi pi-play" severity="primary" @click="startMatch" />
      <Button label="Cancel" icon="pi pi-times" severity="secondary" outlined @click="cancelMatch" />
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
