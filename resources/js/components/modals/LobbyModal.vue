<template>
  <div
    v-if="gameStore.isLobbyOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    @click.self="gameStore.closeLobby()"
  >
    <div
      class="w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🛰️</span>
          <div>
            <h2 class="text-lg font-bold text-cyan-300 font-mono tracking-wide">
              CENTRUM DOWODZENIA CO-OP
            </h2>
            <p class="text-xs text-slate-400">
              Graj ze znajomymi w czasie rzeczywistym przez Laravel Reverb
            </p>
          </div>
        </div>
        <button
          @click="gameStore.closeLobby()"
          class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/60 transition cursor-pointer text-lg"
        >
          ✕
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto space-y-6">
        <!-- Room Status Card -->
        <div class="p-4 rounded-xl border bg-slate-950/60" :class="gameStore.roomCode ? 'border-cyan-500/40' : 'border-slate-800'">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs uppercase font-mono text-slate-400">Status Sesji:</span>
            <span
              class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5"
              :class="gameStore.roomCode ? 'bg-cyan-950 text-cyan-400 border border-cyan-700/60' : 'bg-slate-800 text-slate-300'"
            >
              <span class="w-2 h-2 rounded-full" :class="gameStore.wsConnected ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'"></span>
              {{ gameStore.roomCode ? (gameStore.wsConnected ? 'POŁĄCZONY CO-OP' : 'ŁĄCZENIE...') : 'TRYB LOKALNY (SOLO)' }}
            </span>
          </div>

          <!-- In Room Details -->
          <div v-if="gameStore.roomCode" class="space-y-3">
            <div class="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
              <span class="text-xs text-slate-400">Kod Pokoju:</span>
              <span class="text-base font-mono font-bold text-cyan-300 tracking-wider">{{ gameStore.roomCode }}</span>
            </div>

            <div class="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
              <span class="text-xs text-slate-400">Aktywnych Astronautów:</span>
              <span class="text-sm font-mono font-bold text-emerald-400">👥 {{ gameStore.memberCount }}</span>
            </div>

            <!-- Share Link Field -->
            <div class="space-y-1">
              <label class="text-[11px] font-mono text-slate-400">Link z zaproszeniem dla znajomych:</label>
              <div class="flex gap-2">
                <input
                  type="text"
                  readonly
                  :value="shareUrl"
                  class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono selection:bg-cyan-900 select-all"
                />
                <button
                  @click="copyInviteLink"
                  class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-slate-950 font-bold rounded-lg text-xs font-mono transition cursor-pointer"
                >
                  {{ copied ? 'SKOPIOWANO!' : 'KOPIUJ' }}
                </button>
              </div>
            </div>

            <button
              @click="leaveRoom"
              class="w-full mt-2 py-2 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-700/50 text-rose-300 font-mono text-xs rounded-lg transition cursor-pointer"
            >
              🚪 Opuść pokój i wróć do trybu Solo
            </button>
          </div>

          <!-- Solo Mode Actions -->
          <div v-else class="space-y-4">
            <p class="text-xs text-slate-300 leading-relaxed">
              Obecnie grasz w trybie jednoosobowym. Możesz utworzyć dedykowany pokój wieloosobowy lub dołączyć do znajomego za pomocą kodu URL.
            </p>

            <button
              @click="createRoom"
              :disabled="loading"
              class="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm font-mono rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>🚀</span>
              <span>{{ loading ? 'TWORZENIE POKOJU...' : 'UTWÓRZ NOWY POKÓJ CO-OP' }}</span>
            </button>

            <div class="relative flex py-1 items-center">
              <div class="flex-grow border-t border-slate-800"></div>
              <span class="flex-shrink mx-3 text-slate-500 text-[11px] font-mono">LUB DOŁĄCZ PRZEZ KOD</span>
              <div class="flex-grow border-t border-slate-800"></div>
            </div>

            <div class="flex gap-2">
              <input
                v-model="joinCodeInput"
                placeholder="np. vns-8492"
                @keyup.enter="joinRoom"
                class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-cyan-300 font-mono focus:border-cyan-400 outline-none uppercase placeholder:lowercase"
              />
              <button
                @click="joinRoom"
                :disabled="!joinCodeInput.trim() || loading"
                class="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer disabled:opacity-40"
              >
                DOŁĄCZ
              </button>
            </div>
          </div>
        </div>

        <!-- Info / Features Checklist -->
        <div class="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-400">
          <div class="text-[11px] font-mono uppercase text-slate-300 font-bold tracking-wider mb-2">
            Architektura Synchronizacji Wenus 2D:
          </div>
          <div class="flex items-start gap-2">
            <span class="text-cyan-400">✓</span>
            <span>Synchronizacja pozycji astronautów w 20 Hz ze smukłą interpolacją (lerp).</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-cyan-400">✓</span>
            <span>Batchowane pociągnięcia szczotką w 10 Hz eliminujące opóźnienia i przeciążenia sieci.</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-cyan-400">✓</span>
            <span>Wspólna siatka budynków, fabryk i taśmociągów.</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-cyan-400">✓</span>
            <span>Automatyczny snapshot stanu w bazie i pamięci podręcznej Redis co 60 sekund.</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from 'axios';
import { useGameStore } from '@/stores/useGameStore';

const gameStore = useGameStore();

const joinCodeInput = ref('');
const loading = ref(false);
const copied = ref(false);

const shareUrl = computed(() => {
  if (!gameStore.roomCode) return '';
  return `${window.location.origin}/room/${gameStore.roomCode}`;
});

const copyInviteLink = async () => {
  if (!shareUrl.value) return;
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2500);
  } catch (err) {
    console.error('Copy failed:', err);
  }
};

const createRoom = async () => {
  loading.value = true;
  try {
    const res = await axios.post('/api/rooms');
    if (res.data?.success && res.data.room?.code) {
      const code = res.data.room.code;
      window.location.href = `/room/${code}`;
    }
  } catch (err) {
    alert('Nie udało się utworzyć pokoju. Sprawdź połączenie z serwerem.');
  } finally {
    loading.value = false;
  }
};

const joinRoom = () => {
  const code = joinCodeInput.value.trim().toLowerCase();
  if (!code) return;
  window.location.href = `/room/${code}`;
};

const leaveRoom = () => {
  window.location.href = '/';
};
</script>

