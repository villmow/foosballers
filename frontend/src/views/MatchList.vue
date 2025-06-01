<script setup>
import MatchConfiguration from '@/components/match/MatchConfiguration.vue';
import PlayerConfiguration from '@/components/match/PlayerConfiguration.vue';
import { useMatchConfig } from '@/composables/useMatchConfig';
import { MatchService } from '@/service/MatchService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const { getConfigWithUserId } = useMatchConfig();
const dt = ref();
const matches = ref([]);
const matchDialog = ref(false);
const deleteMatchDialog = ref(false);
const deleteMatchesDialog = ref(false);
const match = ref({});
const selectedMatches = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);
const showPlayerConfig = ref(false);

const statuses = ref([
    { label: 'NOT_STARTED', value: 'notStarted' },
    { label: 'IN_PROGRESS', value: 'inProgress' },
    { label: 'COMPLETED', value: 'completed' },
    { label: 'ABORTED', value: 'aborted' }
]);

// Load matches on component mount
onMounted(async () => {
    await loadMatches();
});

async function loadMatches() {
    try {
        const response = await MatchService.getMatches();
        
        if (response.success && response.data) {
            // Map backend data to component format
            matches.value = response.data.matches.map(match => ({
                id: match._id,
                teams: match.teams || [],
                status: match.status,
                createdAt: match.createdAt ? new Date(match.createdAt) : new Date(),
                updatedAt: match.updatedAt ? new Date(match.updatedAt) : new Date(),
                startTime: match.startTime ? new Date(match.startTime) : null,
                endTime: match.endTime ? new Date(match.endTime) : null,
                duration: match.duration || null,
                matchConfiguration: {
                    playerSetup: match.playerSetup,
                    numGoalsToWin: match.numGoalsToWin,
                    numSetsToWin: match.numSetsToWin,
                    name: match.name
                }
            }));
        } else {
            matches.value = [];
        }
    } catch (error) {
        console.error('Error loading matches:', error);
        if (error.message.includes('401') || error.message.includes('Authentication')) {
            toast.add({ 
                severity: 'warn', 
                summary: 'Authentication Required', 
                detail: 'Please log in to view matches', 
                life: 3000 
            });
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load matches', life: 3000 });
        }
        matches.value = [];
    }
}

function openNew() {
    match.value = {};
    submitted.value = false;
    showPlayerConfig.value = false;
    matchDialog.value = true;
}

function hideDialog() {
    matchDialog.value = false;
    showPlayerConfig.value = false;
    submitted.value = false;
}

function proceedToPlayerConfig() {
    if (validateMatchConfiguration()) {
        showPlayerConfig.value = true;
    }
}

function validateMatchConfiguration() {
    // Basic validation for match configuration
    return true; // Will be implemented based on MatchConfiguration component requirements
}

function getMatchConfiguration() {
    return getConfigWithUserId();
}

async function saveMatch() {
    submitted.value = true;
    
    try {
        // Note: Match creation is handled by PlayerConfiguration component
        // This function is kept for potential future use with editing
        hideDialog();
        toast.add({ severity: 'info', summary: 'Info', detail: 'Match creation is handled by the player configuration step', life: 3000 });
    } catch (error) {
        console.error('Error in saveMatch:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'An error occurred', life: 3000 });
    }
}

function editMatch(matchData) {
    match.value = { ...matchData };
    matchDialog.value = true;
}

function viewMatch(matchData) {
    router.push({ name: 'match', params: { matchId: matchData.id } });
}

function confirmDeleteMatch(matchData) {
    match.value = matchData;
    deleteMatchDialog.value = true;
}

async function deleteMatch() {
    try {
        const response = await MatchService.deleteMatch(match.value.id);
        
        if (response.success) {
            matches.value = matches.value.filter((val) => val.id !== match.value.id);
            deleteMatchDialog.value = false;
            match.value = {};
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Match Deleted', life: 3000 });
        } else {
            throw new Error('Failed to delete match');
        }
    } catch (error) {
        console.error('Error deleting match:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete match', life: 3000 });
    }
}

function createId() {
    let id = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function exportCSV() {
    dt.value.exportCSV();
}

function confirmDeleteSelected() {
    deleteMatchesDialog.value = true;
}

async function deleteSelectedMatches() {
    try {
        const matchIds = selectedMatches.value.map(match => match.id);
        
        // Use bulk delete if available, otherwise delete individually
        const deletePromises = matchIds.map(id => MatchService.deleteMatch(id));
        
        const results = await Promise.allSettled(deletePromises);
        const successfulDeletes = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
        const failedDeletes = results.length - successfulDeletes;
        
        if (successfulDeletes > 0) {
            matches.value = matches.value.filter((val) => !selectedMatches.value.includes(val));
            deleteMatchesDialog.value = false;
            selectedMatches.value = null;
            toast.add({ 
                severity: 'success', 
                summary: 'Successful', 
                detail: `${successfulDeletes} match(es) deleted${failedDeletes > 0 ? `, ${failedDeletes} failed` : ''}`, 
                life: 3000 
            });
        } else {
            throw new Error('Failed to delete any matches');
        }
    } catch (error) {
        console.error('Error deleting matches:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete matches', life: 3000 });
    }
}

