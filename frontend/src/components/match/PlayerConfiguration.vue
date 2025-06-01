<script setup>
import { MatchService } from '@/service/MatchService';
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

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

const emit = defineEmits(['update:modelValue', 'match-created']);
const router = useRouter();

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

const teamNames = ref([null, null]);

// State for team colors
const teamAColor = ref('#65bc7b');
const teamBColor = ref('#000000');
const isLoadingAPI = ref(false);

function resetPlayerNames() {
  teamAPlayers.value.forEach((player) => (player.name = ''));
  teamBPlayers.value.forEach((player) => (player.name = ''));
  teamNames.value = [null, null];
}

function swapTeams() {
  const tempPlayers = JSON.parse(JSON.stringify(teamAPlayers.value));
  teamAPlayers.value = JSON.parse(JSON.stringify(teamBPlayers.value));
  teamBPlayers.value = tempPlayers;
  
  // Also swap team names 
  const tempNames = [...teamNames.value];
  teamNames.value = [tempNames[1], tempNames[0]];
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
        teamNames: [null, null]
      },
      '2v2': {
        teamA: [{ name: 'Alice' }, { name: 'Charlie' }],
        teamB: [{ name: 'Bob' }, { name: 'Diana' }],
        teamNames: [null, null]
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

onMounted(() => {
  fetchPlayersFromAPI();
  
  // Debug: Test MatchService import
  console.log('MatchService imported successfully:', MatchService);
  console.log('MatchService methods:', Object.getOwnPropertyNames(MatchService));
});

async function startMatch() {
  // Validate that all required fields are filled
  const team1Players = teamAPlayers.value.filter(p => p.name.trim() !== '');
  const team2Players = teamBPlayers.value.filter(p => p.name.trim() !== '');
  
  const requiredPlayersPerTeam = props.playerSetup === '1v1' ? 1 : 2;
  
  if (team1Players.length < requiredPlayersPerTeam || team2Players.length < requiredPlayersPerTeam) {
    alert('Please fill in all player names before starting the match.');
    return;
  }
  
  try {
    console.log('Starting match creation process...');
    
    // Get match configuration from parent component
    console.log('Getting match configuration...');
    let matchConfig;
    try {
      matchConfig = props.getMatchConfiguration();
      console.log('Match configuration:', matchConfig);
    } catch (configError) {
      console.error('Error getting match configuration:', configError);
      throw new Error('Failed to get match configuration: ' + configError.message);
    }
    
    const matchData = {
      playerSetup: props.playerSetup,
      teams: [
        {
          name: teamNames.value[0],
          players: team1Players.map(p => ({ name: p.name, playerId: null })),
          setsWon: 0,
        },
        {
          name: teamNames.value[1],
          players: team2Players.map(p => ({ name: p.name, playerId: null })),
          setsWon: 0,
        },
      ],
      teamColors: [teamAColor.value, teamBColor.value],
      status: 'notStarted',
      ...matchConfig,
    };
    
    console.log('Creating match with data:', matchData);
    console.log('MatchService available:', !!MatchService);
    console.log('MatchService.createMatch available:', !!MatchService?.createMatch);
    
    // Test if MatchService is imported correctly
    if (!MatchService) {
      throw new Error('MatchService is not available');
    }
    
    if (!MatchService.createMatch) {
      throw new Error('MatchService.createMatch method is not available');
    }
    
    // Use MatchService to create match
    console.log('Calling MatchService.createMatch...');
    const response = await MatchService.createMatch(matchData);
    console.log('MatchService response:', response);
    
    if (response && response.success && response.data) {
      console.log('Match created successfully:', response.data);
      
      // Navigate to the new match page
      router.push(`/matches/${response.data._id}`);
    } else {
      console.error('Response indicates failure:', response);
      throw new Error('Failed to create match - response indicates failure');
    }
  } catch (error) {
    console.error('Error starting match:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    alert(`Failed to start match: ${error.message}. Please check the console for details.`);
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
