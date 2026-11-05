<template>
  <div
    v-if="gameStore.isSystemMenuOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none animate-fadeIn"
    @click.self="gameStore.closeSystemMenu()"
  >
    <!-- Modal Window Container -->
    <div
      class="bg-slate-900/95 border border-cyan-500/40 rounded-3xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden ring-1 ring-cyan-500/20 text-slate-200"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl shadow-inner">
            ⚙️
          </div>
          <div class="flex flex-col text-left">
            <h2 class="text-base font-bold text-white font-mono tracking-wide flex items-center gap-2">
              <span>PLANET CLEANER SIMULATOR</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">CH.1 VENUS</span>
            </h2>
            <p class="text-xs text-slate-400 font-sans mt-0.5">
              Menu systemowe, opcje audio/wideo, konfiguracja sterowania i serwera.
            </p>
          </div>
        </div>

        <button
          @click="gameStore.closeSystemMenu()"
          class="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center text-sm transition cursor-pointer"
          title="Zamknij [ESC]"
        >
          ✕
        </button>
      </div>

      <!-- Navigation breadcrumb when in sub-menu -->
      <div
        v-if="activeSubTab !== 'menu'"
        class="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs font-mono"
      >
        <button
          @click="activeSubTab = 'menu'"
          class="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-bold transition cursor-pointer"
        >
          <span>←</span>
          <span>Wróć do menu</span>
        </button>
        <span class="text-slate-400 uppercase tracking-wider font-bold">
          {{ currentSubTabTitle }}
        </span>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto max-h-[75vh]">
        <!-- ========================================== -->
        <!-- SUBTAB: MENU GŁÓWNE (LISTA OPCJI)          -->
        <!-- ========================================== -->
        <div v-if="activeSubTab === 'menu'" class="flex flex-col gap-3 font-mono">
          <!-- Button: Resume Game -->
          <button
            @click="gameStore.closeSystemMenu()"
            class="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg transition active:scale-98 flex items-center justify-between cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <span class="text-lg">▶️</span>
              <span>Wznów Grę</span>
            </div>
            <kbd class="text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 text-slate-900 border border-emerald-800/40">
              ESC
            </kbd>
          </button>

          <!-- Button: Sterowanie & Klawiszologia -->
          <button
            @click="activeSubTab = 'controls'"
            class="w-full py-3 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-slate-600 text-slate-200 font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-between cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <span class="text-base">🎮</span>
              <div class="text-left font-sans">
                <div class="font-bold text-sm text-slate-100 font-mono">Sterowanie i Klawiszologia</div>
                <div class="text-[11px] text-slate-400">Ruch, miotła, odkurzacz, budowanie i skróty</div>
              </div>
            </div>
            <span class="text-slate-400 text-sm">→</span>
          </button>

          <!-- Button: Dźwięk & Grafika -->
          <button
            @click="activeSubTab = 'audio'"
            class="w-full py-3 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-slate-600 text-slate-200 font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-between cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <span class="text-base">{{ settingsStore.isMuted ? '🔇' : '🔊' }}</span>
              <div class="text-left font-sans">
                <div class="font-bold text-sm text-slate-100 font-mono">Ustawienia Dźwięku i Grafiki</div>
                <div class="text-[11px] text-slate-400">
                  Głośność ({{ settingsStore.volumePercent }}%), wyciszenie, wstrząsy ekranu
                </div>
              </div>
            </div>
            <span class="text-slate-400 text-sm">→</span>
          </button>

          <!-- Button: Tryb Gry & Pokoje Co-op -->
          <button
            @click="activeSubTab = 'multiplayer'"
            class="w-full py-3 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-slate-600 text-slate-200 font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-between cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <span class="text-base">🌐</span>
              <div class="text-left font-sans">
                <div class="font-bold text-sm text-slate-100 font-mono">Tryb Gry & Pokoje Co-op</div>
                <div class="text-[11px] text-slate-400">
                  Status: {{ gameStore.roomCode ? `Pokój [${gameStore.roomCode}]` : 'Tryb Solo' }}
                </div>
              </div>
            </div>
            <span class="text-slate-400 text-sm">→</span>
          </button>

          <!-- Button: Narzędzia Świata & Generator -->
          <button
            @click="activeSubTab = 'world'"
            class="w-full py-3 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-slate-600 text-slate-200 font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-between cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <span class="text-base">🌋</span>
              <div class="text-left font-sans">
                <div class="font-bold text-sm text-slate-100 font-mono">Narzędzia Świata & Generator</div>
                <div class="text-[11px] text-slate-400">Seed proceduralny, kratery wulkaniczne</div>
              </div>
            </div>
            <span class="text-slate-400 text-sm">→</span>
          </button>

          <!-- Divider -->
          <div class="h-px bg-slate-800 my-1"></div>

          <!-- Button: Nowa Gra (Reset Postępu i Uruchomienie Samouczka) -->
          <button
            @click="handleResetGame"
            class="w-full py-2.5 px-4 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-between cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <span class="text-base">🔄</span>
              <div class="text-left font-sans">
                <div class="font-bold text-sm text-rose-200 font-mono">Zresetuj Postęp (Nowa Gra)</div>
                <div class="text-[11px] text-rose-400/80">Wyczyść zapisane zlecenia, kredyty i rozpocznij samouczek od zera</div>
              </div>
            </div>
            <span class="text-rose-400 text-xs px-2 py-1 rounded bg-rose-900/40 border border-rose-700/50 font-mono font-bold">RESET</span>
          </button>
        </div>

        <!-- ========================================== -->
        <!-- SUBTAB: STEROWANIE & KLAWISZOLOGIA         -->
        <!-- ========================================== -->
        <div v-else-if="activeSubTab === 'controls'" class="flex flex-col gap-4">
          <p class="text-xs text-slate-400 font-sans">
            Wszystkie kluczowe skróty sterowania łazikiem, narzędziami oraz budową infrastruktury kolonii:
          </p>

          <div class="grid grid-cols-1 gap-2 font-mono text-xs">
            <!-- Row: Ruch -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span class="text-slate-300 font-sans">Ruch łazika:</span>
              <div class="flex gap-1">
                <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-300 font-bold">W</kbd>
                <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-300 font-bold">A</kbd>
                <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-300 font-bold">S</kbd>
                <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-300 font-bold">D</kbd>
              </div>
            </div>

            <!-- Row: Zamiatanie -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span class="text-slate-300 font-sans">Zamiatanie / Zbieranie pyłu:</span>
              <div class="flex items-center gap-1.5">
                <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-bold">LPM</kbd>
                <span class="text-slate-500">lub</span>
                <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-bold">SPACJA</kbd>
              </div>
            </div>

            <!-- Row: Budowanie -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span class="text-slate-300 font-sans">Wybór budynku z Hotbara:</span>
              <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-300 font-bold">1 - 9</kbd>
            </div>

            <!-- Row: Obrót -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span class="text-slate-300 font-sans">Obrót taśmociągu / maszyny:</span>
              <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-300 font-bold">R</kbd>
            </div>

            <!-- Row: Pipeta -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span class="text-slate-300 font-sans">Pipeta (skopiuj budynek pod kursorem):</span>
              <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-bold">Q</kbd>
            </div>

            <!-- Row: Alt Mode -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span class="text-slate-300 font-sans">Tryb ALT (Inspekcja magazynów i sieci):</span>
              <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-300 font-bold">LEWY ALT</kbd>
            </div>

            <!-- Row: Mule Drone -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span class="text-slate-300 font-sans">Wezwanie Drona-Muła (Odsysanie urobku):</span>
              <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-bold">G</kbd>
            </div>

            <!-- Row: Centrum Dowodzenia -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span class="text-slate-300 font-sans">Centrum Dowodzenia (Statystyki / R&D / Sklep / Cele):</span>
              <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-300 font-bold">C</kbd>
            </div>

            <!-- Row: Szybki Sklep -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span class="text-slate-300 font-sans">Szybki Sklep Ulepszeń:</span>
              <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-300 font-bold">B</kbd>
            </div>

            <!-- Row: Szybkie Osiągnięcia -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span class="text-slate-300 font-sans">Szybkie Osiągnięcia i Nagrody:</span>
              <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-amber-300 font-bold">Y</kbd>
            </div>

            <!-- Row: Minimapa Radar -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span class="text-slate-300 font-sans">Przełącznik rozmiaru radaru minimapy:</span>
              <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-bold">M</kbd>
            </div>

            <!-- Row: Anulowanie / Menu -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span class="text-slate-300 font-sans">Anuluj budowę / Menu Systemowe:</span>
              <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-rose-300 font-bold">ESC</kbd>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- SUBTAB: DŹWIĘK I GRAFIKA                   -->
        <!-- ========================================== -->
        <div v-else-if="activeSubTab === 'audio'" class="flex flex-col gap-5">
          <p class="text-xs text-slate-400 font-sans">
            Dostosuj syntezator WebAudio oraz efekty wizualne. Ustawienia są automatycznie zapisywane w pamięci przeglądarki.
          </p>

          <div class="space-y-4 font-mono text-xs">
            <!-- Mute Toggle -->
            <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div class="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <span>{{ settingsStore.isMuted ? '🔇' : '🔊' }}</span>
                  <span>Wyciszenie Dźwięków</span>
                </div>
                <div class="text-[11px] text-slate-400 font-sans mt-0.5">
                  Wyłącz syntezę audio silnika, zamiatania oraz fanfar
                </div>
              </div>

              <button
                @click="settingsStore.toggleMute()"
                class="px-4 py-2 rounded-xl font-bold transition cursor-pointer"
                :class="settingsStore.isMuted
                  ? 'bg-rose-950 border border-rose-700 text-rose-300'
                  : 'bg-emerald-950 border border-emerald-700 text-emerald-300'"
              >
                {{ settingsStore.isMuted ? 'WYCISZONY' : 'WŁĄCZONY' }}
              </button>
            </div>

            <!-- Master Volume Slider -->
            <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-bold text-sm text-slate-100">Główna Głośność Efektów (Master Volume)</div>
                  <div class="text-[11px] text-slate-400 font-sans mt-0.5">
                    Regulacja natężenia dźwięków odkurzacza, stacji bazowej i dzwonków
                  </div>
                </div>
                <span class="text-sm font-bold text-cyan-400">{{ settingsStore.volumePercent }}%</span>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                :value="settingsStore.masterVolume"
                @input="onVolumeSliderChange"
                class="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>

            <!-- Screen Shake Toggle -->
            <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div class="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <span>💥</span>
                  <span>Wstrząsy Ekranu (Juice & Feedback)</span>
                </div>
                <div class="text-[11px] text-slate-400 font-sans mt-0.5">
                  Dynamiczne wibracje kamery przy uderzeniach kwasu i zrzucie urobku
                </div>
              </div>

              <button
                @click="settingsStore.setScreenShake(!settingsStore.screenShake)"
                class="px-4 py-2 rounded-xl font-bold transition cursor-pointer"
                :class="settingsStore.screenShake
                  ? 'bg-cyan-950 border border-cyan-700 text-cyan-300'
                  : 'bg-slate-800 border border-slate-700 text-slate-400'"
              >
                {{ settingsStore.screenShake ? 'AKTYWNE' : 'WYŁĄCZONE' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- SUBTAB: MULTIPLAYER / POKOJE CO-OP         -->
        <!-- ========================================== -->
        <div v-else-if="activeSubTab === 'multiplayer'" class="flex flex-col gap-4 font-mono">
          <!-- Room Status Card -->
          <div class="p-4 rounded-2xl border bg-slate-950/60" :class="gameStore.roomCode ? 'border-cyan-500/40' : 'border-slate-800'">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs uppercase text-slate-400 font-bold">Status Sesji:</span>
              <span
                class="px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                :class="gameStore.roomCode ? 'bg-cyan-950 text-cyan-400 border border-cyan-700/60' : 'bg-slate-800 text-slate-300'"
              >
                <span class="w-2 h-2 rounded-full" :class="gameStore.wsConnected ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'"></span>
                {{ gameStore.roomCode ? (gameStore.wsConnected ? 'POŁĄCZONY CO-OP' : 'ŁĄCZENIE...') : 'TRYB LOKALNY (SOLO)' }}
              </span>
            </div>

            <!-- In Room Details -->
            <div v-if="gameStore.roomCode" class="space-y-3">
              <div class="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                <span class="text-xs text-slate-400">Kod Pokoju:</span>
                <span class="text-base font-bold text-cyan-300 tracking-wider">{{ gameStore.roomCode }}</span>
              </div>

              <div class="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                <span class="text-xs text-slate-400">Aktywnych Astronautów:</span>
                <span class="text-sm font-bold text-emerald-400">👥 {{ gameStore.memberCount }}</span>
              </div>

              <!-- Share Link Field -->
              <div class="space-y-1">
                <label class="text-[11px] text-slate-400">Link z zaproszeniem dla znajomych:</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    readonly
                    :value="shareUrl"
                    class="bg-slate-900 text-slate-300 text-xs px-3 py-2 rounded-xl border border-slate-700 flex-1 select-all outline-none"
                  />
                  <button
                    @click="copyInviteLink"
                    class="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>{{ copied ? '✓' : '📋' }}</span>
                    <span>{{ copied ? 'Skopiowano' : 'Kopiuj' }}</span>
                  </button>
                </div>
              </div>

              <!-- Leave Room Action -->
              <button
                @click="leaveRoom"
                class="w-full py-2 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs rounded-xl transition cursor-pointer mt-2 font-bold"
              >
                Opuść Pokój (Wróć do trybu Solo)
              </button>
            </div>

            <!-- No Room: Create or Join -->
            <div v-else class="space-y-4 pt-1">
              <p class="text-xs text-slate-400 font-sans">
                Graj wspólnie na tej samej mapie Wenus ze znajomymi w czasie rzeczywistym.
              </p>

              <!-- Action: Create Room -->
              <button
                @click="createRoom"
                :disabled="loading"
                class="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>➕</span>
                <span>{{ loading ? 'Tworzenie pokoju...' : 'Utwórz Nowy Pokój Co-op' }}</span>
              </button>

              <div class="flex items-center gap-2 text-slate-600 text-[10px]">
                <div class="flex-1 border-t border-slate-800"></div>
                <span>LUB DOŁĄCZ DO ISTNIEJĄCEGO</span>
                <div class="flex-1 border-t border-slate-800"></div>
              </div>

              <!-- Action: Join Room by Code -->
              <div class="flex gap-2">
                <input
                  v-model="joinCodeInput"
                  type="text"
                  placeholder="Wpisz 6-znakowy kod..."
                  maxlength="8"
                  class="bg-slate-900 text-slate-200 uppercase tracking-widest text-xs px-3 py-2 rounded-xl border border-slate-700 flex-1 outline-none focus:border-cyan-500"
                  @keydown.enter="joinRoom"
                />
                <button
                  @click="joinRoom"
                  :disabled="!joinCodeInput.trim()"
                  class="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-300 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40"
                >
                  Dołącz
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- SUBTAB: NARZĘDZIA ŚWIATA & GENERATOR       -->
        <!-- ========================================== -->
        <div v-else-if="activeSubTab === 'world'" class="flex flex-col gap-4 font-mono text-xs">
          <p class="text-xs text-slate-400 font-sans">
            Konfiguracja proceduralnego generatora powierzchni Wenus oraz symulacji wulkanicznej.
          </p>

          <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div class="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>🌋</span>
                <span>Symulacja Kraterów Wulkanicznych</span>
              </div>
              <div class="text-[11px] text-slate-400 font-sans mt-0.5">
                Kratery wytwarzają ciepło i umożliwiają budowę elektrowni geotermalnych (+80 kW).
              </div>
            </div>

            <button
              @click="toggleCraters"
              class="px-4 py-2 rounded-xl font-bold transition cursor-pointer"
              :class="cratersEnabled
                ? 'bg-amber-950 border border-amber-700 text-amber-300'
                : 'bg-slate-800 border border-slate-700 text-slate-400'"
            >
              {{ cratersEnabled ? 'WŁĄCZONE' : 'WYŁĄCZONE' }}
            </button>
          </div>

          <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div class="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>🎲</span>
                <span>Proceduralny Seed Świata</span>
              </div>
              <div class="text-[11px] text-slate-400 font-sans mt-0.5">
                Aktualny seed: <strong class="text-cyan-300">#{{ currentSeed }}</strong>
              </div>
            </div>

            <button
              @click="rerollWorldSeed"
              class="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold transition cursor-pointer"
            >
              Nowy Seed
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
        <span>Naciśnij <kbd class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300 text-[10px]">ESC</kbd> aby zamknąć</span>
        <button
          @click="gameStore.closeSystemMenu()"
          class="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 cursor-pointer transition font-bold"
        >
          Wznów Grę
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from 'axios';
import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useContractStore } from '@/stores/useContractStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { getWorldConfig } from '@/engine/world/WorldConfig';

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const contractStore = useContractStore();
const settingsStore = useSettingsStore();

const handleResetGame = () => {
  if (confirm('Czy na pewno chcesz zresetować cały postęp i rozpocząć nową grę? Ta operacja wyczyści zlecenia, kredyty, wyposażenie i uruchomi 3-krokowy samouczek.')) {
    try {
      localStorage.removeItem('wenuscleaner_contracts_v1');
      localStorage.removeItem('venus_cleaner_save_v1');
      localStorage.removeItem('venus_onboarding_dismissed');
    } catch (e) {
      // ignore
    }
    contractStore.resetContracts();
    playerStore.resetPlayer();
    gameStore.resetGame();
    window.location.reload();
  }
};

type SubTab = 'menu' | 'controls' | 'audio' | 'multiplayer' | 'world';

const activeSubTab = computed<SubTab>({
  get: () => (gameStore.systemMenuTab as SubTab) || 'menu',
  set: (val: SubTab) => {
    gameStore.systemMenuTab = val;
  },
});

const currentSubTabTitle = computed(() => {
  switch (activeSubTab.value) {
    case 'controls': return 'Sterowanie i Klawisze';
    case 'audio': return 'Dźwięk i Grafika';
    case 'multiplayer': return 'Tryb Gry & Co-op';
    case 'world': return 'Generator Świata';
    default: return 'Menu Główne';
  }
});

// Audio slider
const onVolumeSliderChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  settingsStore.setMasterVolume(parseFloat(target.value));
};

// Multiplayer logic
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
  } catch {
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

// World Config logic
const cratersEnabled = ref(getWorldConfig().craters.enabled);
const currentSeed = ref(getWorldConfig().seed);

const toggleCraters = () => {
  const win = window as any;
  if (win.__worldConfig) {
    const cur = win.__worldConfig.get();
    const next = !cur.craters.enabled;
    win.__worldConfig.set({ craters: { enabled: next } });
    cratersEnabled.value = next;
    gameStore.showBanner(`🌋 Kratery zostały ${next ? 'WŁĄCZONE (+80 kW z lawy)' : 'WYŁĄCZONE (usunięte z powierzchni, 0 kW)'}!`, next ? 'success' : 'warning', 3000);
  }
};

const rerollWorldSeed = () => {
  const win = window as any;
  if (win.__worldConfig) {
    const nextSeed = Math.floor(Math.random() * 90000) + 1000;
    win.__worldConfig.set({ seed: nextSeed });
    currentSeed.value = nextSeed;
    cratersEnabled.value = win.__worldConfig.get().craters.enabled;
    gameStore.showBanner(`🎲 Nowy proceduralny świat! Seed: #${nextSeed}`, 'success', 3000);
  }
};
</script>