function getStatusLabel(status) {
    switch (status) {
        case 'completed':
            return 'success';
        case 'inProgress':
            return 'info';
        case 'notStarted':
            return 'warn';
        case 'aborted':
            return 'danger';
        default:
            return null;
    }
}

function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
}

function formatTeamA(teams) {
    if (!teams || !teams[0]) return 'Team A';
    const team = teams[0];
    if (team.players && team.players.length > 0) {
        return team.players.map(player => player.name).join(' / ');
    }
    return team.name || 'Team A';
}

function formatTeamB(teams) {
    if (!teams || !teams[1]) return 'Team B';
    const team = teams[1];
    if (team.players && team.players.length > 0) {
        return team.players.map(player => player.name).join(' / ');
    }
    return team.name || 'Team B';
}

function formatScore(match) {
    if (!match.teams || match.teams.length < 2) return 'N/A';
    return `${match.teams[0].setsWon || 0} - ${match.teams[1].setsWon || 0}`;
}

function formatDuration(match) {
    if (!match.startTime || !match.endTime) return 'N/A';
    const duration = match.duration || (new Date(match.endTime).getTime() - new Date(match.startTime).getTime()) / 1000;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}m ${seconds}s`;
}

async function onMatchCreated(matchData) {
    // Handle match creation from PlayerConfiguration component
    hideDialog();
    // Reload matches to get the latest data from the server
    await loadMatches();
    toast.add({ severity: 'success', summary: 'Success', detail: 'Match created successfully!', life: 3000 });
}
</script>

<template>
    <div>
        <div class="card">
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Create New Match" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                    <Button label="Delete" icon="pi pi-trash" severity="secondary" @click="confirmDeleteSelected" :disabled="!selectedMatches || !selectedMatches.length" />
                </template>

                <template #end>
                    <Button label="Export" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:selection="selectedMatches"
                :value="matches"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                :globalFilterFields="['teams']"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} matches"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">All Matches</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Search matches..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                <Column header="Team A" sortable style="min-width: 16rem">
                    <template #body="slotProps">
                        {{ formatTeamA(slotProps.data.teams) }}
                    </template>
                </Column>
                <Column header="Team B" sortable style="min-width: 16rem">
                    <template #body="slotProps">
                        {{ formatTeamB(slotProps.data.teams) }}
                    </template>
                </Column>
                <Column header="Score" style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ formatScore(slotProps.data) }}
                    </template>
                </Column>
                <Column field="status" header="Status" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.status.toUpperCase()" :severity="getStatusLabel(slotProps.data.status)" />
                    </template>
                </Column>
                <Column field="createdAt" header="Date" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.createdAt) }}
                    </template>
                </Column>
                <Column header="Duration" style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ formatDuration(slotProps.data) }}
                    </template>
                </Column>
                <Column :exportable="false" style="min-width: 16rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-eye" outlined rounded class="mr-2" @click="viewMatch(slotProps.data)" v-tooltip.top="'View Match'" />
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editMatch(slotProps.data)" v-tooltip.top="'Edit Match'" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteMatch(slotProps.data)" v-tooltip.top="'Delete Match'" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Create/Edit Match Dialog -->
        <Dialog v-model:visible="matchDialog" :style="{ width: '600px' }" header="Match Configuration" :modal="true">
            <div v-if="!showPlayerConfig">
                <MatchConfiguration />
                
                <div class="flex justify-end gap-2 mt-6">
                    <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                    <Button label="Next: Configure Players" icon="pi pi-arrow-right" @click="proceedToPlayerConfig" />
                </div>
            </div>
            
            <div v-else>
                <PlayerConfiguration 
                    :playerSetup="getConfigWithUserId().playerSetup || '2v2'"
                    :getMatchConfiguration="getMatchConfiguration"
                    @match-created="onMatchCreated"
                />
                
                <div class="flex justify-end gap-2 mt-6">
                    <Button label="Back" icon="pi pi-arrow-left" text @click="showPlayerConfig = false" />
                    <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                </div>
            </div>
        </Dialog>

        <!-- Delete Match Dialog -->
        <Dialog v-model:visible="deleteMatchDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="match">
                    Are you sure you want to delete match <b>{{ match.id }}</b>?
                </span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteMatchDialog = false" />
                <Button label="Yes" icon="pi pi-check" @click="deleteMatch" />
            </template>
        </Dialog>

        <!-- Delete Selected Matches Dialog -->
        <Dialog v-model:visible="deleteMatchesDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>Are you sure you want to delete the selected matches?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteMatchesDialog = false" />
                <Button label="Yes" icon="pi pi-check" text @click="deleteSelectedMatches" />
            </template>
        </Dialog>
    </div>
</template>
