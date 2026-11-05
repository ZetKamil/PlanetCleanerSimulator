<template>
  <div
    v-if="gameStore.isCommandHubOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2 md:p-3.5 bg-slate-950/85 backdrop-blur-md select-none animate-fadeIn overflow-hidden"
    @click.self="gameStore.closeCommandHub()"
  >
    <!-- Modal Window Container (Responsive Bootstrap-style scaling) -->
    <div
      class="venus-panel border-amber-500/40 w-[98vw] sm:w-[95vw] lg:w-[92vw] max-w-[1380px] h-[98vh] sm:h-[95vh] lg:h-[92vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden ring-1 ring-amber-500/20 text-slate-200 min-h-0"
    >
      <!-- Modal Header (Compact on small laptop screens) -->
      <div class="px-3 sm:px-5 py-1.5 sm:py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2 sm:gap-2.5">
          <div class="w-7 h-7 sm:w-9 sm:h-9 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0">
            🛸
          </div>
          <div class="flex flex-col text-left min-w-0">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <h2 class="text-xs sm:text-base lg:text-lg font-bold text-white font-tech tracking-wide truncate">
                CENTRUM DOWODZENIA WENUS
              </h2>
              <span class="text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 font-mono shrink-0">
                [Klawisz C]
              </span>
            </div>
            <p class="hidden sm:block text-[10px] sm:text-xs text-slate-400 font-sans mt-0.5 truncate">
              Zarządzanie ekspedycją, telemetria rovera, technologie bazy, wyposażenie, flota i mapa.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-3 shrink-0">
          <!-- Balance Badge -->
          <div class="venus-panel border-emerald-500/50 px-2 sm:px-2.5 py-0.5 sm:py-1 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono">
            <span class="text-emerald-400 font-tech">Kredyty:</span>
            <span class="text-emerald-300 font-bold text-xs sm:text-sm font-data">${{ playerStore.credits.toFixed(2) }}</span>
          </div>

          <!-- Close Button -->
          <button
            @click="gameStore.closeCommandHub()"
            class="w-6 h-6 sm:w-8 sm:h-8 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center text-xs sm:text-sm transition cursor-pointer font-tech rounded-lg"
            title="Zamknij [C / ESC]"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Segmented Navigation Tab Bar (Icon-First Accordion - No horizontal scrollbar per Spec Point 2) -->
      <div class="px-2 sm:px-5 py-1 sm:py-1.5 bg-slate-950/70 border-b border-slate-800 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-mono select-none shrink-0 overflow-x-auto no-scrollbar">
        <button
          v-for="tab in tabList"
          :key="tab.id"
          @click="gameStore.commandHubTab = tab.id"
          class="flex items-center gap-1 sm:gap-1.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all duration-200 cursor-pointer whitespace-nowrap relative select-none"
          :class="gameStore.commandHubTab === tab.id
            ? 'px-2.5 sm:px-3.5 bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
            : 'px-2 sm:px-2.5 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'"
          :title="`${tab.label} [${tab.key}]`"
        >
          <span class="text-xs sm:text-sm">{{ tab.icon }}</span>
          <span v-if="gameStore.commandHubTab === tab.id" class="transition-all duration-200">{{ tab.label }}</span>
          <kbd class="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-slate-800/80 text-slate-400 font-mono">
            {{ tab.key }}
          </kbd>
          <!-- Badge for unclaimed achievements on tab -->
          <span
            v-if="tab.id === 'achievements' && achievementStore.unclaimedCount > 0"
            class="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 text-slate-950 text-[8px] sm:text-[9px] font-extrabold flex items-center justify-center animate-bounce shadow"
          >
            {{ achievementStore.unclaimedCount }}
          </span>
        </button>
      </div>

      <!-- Modal Body (Responsive Padding & Height) -->
      <div class="flex-1 h-full overflow-hidden flex flex-col min-h-0 p-2 sm:p-2.5 lg:p-3 xl:p-4">
        <!-- ========================================== -->
        <!-- TAB 1: STATYSTYKI & TELEMETRIA EKSPEDYCJI -->
        <!-- ========================================== -->
        <div v-if="gameStore.commandHubTab === 'stats'" class="flex-1 overflow-y-auto pr-2 min-h-0 flex flex-col gap-5">
          <!-- Summary Header Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <!-- Card 1: Clean Progress -->
            <div class="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/30 flex flex-col justify-between gap-3 shadow-lg">
              <div class="flex items-center justify-between">
                <span class="text-xs uppercase font-mono text-slate-400 font-bold">🧹 Oczyszczono Pyłu</span>
                <span class="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-700/50 font-bold">
                  {{ gameStore.cleanedKg }} kg
                </span>
              </div>
              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="text-slate-400">Postęp planety Wenus:</span>
                  <span class="text-emerald-400 font-bold">{{ gameStore.percentCleaned }}%</span>
                </div>
                <div class="venus-progress-bar w-full">
                  <div
                    class="venus-progress-bar-fill bg-gradient-to-r from-cyan-500 to-emerald-400"
                    :style="{ width: `${gameStore.percentCleaned}%` }"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Card 2: Current Sector & Bonus -->
            <div class="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/30 flex flex-col justify-between gap-3 shadow-lg">
              <div class="flex items-center justify-between">
                <span class="text-xs uppercase font-mono text-slate-400 font-bold">📍 Sektor Wenus</span>
                <span class="text-xs font-mono font-bold text-amber-300">
                  {{ gameStore.currentSectorId }}
                </span>
              </div>
              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="text-slate-400">Oczyszczenie sektora:</span>
                  <span class="text-amber-400 font-bold">{{ Math.round(gameStore.currentSectorClean) }}%</span>
                </div>
                <div class="flex items-center justify-between text-xs font-mono pt-0.5">
                  <span class="text-slate-400">Premia skupu pyłu:</span>
                  <span class="text-amber-300 font-bold" :class="gameStore.sectorBonusPercent > 0 ? 'text-amber-300' : 'text-slate-500'">
                    +{{ gameStore.sectorBonusPercent }}%
                  </span>
                </div>
              </div>
            </div>

            <!-- Card 3: Rover Operational Status (Action) -->
            <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-3 shadow-lg">
              <div class="flex items-center justify-between">
                <span class="text-xs uppercase font-mono text-slate-400 font-bold">⚙️ Status Operacyjny</span>
                <span class="w-2.5 h-2.5 rounded-full" :class="roverStatusColor"></span>
              </div>
              <div class="space-y-1">
                <div class="text-sm font-mono font-bold" :class="roverStatusTextColor">
                  {{ roverStatusLabel }}
                </div>
                <div class="text-[11px] font-sans text-slate-400">
                  {{ roverStatusSubtext }}
                </div>
              </div>
            </div>
          </div>

          <!-- Section: Detailed Telemetry Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Telemetria Termiczna i Życiowa -->
            <div class="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex flex-col gap-3">
              <h3 class="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                <span>🌡️</span> Telemetria Powłoki Łazika
              </h3>

              <div class="space-y-2 text-xs font-mono">
                <div class="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
                  <span class="text-slate-400">Temperatura zewnętrzna:</span>
                  <span class="font-bold" :class="gameStore.temperature > 500 ? 'text-rose-400' : 'text-amber-300'">
                    {{ gameStore.temperature }}°C
                  </span>
                </div>

                <div class="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
                  <span class="text-slate-400">Wskaźnik przegrzania:</span>
                  <span class="font-bold" :class="gameStore.overheatPercent > 20 ? 'text-rose-400 animate-pulse' : 'text-slate-300'">
                    {{ gameStore.overheatPercent }}% {{ gameStore.overheatPercent > 0 ? '(Chłodzenie pasywne)' : '(Norma)' }}
                  </span>
                </div>

                <div class="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
                  <span class="text-slate-400">Odporność na kwas / atmosfera:</span>
                  <span class="font-bold" :class="gameStore.isPlayerShielded ? 'text-cyan-400' : 'text-rose-400'">
                    {{ gameStore.isPlayerShielded ? '🛡️ Osłonięty (100%)' : `⚠️ Korozja: ${gameStore.acidCorrosion}%` }}
                  </span>
                </div>

                <div class="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
                  <span class="text-slate-400">Pozycja satelitarna GPS:</span>
                  <span class="font-bold text-slate-300">
                    X: {{ gameStore.playerCoords.x }}, Y: {{ gameStore.playerCoords.y }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Infrastruktura Bazy i Sieci Energetycznej -->
            <div class="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex flex-col gap-3">
              <h3 class="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                <span>⚡</span> Infrastruktura Bazy i Logistyka
              </h3>

              <div class="space-y-2 text-xs font-mono">
                <div class="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
                  <span class="text-slate-400">Sieć Energetyczna kolonii:</span>
                  <span class="font-bold" :class="gameStore.powerGrid.deficit ? 'text-rose-400' : 'text-lime-300'">
                    {{ gameStore.powerGrid.produced }} / {{ gameStore.powerGrid.consumed }} kW
                  </span>
                </div>

                <div class="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
                  <span class="text-slate-400">Przejęte sektory siatki:</span>
                  <span class="font-bold text-emerald-400">
                    {{ gameStore.claimedSectorsCount }} / 114 sektorów
                  </span>
                </div>

                <div class="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
                  <span class="text-slate-400">Stan Drona-Muła (Logistyka [G]):</span>
                  <span class="font-bold text-cyan-300 uppercase">
                    {{ muleStatusLabel }}
                  </span>
                </div>

                <div class="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
                  <span class="text-slate-400">Odblokowane technologie badań:</span>
                  <span class="font-bold text-amber-300">
                    TIER {{ gameStore.currentTier }} (Winda Kosmiczna)
                  </span>
                </div>
              </div>
            </div>

            <!-- Reset Progress Card (Nowa Gra) -->
            <div class="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl flex items-center justify-between font-mono">
              <div class="flex items-center gap-2.5">
                <span class="text-lg">🔄</span>
                <div class="text-left font-sans">
                  <div class="text-xs font-bold text-rose-200 font-mono">Resetuj postęp ekspedycji (Nowa Gra)</div>
                  <div class="text-[11px] text-rose-400/70">Wyczyść stan zapisów w przeglądarce i uruchom samouczek 90s</div>
                </div>
              </div>
              <button
                @click="handleResetGame"
                class="px-3 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-800/60 border border-rose-700/60 text-rose-300 font-bold text-xs transition cursor-pointer font-tech active:scale-95"
              >
                Nowa Gra
              </button>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TAB 2: BADANIA R&D (TECH TREE) -->
        <!-- ========================================== -->
        <div v-else-if="gameStore.commandHubTab === 'tech'" class="flex-1 overflow-y-auto pr-2 min-h-0 flex flex-col gap-4">
          <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs font-mono">
            <span class="text-slate-400">Kamienie Milowe & Winda Kosmiczna Wenus (Satisfactory / Factorio Loop):</span>
            <span class="text-amber-400 font-bold">AKTYWNY TIER {{ gameStore.currentTier }}</span>
          </div>

          <!-- Tier 1 -->
          <div class="p-4 rounded-xl border bg-slate-950/60 border-emerald-500/40 flex items-center justify-between">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                  TIER 1: AKTYWNY
                </span>
                <h3 class="text-sm font-bold text-slate-200">Faza Pionierska (Fundamenty)</h3>
              </div>
              <p class="text-xs text-slate-400">
                Podstawowy taśmociąg, generator energii słonecznej oraz stacja bazowa.
              </p>
            </div>
            <span class="text-xs font-mono text-emerald-400 font-bold">UKOŃCZONE ✓</span>
          </div>

          <!-- Tier 2 -->
          <div
            class="p-4 rounded-xl border transition-all"
            :class="isTierUnlocked(2)
              ? 'bg-slate-950/60 border-emerald-500/40'
              : (gameStore.deliveredBriquettes >= 15 || playerStore.credits >= 100 ? 'bg-slate-900 border-amber-500/60' : 'bg-slate-950/40 border-slate-800 opacity-70')"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                    :class="isTierUnlocked(2) ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-amber-950 text-amber-400 border border-amber-700'"
                  >
                    TIER 2
                  </span>
                  <h3 class="text-sm font-bold text-slate-200">Faza Przemysłowa (Automatyzacja)</h3>
                </div>
                <p class="text-xs text-slate-400">
                  Odblokowuje: Rozdzielacz ($18), Łącznik ($20), Tunel Podziemny ($15), Piec Hutniczy ($180) i Szybkie Taśmy Mk2 ($8).
                </p>
                <div class="text-[11px] font-mono flex items-center gap-3">
                  <span class="text-amber-300 font-bold">
                    🏭 Wymóg Fabryczny: Dostarczono {{ gameStore.deliveredBriquettes }} / 15 Brykietów
                  </span>
                  <span class="text-slate-500">|</span>
                  <span class="text-slate-400">Grant awaryjny: $100</span>
                </div>
              </div>

              <div v-if="isTierUnlocked(2)" class="text-xs font-mono text-emerald-400 font-bold shrink-0">
                UKOŃCZONE ✓
              </div>
              <div v-else class="flex items-center gap-2 shrink-0">
                <button
                  v-if="gameStore.deliveredBriquettes >= 15"
                  @click="unlockTierWithItems(2, 15, 'briquettes')"
                  class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono rounded-lg transition cursor-pointer shadow-lg animate-pulse"
                >
                  ODBLOKUJ DARMOWO (15/15) ✓
                </button>
                <button
                  v-else
                  @click="unlockTier(2, 100)"
                  :disabled="playerStore.credits < 100"
                  class="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-bold text-xs font-mono rounded-lg transition cursor-pointer disabled:opacity-40"
                  title="Możesz też odblokować darmowo produkując i dostarczając 15 Brykietów do Bazy"
                >
                  WYKUP ($100)
                </button>
              </div>
            </div>
          </div>

          <!-- Tier 3: Fluid Network & Rocket Silo -->
          <div
            class="p-4 rounded-xl border transition-all"
            :class="isTierUnlocked(3)
              ? 'bg-slate-950/60 border-cyan-500/50'
              : (isTierUnlocked(2) && (gameStore.deliveredPlates >= 20 || playerStore.credits >= 300) ? 'bg-slate-900 border-cyan-500/40' : 'bg-slate-950/40 border-slate-800 opacity-70')"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                    :class="isTierUnlocked(3) ? 'bg-cyan-950 text-cyan-400 border border-cyan-700' : 'bg-slate-800 text-slate-400 border border-slate-700'"
                  >
                    TIER 3: ENDGAME
                  </span>
                  <h3 class="text-sm font-bold text-slate-200">Kopuły Ochronne i Ekspedycja Orbitalna</h3>
                </div>
                <p class="text-xs text-slate-400">
                  Odblokowuje: Pylon Tarczy Siłowej ($350), Generator Geotermalny ($280), Rafinerię Chemiczną ($320) oraz Wyrzutnię Rakiety Orbitalnej.
                </p>
                <div class="text-[11px] font-mono flex items-center gap-3">
                  <span class="text-cyan-300 font-bold">
                    🚀 Wymóg Fabryczny: Dostarczono {{ gameStore.deliveredPlates }} / 20 Płyt
                  </span>
                  <span class="text-slate-500">|</span>
                  <span class="text-slate-400">Grant awaryjny: $300</span>
                </div>
              </div>

              <div v-if="isTierUnlocked(3)" class="text-xs font-mono text-cyan-400 font-bold shrink-0">
                GOTOWA DO STARTU 🚀
              </div>
              <div v-else class="flex items-center gap-2 shrink-0">
                <button
                  v-if="gameStore.deliveredPlates >= 20"
                  @click="unlockTierWithItems(3, 20, 'plates')"
                  :disabled="!isTierUnlocked(2)"
                  class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono rounded-lg transition cursor-pointer shadow-lg animate-pulse"
                >
                  ODBLOKUJ DARMOWO (20/20) ✓
                </button>
                <button
                  v-else
                  @click="unlockTier(3, 300)"
                  :disabled="!isTierUnlocked(2) || playerStore.credits < 300"
                  class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-slate-950 font-bold text-xs font-mono rounded-lg transition cursor-pointer disabled:opacity-40"
                  title="Możesz też odblokować darmowo produkując i dostarczając 20 Płyt Kompozytowych do Bazy"
                >
                  WYKUP ($300)
                </button>
              </div>
            </div>
          </div>

          <!-- Launch Rocket Final Action Banner (When Tier 3 is unlocked) -->
          <div v-if="isTierUnlocked(3)" class="p-4 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-emerald-950/60 border border-cyan-500/50 rounded-xl space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs font-mono uppercase text-cyan-300 font-bold">
                  Wyrzutnia Orbitalna Gotowa do Odpału
                </div>
                <p class="text-[11px] text-slate-300">
                  Sektor Wenus jest przygotowany. Odpalenie rakiety transportowej wieńczy misję ekspedycyjną!
                </p>
              </div>
              <button
                @click="launchRocket"
                class="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 active:scale-95 text-slate-950 font-extrabold text-xs font-mono rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <span>🚀</span>
                <span>ODPAL RAKIETĘ!</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TAB 3: WYPOSAŻENIE (MASTER-DETAIL KOMPAKT) -->
        <!-- ========================================== -->
        <div v-else-if="gameStore.commandHubTab === 'shop'" class="flex flex-col lg:flex-row gap-2 sm:gap-2.5 lg:gap-3 h-full min-h-0 overflow-y-auto pr-0.5">
          <!-- LEWA KOLUMNA (70%): MATRYCA TIERÓW 2x6 -->
          <div class="w-full lg:w-[68%] xl:w-[70%] flex flex-col justify-between gap-1.5 sm:gap-2 lg:gap-2.5 min-h-0 flex-1">
            <!-- Rząd 1: Narzędzia i Odkurzacze (Tier 1 -> Tier 6) -->
            <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 lg:p-2.5 flex flex-col justify-between flex-1 min-h-[140px] sm:min-h-[150px]">
              <div class="flex items-center justify-between mb-0.5 sm:mb-1 shrink-0">
                <div class="flex items-center gap-1.5 sm:gap-2">
                  <span class="text-xs sm:text-sm">🧹</span>
                  <h3 class="text-[10.5px] sm:text-xs font-mono uppercase tracking-wider text-amber-400 font-bold truncate">
                    Narzędzia i Odkurzacze (T1 - T6)
                  </h3>
                </div>
                <span class="text-[8.5px] sm:text-[9.5px] font-mono text-slate-400 truncate">
                  Aktywne: <strong class="text-amber-300">{{ playerStore.currentTool.name }}</strong>
                </span>
              </div>

              <!-- 6 Kafelków w rzędzie (Responsive: 3 kolumny na wąskim ekranie, 6 na laptopie/desktopie) -->
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5 lg:gap-2 h-full min-h-0 flex-1">
                <div
                  v-for="(tool, idx) in AVAILABLE_TOOLS"
                  :key="tool.id"
                  @click="selectTool(tool)"
                  @keydown.enter="selectTool(tool)"
                  @keydown.space.prevent="selectTool(tool)"
                  role="button"
                  tabindex="0"
                  class="venus-panel p-1 sm:p-1.5 flex flex-col justify-between items-center text-center rounded-lg sm:rounded-xl border transition-all cursor-pointer relative group h-full min-h-0 select-none outline-none focus:outline-none"
                  :class="[
                    selectedEquipment.type === 'tool' && selectedEquipment.item.id === tool.id
                      ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-950/60 shadow-lg shadow-amber-500/20 scale-[1.02] z-10'
                      : (playerStore.currentTool.id === tool.id
                          ? 'border-emerald-500/80 bg-emerald-950/20 hover:border-emerald-400'
                          : (playerStore.isToolPurchased(tool.id)
                              ? 'border-amber-500/40 bg-slate-900/60 hover:border-amber-400'
                              : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'))
                  ]"
                >
                  <!-- Badge Tieru w lewym górnym rogu -->
                  <div class="w-full flex items-center justify-between mb-0.5">
                    <span
                      class="text-[7.5px] sm:text-[8.5px] font-mono font-extrabold px-1 py-0.2 rounded border"
                      :class="playerStore.currentTool.id === tool.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-amber-400 border-amber-500/30'"
                    >
                      T{{ idx + 1 }}
                    </span>
                    <span v-if="playerStore.currentTool.id === tool.id" class="text-[8.5px] sm:text-[9.5px] text-emerald-400 font-bold">✓</span>
                  </div>

                  <!-- Ikona Narzędzia SVG -->
                  <div class="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 flex items-center justify-center my-0.5 group-hover:scale-110 transition-transform shrink-0">
                    <svg v-if="idx === 0" class="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    <svg v-else-if="idx === 1" class="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M12 2v8m0 0l-4 4m4-4l4 4M5 14h14M6 18h12M8 22h8" />
                    </svg>
                    <svg v-else-if="idx === 2" class="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-lime-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M19 4L5 18M18 3l3 3M4 17l3 3M3 21l3-1 1-3-3 1z" />
                    </svg>
                    <svg v-else-if="idx === 3" class="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 9 9M12 12l5-5M12 12l-5 5M12 12l5 5M12 12l-5-5" />
                    </svg>
                    <svg v-else-if="idx === 4" class="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M4 4h16l-3 10H7L4 4zM9 14v4a3 3 0 0 0 6 0v-4" />
                    </svg>
                    <svg v-else class="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <circle cx="12" cy="12" r="4" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4m-3.5-6.5l-2.8 2.8m-7.4 7.4l-2.8 2.8m0-13l2.8 2.8m7.4 7.4l2.8 2.8" />
                    </svg>
                  </div>

                  <!-- Krótka nazwa i główny parametr -->
                  <div class="w-full min-w-0">
                    <p class="text-[7.5px] sm:text-[8.5px] lg:text-[9.5px] font-bold text-slate-200 truncate font-sans leading-tight">
                      {{ getToolShortName(idx) }}
                    </p>
                    <p class="text-[7.5px] sm:text-[8.5px] font-mono text-cyan-300 font-bold mt-0.5">
                      {{ tool.sweepRate }} kg/s
                    </p>
                  </div>

                  <!-- Dolny pasek statusu i szybkich akcji -->
                  <div class="w-full mt-0.5 pt-0.5 border-t border-slate-800/80 shrink-0">
                    <span
                      v-if="playerStore.currentTool.id === tool.id"
                      class="block text-[7px] sm:text-[7.5px] font-mono font-extrabold uppercase py-0.5 px-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 truncate"
                    >
                      AKTYWNE
                    </span>
                    <button
                      v-else-if="playerStore.isToolPurchased(tool.id)"
                      type="button"
                      @click.stop="quickEquipTool(tool)"
                      class="w-full text-[7px] sm:text-[7.5px] font-mono font-extrabold uppercase py-0.5 px-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer truncate active:scale-95"
                    >
                      ZAŁÓŻ
                    </button>
                    <button
                      v-else-if="playerStore.credits >= tool.cost"
                      type="button"
                      @click.stop="quickBuyTool(tool)"
                      class="w-full text-[7px] sm:text-[7.5px] font-mono font-extrabold uppercase py-0.5 px-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md active:scale-95 cursor-pointer truncate animate-pulse"
                    >
                      KUP ${{ tool.cost }}
                    </button>
                    <span
                      v-else
                      class="block text-[7.5px] sm:text-[8px] font-mono font-bold text-slate-400 py-0.5 truncate"
                    >
                      {{ tool.cost === 0 ? 'Darmowe' : `$${tool.cost}` }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Rząd 2: Zasobniki Plecakowe (Tier 1 -> Tier 6) -->
            <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 lg:p-2.5 flex flex-col justify-between flex-1 min-h-[140px] sm:min-h-[150px]">
              <div class="flex items-center justify-between mb-0.5 sm:mb-1 shrink-0">
                <div class="flex items-center gap-1.5 sm:gap-2">
                  <span class="text-xs sm:text-sm">🎒</span>
                  <h3 class="text-[10.5px] sm:text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold truncate">
                    Zasobniki Plecakowe (T1 - T6)
                  </h3>
                </div>
                <span class="text-[8.5px] sm:text-[9.5px] font-mono text-slate-400 truncate">
                  Aktywny: <strong class="text-cyan-300">{{ playerStore.currentBackpack.name }}</strong>
                </span>
              </div>

              <!-- 6 Kafelków w rzędzie (Responsive: 3 na telefonie, 6 na laptopie/desktopie) -->
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5 lg:gap-2 h-full min-h-0 flex-1">
                <div
                  v-for="(pack, idx) in AVAILABLE_BACKPACKS"
                  :key="pack.id"
                  @click="selectBackpack(pack)"
                  @keydown.enter="selectBackpack(pack)"
                  @keydown.space.prevent="selectBackpack(pack)"
                  role="button"
                  tabindex="0"
                  class="venus-panel p-1 sm:p-1.5 flex flex-col justify-between items-center text-center rounded-lg sm:rounded-xl border transition-all cursor-pointer relative group h-full min-h-0 select-none outline-none focus:outline-none"
                  :class="[
                    selectedEquipment.type === 'backpack' && selectedEquipment.item.id === pack.id
                      ? 'ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/60 shadow-lg shadow-cyan-500/20 scale-[1.02] z-10'
                      : (playerStore.currentBackpack.id === pack.id
                          ? 'border-emerald-500/80 bg-emerald-950/20 hover:border-emerald-400'
                          : (playerStore.isBackpackPurchased(pack.id)
                              ? 'border-cyan-500/40 bg-slate-900/60 hover:border-cyan-400'
                              : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'))
                  ]"
                >
                  <!-- Badge Tieru w lewym górnym rogu -->
                  <div class="w-full flex items-center justify-between mb-0.5">
                    <span
                      class="text-[7.5px] sm:text-[8.5px] font-mono font-extrabold px-1 py-0.2 rounded border"
                      :class="playerStore.currentBackpack.id === pack.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-cyan-400 border-cyan-500/30'"
                    >
                      T{{ idx + 1 }}
                    </span>
                    <span v-if="playerStore.currentBackpack.id === pack.id" class="text-[8.5px] sm:text-[9.5px] text-emerald-400 font-bold">✓</span>
                  </div>

                  <!-- Ikona Plecaka SVG -->
                  <div class="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 flex items-center justify-center my-0.5 group-hover:scale-110 transition-transform shrink-0">
                    <svg v-if="idx === 0" class="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="5" y="4" width="14" height="16" rx="3" /><path d="M9 4v-2h6v2M9 10h6M9 14h6" />
                    </svg>
                    <svg v-else-if="idx === 1" class="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-teal-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="4" y="3" width="16" height="18" rx="3" /><path d="M4 9h16M4 15h16M9 3v18M15 3v18" />
                    </svg>
                    <svg v-else-if="idx === 2" class="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M6 5a4 4 0 0 1 8 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5z" /><circle cx="17" cy="9" r="3" /><path d="M17 9l1-1" />
                    </svg>
                    <svg v-else-if="idx === 3" class="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M8 4v6M16 4v6M8 10v10M16 10v10" />
                    </svg>
                    <svg v-else-if="idx === 4" class="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="3" y="3" width="8" height="18" rx="2" /><rect x="13" y="3" width="8" height="18" rx="2" /><path d="M11 8h2M11 16h2" />
                    </svg>
                    <svg v-else class="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
                    </svg>
                  </div>

                  <!-- Krótka nazwa i główny parametr -->
                  <div class="w-full min-w-0">
                    <p class="text-[7.5px] sm:text-[8.5px] lg:text-[9.5px] font-bold text-slate-200 truncate font-sans leading-tight">
                      {{ getBackpackShortName(idx) }}
                    </p>
                    <p class="text-[7.5px] sm:text-[8.5px] font-mono text-cyan-300 font-bold mt-0.5">
                      {{ pack.capacity }} kg
                    </p>
                  </div>

                  <!-- Dolny pasek statusu i szybkich akcji -->
                  <div class="w-full mt-0.5 pt-0.5 border-t border-slate-800/80 shrink-0">
                    <span
                      v-if="playerStore.currentBackpack.id === pack.id"
                      class="block text-[7px] sm:text-[7.5px] font-mono font-extrabold uppercase py-0.5 px-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 truncate"
                    >
                      AKTYWNY
                    </span>
                    <button
                      v-else-if="playerStore.isBackpackPurchased(pack.id)"
                      type="button"
                      @click.stop="quickEquipBackpack(pack)"
                      class="w-full text-[7px] sm:text-[7.5px] font-mono font-extrabold uppercase py-0.5 px-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/40 transition-colors cursor-pointer truncate active:scale-95"
                    >
                      ZAŁÓŻ
                    </button>
                    <button
                      v-else-if="playerStore.credits >= pack.cost"
                      type="button"
                      @click.stop="quickBuyBackpack(pack)"
                      class="w-full text-[7px] sm:text-[7.5px] font-mono font-extrabold uppercase py-0.5 px-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md active:scale-95 cursor-pointer truncate animate-pulse"
                    >
                      KUP ${{ pack.cost }}
                    </button>
                    <span
                      v-else
                      class="block text-[7.5px] sm:text-[8px] font-mono font-bold text-slate-400 py-0.5 truncate"
                    >
                      {{ pack.cost === 0 ? 'Darmowe' : `$${pack.cost}` }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- PRAWA KOLUMNA (30%): INSPEKTOR WYBRANEGO PRZEDMIOTU -->
          <div class="w-full lg:w-[32%] xl:w-[30%] bg-slate-950/80 border border-slate-800 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 lg:p-3 flex flex-col justify-between shadow-2xl min-h-[260px] lg:min-h-0 shrink-0">
            <div class="space-y-1 sm:space-y-1.5 lg:space-y-2">
              <!-- Header Inspektora -->
              <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                <span class="text-[8.5px] sm:text-[9.5px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border truncate"
                  :class="selectedEquipment.type === 'tool' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'">
                  {{ selectedEquipment.type === 'tool' ? '🧹 Narzędzie Robocze' : '🎒 Zasobnik Plecakowy' }}
                </span>
                <span
                  v-if="isSelectedActive"
                  class="text-[7.5px] sm:text-[8.5px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30"
                >
                  AKTYWNE
                </span>
                <span
                  v-else-if="isSelectedPurchased"
                  class="text-[7.5px] sm:text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30"
                >
                  W ZASOBACH
                </span>
                <span
                  v-else
                  class="text-[8.5px] sm:text-[9.5px] font-mono font-bold text-slate-300"
                >
                  Cena: ${{ selectedEquipment.item.cost }}
                </span>
              </div>

              <!-- Nazwa i Opis Fabularny -->
              <div>
                <h4 class="text-xs sm:text-sm font-bold text-slate-100 font-sans leading-tight">
                  {{ selectedEquipment.item.name }}
                </h4>
                <p class="text-[10px] sm:text-[11px] text-slate-400 font-sans mt-0.5 leading-snug line-clamp-2">
                  {{ selectedEquipment.item.description }}
                </p>
              </div>

              <!-- Porównanie Statystyk (Układ 2-wierszowy per Spec Point 3) -->
              <div class="p-1.5 sm:p-2 lg:p-2.5 rounded-lg sm:rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 font-mono">
                <div class="text-[8.5px] sm:text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  Porównanie ze sprzętem łazika:
                </div>

                <!-- Parametry Narzędzia -->
                <template v-if="selectedEquipment.type === 'tool'">
                  <!-- Parametr 1: Promień -->
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[#94A3B8] text-[9px] sm:text-[10px] uppercase tracking-wider">Promień zamiatania:</span>
                    <div class="flex items-center gap-1.5">
                      <span class="text-white font-bold font-mono text-xs sm:text-sm">{{ (selectedEquipment.item as PlayerTool).radius }} px</span>
                      <span
                        v-if="deltaRadius !== 0"
                        class="text-[9px] sm:text-[10px] font-bold font-mono px-1.5 py-0.2 rounded"
                        :class="deltaRadius > 0 ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400' : 'bg-rose-950/80 border border-rose-500/40 text-rose-400'"
                      >
                        {{ deltaRadius > 0 ? '+' : '' }}{{ deltaRadius }} px
                      </span>
                    </div>
                  </div>

                  <!-- Parametr 2: Prędkość zbierania -->
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[#94A3B8] text-[9px] sm:text-[10px] uppercase tracking-wider">Prędkość zbierania:</span>
                    <div class="flex items-center gap-1.5">
                      <span class="text-white font-bold font-mono text-xs sm:text-sm">{{ (selectedEquipment.item as PlayerTool).sweepRate }} kg/s</span>
                      <span
                        v-if="Number(deltaSweepRate) !== 0"
                        class="text-[9px] sm:text-[10px] font-bold font-mono px-1.5 py-0.2 rounded"
                        :class="Number(deltaSweepRate) > 0 ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400' : 'bg-rose-950/80 border border-rose-500/40 text-rose-400'"
                      >
                        {{ Number(deltaSweepRate) > 0 ? '+' : '' }}{{ deltaSweepRate }} kg/s
                      </span>
                    </div>
                  </div>
                </template>

                <!-- Parametry Plecaka -->
                <template v-else>
                  <!-- Parametr 1: Pojemność -->
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[#94A3B8] text-[9px] sm:text-[10px] uppercase tracking-wider">Maks. pojemność:</span>
                    <div class="flex items-center gap-1.5">
                      <span class="text-white font-bold font-mono text-xs sm:text-sm">{{ (selectedEquipment.item as PlayerBackpack).capacity }} kg</span>
                      <span
                        v-if="deltaCapacity !== 0"
                        class="text-[9px] sm:text-[10px] font-bold font-mono px-1.5 py-0.2 rounded"
                        :class="deltaCapacity > 0 ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400' : 'bg-rose-950/80 border border-rose-500/40 text-rose-400'"
                      >
                        {{ deltaCapacity > 0 ? '+' : '' }}{{ deltaCapacity }} kg
                      </span>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- Duży Przycisk Akcji na Dole Inspektora (Zawsze widoczny per Spec Point 3) -->
            <div class="pt-1.5 sm:pt-2 border-t border-slate-800 shrink-0 mt-1">
              <button
                v-if="isSelectedActive"
                type="button"
                disabled
                class="w-full py-1.5 sm:py-2 lg:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-mono font-bold bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 cursor-default"
              >
                <span>✓</span>
                <span>SPRZĘT AKTUALNIE ZAŁOŻONY</span>
              </button>

              <button
                v-else-if="isSelectedPurchased"
                type="button"
                @click="equipSelected"
                class="w-full py-1.5 sm:py-2 lg:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-mono font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>⚡</span>
                <span>ZAŁÓŻ WYPOSAŻENIE</span>
              </button>

              <button
                v-else
                type="button"
                @click="buyAndEquipSelected"
                :disabled="playerStore.credits < selectedEquipment.item.cost"
                class="w-full py-1.5 sm:py-2 lg:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
                :class="playerStore.credits >= selectedEquipment.item.cost
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 cursor-pointer animate-pulse'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'"
              >
                <span>🛒</span>
                <span>{{ playerStore.credits >= selectedEquipment.item.cost ? `KUP I WYPOSAŻ ($${selectedEquipment.item.cost})` : `BRAK KREDYTÓW ($${selectedEquipment.item.cost})` }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TAB 4: FLOTA I LOGISTYKA SWEEP-BOTÓW      -->
        <!-- ========================================== -->
        <div v-else-if="gameStore.commandHubTab === 'fleet'" class="flex-1 overflow-y-auto pr-2 min-h-0 flex flex-col gap-4 font-mono">
          <!-- Tier 2 Lock Guard -->
          <div v-if="gameStore.currentTier < 2" class="p-6 bg-slate-950/80 border border-rose-500/40 rounded-2xl flex flex-col items-center text-center gap-3">
            <span class="text-3xl">🔒</span>
            <h3 class="text-base font-bold text-rose-300 font-tech">Flota Sweep-Botów Zablokowana</h3>
            <p class="text-xs text-slate-400 font-sans max-w-md leading-relaxed">
              Wymagany <strong>Tier 2 (Faza Przemysłowa)</strong>. Ukończ kamień milowy w zakładce Badania R&D [2] lub zrealizuj dostawy brykietów, aby odblokować autonomiczne roboty sprzątające.
            </p>
          </div>

          <!-- Unlocked Fleet Hub -->
          <div v-else class="flex flex-col gap-4">
            <!-- 1. Banner Floty i Zakup Nowego Bota -->
            <div class="p-4 bg-slate-950/70 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">
                  🤖
                </div>
                <div>
                  <h3 class="text-sm font-bold text-white font-tech">Autonomiczna Flota Sweep-Botów</h3>
                  <p class="text-xs text-slate-400 font-sans">
                    Aktywne roboty w terenie: <strong class="text-emerald-400">{{ gameStore.minimapBots.length }} jednostek</strong>
                  </p>
                </div>
              </div>

              <button
                @click="deployBot"
                :disabled="playerStore.credits < BOT_DEPLOY_COST"
                class="px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                :class="playerStore.credits >= BOT_DEPLOY_COST
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 active:scale-95'
                  : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'"
              >
                <span>➕ Kup nowego Bota</span>
                <span class="font-bold text-slate-950">${{ BOT_DEPLOY_COST }}</span>
              </button>
            </div>

            <!-- 2. Ulepszenia Floty (3 Gałęzie) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <!-- Ulepszenie 1: Silniki -->
              <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between gap-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">🚀</span>
                    <div>
                      <div class="text-xs font-bold text-slate-200">Silniki Trakcyjne</div>
                      <div class="text-[10px] text-slate-400">Prędkość: {{ botSpeedLabel }}</div>
                    </div>
                  </div>
                  <span class="text-[10px] font-bold text-amber-300">Poz. {{ gameStore.botSpeedLevel }}/3</span>
                </div>
                <button
                  v-if="gameStore.botSpeedLevel < 3"
                  @click="upgradeSpeed"
                  :disabled="playerStore.credits < botSpeedCost"
                  class="w-full py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer"
                  :class="playerStore.credits >= botSpeedCost
                    ? 'bg-cyan-600/30 hover:bg-cyan-600/50 border-cyan-500/50 text-cyan-200'
                    : 'bg-slate-800 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'"
                >
                  Ulepsz (${{ botSpeedCost }})
                </button>
                <div v-else class="text-center text-xs text-emerald-400 font-bold py-1 bg-slate-900 rounded-lg">
                  MAKSYMALNY POZIOM ✓
                </div>
              </div>

              <!-- Ulepszenie 2: Szczotki -->
              <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between gap-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">🧹</span>
                    <div>
                      <div class="text-xs font-bold text-slate-200">Głowica Zamiatacza</div>
                      <div class="text-[10px] text-slate-400">Zasięg: {{ botBrushLabel }}</div>
                    </div>
                  </div>
                  <span class="text-[10px] font-bold text-amber-300">Poz. {{ gameStore.botBrushLevel }}/3</span>
                </div>
                <button
                  v-if="gameStore.botBrushLevel < 3"
                  @click="upgradeBrush"
                  :disabled="playerStore.credits < botBrushCost"
                  class="w-full py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer"
                  :class="playerStore.credits >= botBrushCost
                    ? 'bg-amber-600/30 hover:bg-amber-600/50 border-amber-500/50 text-amber-200'
                    : 'bg-slate-800 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'"
                >
                  Ulepsz (${{ botBrushCost }})
                </button>
                <div v-else class="text-center text-xs text-emerald-400 font-bold py-1 bg-slate-900 rounded-lg">
                  MAKSYMALNY POZIOM ✓
                </div>
              </div>

              <!-- Ulepszenie 3: Zbiornik -->
              <div class="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between gap-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">🎒</span>
                    <div>
                      <div class="text-xs font-bold text-slate-200">Zasobnik Pyłu</div>
                      <div class="text-[10px] text-slate-400">Pojemność: {{ botCapacityLabel }}</div>
                    </div>
                  </div>
                  <span class="text-[10px] font-bold text-amber-300">Poz. {{ gameStore.botCapacityLevel }}/3</span>
                </div>
                <button
                  v-if="gameStore.botCapacityLevel < 3"
                  @click="upgradeCapacity"
                  :disabled="playerStore.credits < botCapacityCost"
                  class="w-full py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer"
                  :class="playerStore.credits >= botCapacityCost
                    ? 'bg-purple-600/30 hover:bg-purple-600/50 border-purple-500/50 text-purple-200'
                    : 'bg-slate-800 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'"
                >
                  Ulepsz (${{ botCapacityCost }})
                </button>
                <div v-else class="text-center text-xs text-emerald-400 font-bold py-1 bg-slate-900 rounded-lg">
                  MAKSYMALNY POZIOM ✓
                </div>
              </div>
            </div>

            <!-- 3. Polityka Zrzutu Urobku (Etap 3 - SweepBot Dropoff Policy) -->
            <div class="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-lg">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold uppercase text-amber-400 tracking-wider flex items-center gap-2">
                  <span>🧭</span> Globalna Polityka Rozładunku Sweep-Botów
                </h4>
                <span class="text-[11px] text-slate-400 font-mono">Wybierz priorytet logistyczny:</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <!-- Opcja 1: silos_first -->
                <button
                  @click="gameStore.setBotDropoffPolicy('silos_first')"
                  class="p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between"
                  :class="gameStore.botDropoffPolicy === 'silos_first'
                    ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'"
                >
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs font-bold text-cyan-300">🏭 Priorytet Fabryki - Silosy</span>
                      <span v-if="gameStore.botDropoffPolicy === 'silos_first'" class="text-cyan-400 text-xs">✓</span>
                    </div>
                    <p class="text-[11px] text-slate-400 font-sans leading-snug">
                      Boty zrzucają pył do najbliższego wolnego Silosu (&lt;300 kg), zasilając taśmy i maszyny produkcyjne. Baza w ostateczności.
                    </p>
                  </div>
                  <div class="text-[9px] text-cyan-400/80 font-bold mt-2">REKOMENDOWANE DLA FABRYKI</div>
                </button>

                <!-- Opcja 2: nearest_any -->
                <button
                  @click="gameStore.setBotDropoffPolicy('nearest_any')"
                  class="p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between"
                  :class="gameStore.botDropoffPolicy === 'nearest_any'
                    ? 'bg-amber-950/40 border-amber-400 ring-1 ring-amber-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'"
                >
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs font-bold text-amber-300">🧭 Najbliższy Punkt</span>
                      <span v-if="gameStore.botDropoffPolicy === 'nearest_any'" class="text-amber-400 text-xs">✓</span>
                    </div>
                    <p class="text-[11px] text-slate-400 font-sans leading-snug">
                      Boty wybierają najbliższy geometrycznie punkt zrzutu: wolny Silos, Stację Dokującą lub Bazę Główną.
                    </p>
                  </div>
                  <div class="text-[9px] text-amber-400/80 font-bold mt-2">MINIMALNY CZAS DOJAZDU</div>
                </button>

                <!-- Opcja 3: base_only -->
                <button
                  @click="gameStore.setBotDropoffPolicy('base_only')"
                  class="p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between"
                  :class="gameStore.botDropoffPolicy === 'base_only'
                    ? 'bg-emerald-950/40 border-emerald-400 ring-1 ring-emerald-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'"
                >
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs font-bold text-emerald-300">💰 Tylko Baza (Gotówka)</span>
                      <span v-if="gameStore.botDropoffPolicy === 'base_only'" class="text-emerald-400 text-xs">✓</span>
                    </div>
                    <p class="text-[11px] text-slate-400 font-sans leading-snug">
                      Boty ignorują silosy fabryki i zawsze sprzedają urobek za kredyty ($) w Bazie Centralnej lub Dokach.
                    </p>
                  </div>
                  <div class="text-[9px] text-emerald-400/80 font-bold mt-2">MAKSYMALIZACJA KREDYTÓW</div>
                </button>
              </div>
            </div>

            <!-- 4. Lista Wybudowanych Silosów z Togglem Przyjmowania -->
            <div class="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-lg">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold uppercase text-cyan-400 tracking-wider flex items-center gap-2">
                  <span>🏛️</span> Rozmieszczone Magazyny Silo (Punkty Rozładunku)
                </h4>
                <span class="text-[10px] text-slate-400">
                  Łącznie: {{ gameStore.silosList.length }} silosów w świecie
                </span>
              </div>

              <div v-if="gameStore.silosList.length === 0" class="p-4 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-xs text-slate-400 font-sans">
                Brak postawionych Magazynów Silo. Włącz tryb budowania <strong>[2] Buduj</strong> i postaw Magazyn Silo przy linii taśmociągu, aby Sweep-Boty mogły go automatycznie zasilać!
              </div>

              <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div
                  v-for="(silo, sIdx) in gameStore.silosList"
                  :key="silo.id"
                  class="p-3 bg-slate-900/60 border rounded-xl flex items-center justify-between gap-3 transition-colors"
                  :class="silo.acceptsBots ? 'border-cyan-500/40' : 'border-slate-800 opacity-75'"
                >
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="text-sm">🏛️</span>
                      <span class="text-xs font-bold text-slate-200">Silos #{{ sIdx + 1 }}</span>
                      <span class="text-[10px] text-slate-400">[X: {{ silo.gridX }}, Y: {{ silo.gridY }}]</span>
                    </div>
                    <div class="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>Bufor pyłu:</span>
                      <strong class="text-cyan-300 font-mono">{{ silo.storedDust.toFixed(1) }} / {{ silo.maxDustCapacity }} kg</strong>
                    </div>
                    <!-- Mini progress bar -->
                    <div class="venus-progress-bar w-36 h-1.5">
                      <div
                        class="venus-progress-bar-fill bg-cyan-400"
                        :style="{ width: `${Math.min(100, (silo.storedDust / silo.maxDustCapacity) * 100)}%` }"
                      ></div>
                    </div>
                  </div>

                  <button
                    @click="gameStore.toggleSiloAcceptsBots(silo.id)"
                    class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer shrink-0"
                    :class="silo.acceptsBots
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30'
                      : 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/60'"
                  >
                    {{ silo.acceptsBots ? '🤖 Zrzuty: TAK ✓' : '🚫 Zrzuty: NIE' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TAB 5: OSIĄGNIĘCIA I KAMIENIE MILOWE -->
        <!-- ========================================== -->
        <div v-else-if="gameStore.commandHubTab === 'achievements'" class="flex-1 overflow-y-auto pr-2 min-h-0 flex flex-col gap-4">
          <!-- Global Progress Banner -->
          <div class="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
            <div class="flex-1 w-full">
              <div class="flex items-center justify-between text-xs mb-1.5">
                <span class="text-slate-300 font-sans font-medium flex items-center gap-2">
                  <span>📊</span> Całkowity postęp ekspedycji:
                </span>
                <span class="font-bold text-amber-300">
                  {{ achievementStore.unlockedCount }} / {{ achievementStore.totalCount }} ({{ achievementStore.completionPct }}%)
                </span>
              </div>
              <div class="venus-progress-bar w-full h-3">
                <div
                  class="venus-progress-bar-fill bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400"
                  :style="{ width: `${achievementStore.completionPct}%` }"
                ></div>
              </div>
            </div>

            <!-- Unclaimed Rewards Pill -->
            <div class="flex items-center gap-3">
              <div class="text-right">
                <div class="text-[10px] uppercase text-slate-400">Do odebrania:</div>
                <div class="text-sm font-bold text-emerald-400">${{ achievementStore.unclaimedRewardsTotal }}</div>
              </div>
              <button
                v-if="achievementStore.unclaimedCount > 0"
                @click="achievementStore.claimAllRewards()"
                class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
              >
                ODBIERZ WSZYSTKIE ({{ achievementStore.unclaimedCount }})
              </button>
            </div>
          </div>

          <!-- Category Filters -->
          <div class="flex items-center gap-2 overflow-x-auto text-xs font-mono">
            <button
              v-for="cat in achievementCategories"
              :key="cat.id"
              @click="achievementStore.setFilter(cat.id)"
              class="px-3 py-1.5 rounded-xl border transition cursor-pointer font-bold"
              :class="achievementStore.activeFilter === cat.id
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-200'"
            >
              {{ cat.label }}
            </button>
          </div>

          <!-- Achievement Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="ach in achievementStore.filteredAchievements"
              :key="ach.id"
              class="p-3.5 rounded-2xl border transition-all flex flex-col justify-between"
              :class="ach.isUnlocked
                ? (ach.rewardClaimed ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-emerald-950/20 border-emerald-500/60 text-slate-100 ring-1 ring-emerald-500/20')
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400'"
            >
              <div class="flex items-start gap-3">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border"
                  :class="ach.isUnlocked ? 'bg-amber-500/20 border-amber-500/40' : 'bg-slate-900 border-slate-800 text-slate-600'"
                >
                  {{ ach.icon }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <h4 class="text-xs font-bold font-sans text-slate-100 truncate">{{ ach.title }}</h4>
                    <span class="text-[10px] font-mono text-emerald-400 font-bold">+${{ ach.rewardCredits }}</span>
                  </div>
                  <p class="text-[11px] text-slate-400 font-sans mt-0.5 leading-snug">{{ ach.description }}</p>

                  <!-- Mini Progress Bar -->
                  <div class="venus-progress-bar w-full h-2 mt-2">
                    <div
                      class="venus-progress-bar-fill bg-gradient-to-r from-amber-500 to-emerald-400"
                      :style="{ width: `${Math.min(100, (ach.currentProgress / ach.maxProgress) * 100)}%` }"
                    ></div>
                  </div>
                  <div class="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-1">
                    <span>Postęp: {{ ach.currentProgress }} / {{ ach.maxProgress }}</span>
                    <span>{{ Math.round((ach.currentProgress / ach.maxProgress) * 100) }}%</span>
                  </div>
                </div>
              </div>

              <!-- Claim Button / Status -->
              <div class="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
                <span v-if="ach.isUnlocked && ach.rewardClaimed" class="text-emerald-400/80 text-[11px]">
                  ✓ Nagroda odebrana
                </span>
                <span v-else-if="!ach.isUnlocked" class="text-slate-500 text-[11px]">
                  🔒 W toku realizacji
                </span>
                <button
                  v-else
                  @click="achievementStore.claimReward(ach.id)"
                  class="w-full py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  ODBIERZ NAGRODĘ (+${{ ach.rewardCredits }})
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TAB 6: ZNALEZISKA I SONDY VENERA -->
        <!-- ========================================== -->
        <div v-else-if="gameStore.commandHubTab === 'relics'" class="flex-1 overflow-y-auto pr-2 min-h-0 flex flex-col gap-4">
          <div class="p-4 bg-slate-950/60 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
            <div>
              <div class="text-xs uppercase text-amber-400 font-bold flex items-center gap-1.5">
                <span>📜</span> DZIENNIK WYKOPALISK ARCHEOLOGICZNYCH
              </div>
              <p class="text-xs text-slate-400 font-sans mt-0.5">
                Oczyszczaj pył bazaltowy odkurzaczem, aby odkopać zaginione radzieckie próbniki atmosferyczne i lądowniki Venera.
              </p>
            </div>
            <div class="flex items-center gap-3 text-xs font-mono">
              <span class="text-slate-400">Odkryte:</span>
              <span class="text-base font-bold text-amber-300">{{ relicsDiscoveredCount }} / {{ relicsTotalCount }}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="relic in relicsDisplayList"
              :key="relic.id"
              class="p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3"
              :class="relic.isAnalyzed
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : (relic.isUncovered
                  ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-950/60 border-slate-800 opacity-75')"
            >
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <span>{{ relic.isAnalyzed || relic.isUncovered ? '✅' : '🔒' }}</span>
                    <span>{{ relic.name }}</span>
                    <span class="text-xs text-slate-400 font-mono">({{ relic.year }})</span>
                  </span>
                  <span
                    class="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase"
                    :class="relic.isAnalyzed || relic.isUncovered
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-500'"
                  >
                    {{ relic.isAnalyzed || relic.isUncovered ? 'Odzyskany & Zbadany' : 'Zasypany pyłem' }}
                  </span>
                </div>

                <p class="text-xs font-sans text-slate-300 leading-relaxed">
                  {{ relic.description }}
                </p>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs font-mono">
                <span class="text-slate-400">Premia naukowa za analizę:</span>
                <span class="font-bold text-emerald-400">+{{ relic.rewardCredits }} CR</span>
              </div>

              <!-- Tech Perk Badge -->
              <div
                v-if="relic.perkInfo"
                class="p-2 rounded-xl border flex items-center justify-between text-xs font-mono"
                :class="relic.isAnalyzed
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500'"
              >
                <span class="font-bold flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>{{ relic.perkInfo.name }}</span>
                </span>
                <span class="text-[11px] font-sans" :class="relic.isAnalyzed ? 'text-emerald-400 font-bold' : 'text-slate-500'">
                  {{ relic.isAnalyzed ? `AKTYWNY: ${relic.perkInfo.desc}` : `Odblokuje: ${relic.perkInfo.desc}` }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TAB 7: 🗺️ INTERAKTYWNA MAPA PLANETY [M / 7] -->
        <!-- ========================================== -->
        <div v-else-if="gameStore.commandHubTab === 'map'" class="flex-1 h-full min-h-0 flex flex-col relative overflow-hidden bg-slate-950/90 rounded-2xl border border-slate-800">
          <!-- Tactical Map Top Controls Bar -->
          <div class="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono shrink-0 select-none z-10">
            <div class="flex items-center gap-3">
              <span class="text-amber-300 font-bold flex items-center gap-1.5">
                <span>🪐</span>
                <span>WENUS: SEKTOR 0-A (6144 x 6144 px)</span>
              </span>
              <span class="text-slate-600">|</span>
              <span class="text-slate-400">
                Oczyszczone sektory:
                <strong class="text-cyan-300">{{ gameStore.claimedSectorsCount }}</strong> / {{ gameStore.minimapSectors.length || 144 }}
                <strong class="text-emerald-400 ml-1">({{ gameStore.percentCleaned }}%)</strong>
              </span>
            </div>

            <!-- Map View Controls & Tools -->
            <div class="flex items-center gap-2">
              <button
                @click="zoomInMap"
                class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer font-bold"
                title="Przybliż [+]"
              >
                ➕
              </button>
              <button
                @click="zoomOutMap"
                class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer font-bold"
                title="Oddal [-]"
              >
                ➖
              </button>
              <button
                @click="centerMapOnPlayer"
                class="px-3 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 transition cursor-pointer font-bold flex items-center gap-1"
                title="Wycentruj widok na łaziku"
              >
                <span>🎯</span>
                <span>Łazik</span>
              </button>
              <button
                @click="fitWholePlanetMap"
                class="px-3 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 transition cursor-pointer font-bold flex items-center gap-1"
                title="Pokaż całą planetę"
              >
                <span>🌐</span>
                <span>Cała Planeta</span>
              </button>
            </div>
          </div>

          <!-- Interactive Map Canvas Container (Drag to pan, wheel to zoom) -->
          <div
            ref="mapContainerRef"
            class="flex-1 w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing bg-[#090d16]"
            @mousedown="startMapPan"
            @mousemove="handleMapMouseMove"
            @mouseup="endMapPan"
            @mouseleave="endMapPan"
            @wheel.prevent="handleMapWheel"
          >
            <canvas
              ref="planetMapCanvas"
              class="w-full h-full block"
            ></canvas>

            <!-- Bottom Tactical Legend Overlay -->
            <div class="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-xl px-3 py-2 flex items-center gap-3 text-[10px] font-mono text-slate-300 pointer-events-none shadow-xl">
              <span class="flex items-center gap-1">
                <span class="w-2.5 h-2.5 rounded-sm bg-sky-400"></span>
                <span>Oczyszczony Sektor</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                <span>W Trakcie Prac</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>Łazik</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span>Sweep-Boty</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Kratery</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
                <span>Baza & Silosy</span>
              </span>
            </div>

            <!-- Hovered Sector Floating Card -->
            <div
              v-if="hoveredSectorInfo"
              class="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-md border border-cyan-500/50 rounded-xl p-3 shadow-2xl font-mono text-xs text-slate-200 pointer-events-none min-w-[200px]"
            >
              <div class="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
                <span class="text-cyan-400 font-bold">{{ hoveredSectorInfo.id }}</span>
                <span
                  class="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase"
                  :class="hoveredSectorInfo.isClaimed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'"
                >
                  {{ hoveredSectorInfo.isClaimed ? 'OCZYSZCZONY' : 'DO SPRZĄTANIA' }}
                </span>
              </div>
              <div class="space-y-1 text-[11px]">
                <div class="flex justify-between">
                  <span class="text-slate-400">Czystość:</span>
                  <span class="font-bold text-amber-300">{{ hoveredSectorInfo.cleanPct.toFixed(1) }}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Współrzędne:</span>
                  <span class="text-slate-300">X:{{ hoveredSectorInfo.cx }} Y:{{ hoveredSectorInfo.cy }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer (Responsive: compact on laptop) -->
      <div class="px-3 sm:px-5 py-1.5 sm:py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[10px] sm:text-xs font-mono text-slate-400 shrink-0">
        <div class="flex items-center gap-2 sm:gap-3">
          <span>Skróty: <kbd class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 text-[9px] sm:text-[10px]">1-7</kbd> zakładki</span>
          <span class="text-slate-600 hidden sm:inline">|</span>
          <span class="hidden sm:inline"><kbd class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 text-[9px] sm:text-[10px]">M</kbd> mapa</span>
          <span class="text-slate-600 hidden md:inline">|</span>
          <span class="hidden md:inline"><kbd class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 text-[9px] sm:text-[10px]">C</kbd> / <kbd class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 text-[9px] sm:text-[10px]">ESC</kbd> zamknij</span>
        </div>
        <button
          @click="gameStore.closeCommandHub()"
          class="px-3 sm:px-4 py-1 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg sm:rounded-xl border border-slate-700 cursor-pointer transition font-bold text-xs"
        >
          Powrót do gry
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useGameStore, type CommandHubTabType } from '@/stores/useGameStore';
import { usePlayerStore, AVAILABLE_TOOLS, AVAILABLE_BACKPACKS, type PlayerTool, type PlayerBackpack } from '@/stores/usePlayerStore';
import { useContractStore } from '@/stores/useContractStore';
import { useAchievementStore } from '@/stores/useAchievementStore';
import { VENERA_RELIC_TEMPLATES } from '@/engine/archaeology/VeneraArchaeologySystem';
import type { AchievementCategory } from '@/engine/achievements/AchievementTypes';

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const contractStore = useContractStore();
const achievementStore = useAchievementStore();

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

const tabList: Array<{ id: CommandHubTabType; label: string; icon: string; key: string }> = [
  { id: 'stats', label: 'Statystyki', icon: '📊', key: '1' },
  { id: 'tech', label: 'Badania R&D', icon: '🔬', key: '2' },
  { id: 'shop', label: 'Wyposażenie', icon: '🛒', key: '3' },
  { id: 'fleet', label: 'Flota i Logistyka', icon: '🤖', key: '4' },
  { id: 'achievements', label: 'Osiągnięcia', icon: '🏆', key: '5' },
  { id: 'relics', label: 'Sondy Venera', icon: '🏺', key: '6' },
  { id: 'map', label: 'Mapa Planety', icon: '🗺️', key: '7' },
];

const achievementCategories: Array<{ id: 'all' | AchievementCategory; label: string }> = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'cleaning', label: '🧹 Oczyszczanie' },
  { id: 'exploration', label: '🗺️ Eksploracja' },
  { id: 'automation', label: '⚡ Automatyzacja' },
  { id: 'survival', label: '🌡️ Przetrwanie' },
  { id: 'endgame', label: '🚀 Winda Kosmiczna' },
];

// Rover status helpers
const roverStatusColor = computed(() => {
  if (playerStore.isBackpackFull) return 'bg-rose-500 animate-pulse';
  if (gameStore.isSweeping) return 'bg-cyan-400 animate-ping';
  return 'bg-emerald-400';
});

const roverStatusTextColor = computed(() => {
  if (playerStore.isBackpackFull) return 'text-rose-400 animate-pulse';
  if (gameStore.isSweeping) return 'text-cyan-300';
  return 'text-slate-300';
});

const roverStatusLabel = computed(() => {
  if (playerStore.isBackpackFull) return 'ZBIORNIK PEŁNY';
  if (gameStore.isSweeping) return 'ZAMIATANIE W TOKU';
  return 'OCZEKIWANIE (GOTOWY)';
});

const roverStatusSubtext = computed(() => {
  if (playerStore.isBackpackFull) return 'Wymaga rozładunku w Bazie Centralnej lub Silosie.';
  if (gameStore.isSweeping) return 'Narzędzie aktywne, pobór energii z akumulatora.';
  return 'Użyj LPM lub Spacji, aby rozpocząć zbieranie pyłu bazaltowego.';
});

const muleStatusLabel = computed(() => {
  switch (gameStore.muleStatus) {
    case 'FLYING_TO_PLAYER': return 'Dolot do gracza';
    case 'EXTRACTING': return 'Odsysanie pyłu';
    case 'RETURNING': return 'Powrót do bazy';
    case 'UNLOADING': return 'Rozładunek w silosie';
    default: return 'W stacji dokującej (Wezwij klawiszem G)';
  }
});

// Tech Tree helpers
const isTierUnlocked = (tier: number) => {
  return gameStore.unlockedTiers.includes(tier);
};

const unlockTier = (tier: number, cost: number) => {
  if (playerStore.credits >= cost) {
    playerStore.spendCredits(cost);
    gameStore.unlockTier(tier);
    gameStore.showBanner(`🏆 ODBLOKOWANO TIER ${tier} TECHNOLOGII!`, 'success');
    window.dispatchEvent(new CustomEvent('venus-tier-unlocked', { detail: { tier } }));
  }
};

const unlockTierWithItems = (tier: number, requiredCount: number, itemType: 'briquettes' | 'plates') => {
  const current = itemType === 'briquettes' ? gameStore.deliveredBriquettes : gameStore.deliveredPlates;
  if (current >= requiredCount) {
    gameStore.unlockTier(tier);
    gameStore.showBanner(`🏭 ODBLOKOWANO TIER ${tier} DZIĘKI DOSTAWIE PREFABRYKATÓW!`, 'success');
    window.dispatchEvent(new CustomEvent('venus-tier-unlocked', { detail: { tier } }));
  }
};

const launchRocket = () => {
  gameStore.launchRocket();
  gameStore.closeCommandHub();
  gameStore.showBanner(`🚀 RAKIETA ORBITALNA WYSTARTOWAŁA! MISJA WENUS ZAKOŃCZONA SUKCESEM!`, 'success', 8000);
  window.dispatchEvent(new CustomEvent('venus-launch-rocket'));
};

// Relics helpers
const relicsTotalCount = computed(() => gameStore.totalRelicsCount || 6);
const relicsDiscoveredCount = computed(() =>
  gameStore.discoveredRelicsCount || gameStore.minimapRelics.filter(r => r.isUncovered || r.isAnalyzed).length
);

const PERK_DEFINITIONS: Record<string, { id: string; name: string; desc: string }> = {
  'RELIC-VENERA-7': { id: 'venera_titanium_insulation', name: 'Tytanowa Izolacja', desc: '+25% chłodzenia' },
  'RELIC-VENERA-9': { id: 'venera_optical_optics', name: 'Optyka Panoramiczna', desc: '+20% widzenia i radaru' },
  'RELIC-VENERA-13': { id: 'venera_acoustic_collector', name: 'Kolektor Ciśnieniowy', desc: '+15% prędkości szczotki' },
  'RELIC-VENERA-14': { id: 'venera_seismic_resonance', name: 'Rezonans Sejsmiczny', desc: '+30% zasięgu wykrywania surowców' },
  'RELIC-VEGA-1': { id: 'vega_acid_neutralizer', name: 'Neutralizator Kwasu', desc: '+25% odporności pancerza' },
  'RELIC-VEGA-2': { id: 'aphrodite_market_uplink', name: 'Łącze Handlowe', desc: '+15% cen skupu surowców' },
};

const relicsDisplayList = computed(() => {
  return VENERA_RELIC_TEMPLATES.map((tmpl, idx) => {
    const live = gameStore.relicsList.find(r => r.id === tmpl.id);
    const minimapItem = gameStore.minimapRelics[idx];
    const isUncovered = live?.isUncovered ?? minimapItem?.isUncovered ?? false;
    const isAnalyzed = live?.isAnalyzed ?? minimapItem?.isAnalyzed ?? false;
    const perkInfo = PERK_DEFINITIONS[tmpl.id];

    return {
      ...tmpl,
      isUncovered,
      isAnalyzed,
      perkInfo,
    };
  });
});

// =========================================================================
// ETAP 1 & 2: WYPOSAŻENIE (MASTER-DETAIL) ORAZ FLOTA I LOGISTYKA
// =========================================================================

// Equipment Inspector (Master-Detail)
const selectedEquipment = ref<{ type: 'tool' | 'backpack'; item: PlayerTool | PlayerBackpack }>({
  type: 'tool',
  item: playerStore.currentTool,
});

const selectTool = (tool: PlayerTool) => {
  const isAlreadySelected = selectedEquipment.value.type === 'tool' && selectedEquipment.value.item.id === tool.id;
  selectedEquipment.value = { type: 'tool', item: tool };

  if (playerStore.isToolPurchased(tool.id)) {
    if (playerStore.currentTool.id !== tool.id) {
      playerStore.equipTool(tool);
      gameStore.showBanner(`🔧 Wyposażono: ${tool.name}`, 'info');
    }
  } else if (isAlreadySelected && playerStore.credits >= tool.cost) {
    buyAndEquipSelected();
  }
};

const quickEquipTool = (tool: PlayerTool) => {
  selectedEquipment.value = { type: 'tool', item: tool };
  playerStore.equipTool(tool);
  gameStore.showBanner(`🔧 Wyposażono: ${tool.name}`, 'info');
};

const quickBuyTool = (tool: PlayerTool) => {
  selectedEquipment.value = { type: 'tool', item: tool };
  if (playerStore.buyTool(tool)) {
    gameStore.showBanner(`🛒 Zakupiono i wyposażono: ${tool.name}`, 'success');
  } else {
    gameStore.showBanner(`❌ Niewystarczająca ilość kredytów na ${tool.name} (wymagane $${tool.cost})`, 'warning');
  }
};

const selectBackpack = (pack: PlayerBackpack) => {
  const isAlreadySelected = selectedEquipment.value.type === 'backpack' && selectedEquipment.value.item.id === pack.id;
  selectedEquipment.value = { type: 'backpack', item: pack };

  if (playerStore.isBackpackPurchased(pack.id)) {
    if (playerStore.currentBackpack.id !== pack.id) {
      playerStore.equipBackpack(pack);
      gameStore.showBanner(`🎒 Założono: ${pack.name}`, 'info');
    }
  } else if (isAlreadySelected && playerStore.credits >= pack.cost) {
    buyAndEquipSelected();
  }
};

const quickEquipBackpack = (pack: PlayerBackpack) => {
  selectedEquipment.value = { type: 'backpack', item: pack };
  playerStore.equipBackpack(pack);
  gameStore.showBanner(`🎒 Założono: ${pack.name}`, 'info');
};

const quickBuyBackpack = (pack: PlayerBackpack) => {
  selectedEquipment.value = { type: 'backpack', item: pack };
  if (playerStore.buyBackpack(pack)) {
    gameStore.showBanner(`🛒 Zakupiono i wyposażono: ${pack.name}`, 'success');
  } else {
    gameStore.showBanner(`❌ Niewystarczająca ilość kredytów na ${pack.name} (wymagane $${pack.cost})`, 'warning');
  }
};

const isSelectedActive = computed(() => {
  if (selectedEquipment.value.type === 'tool') {
    return playerStore.currentTool.id === selectedEquipment.value.item.id;
  }
  return playerStore.currentBackpack.id === selectedEquipment.value.item.id;
});

const isSelectedPurchased = computed(() => {
  if (selectedEquipment.value.type === 'tool') {
    return playerStore.isToolPurchased(selectedEquipment.value.item.id);
  }
  return playerStore.isBackpackPurchased(selectedEquipment.value.item.id);
});

const deltaRadius = computed(() => {
  if (selectedEquipment.value.type === 'tool') {
    return (selectedEquipment.value.item as PlayerTool).radius - playerStore.currentTool.radius;
  }
  return 0;
});

const deltaSweepRate = computed(() => {
  if (selectedEquipment.value.type === 'tool') {
    return ((selectedEquipment.value.item as PlayerTool).sweepRate - playerStore.currentTool.sweepRate).toFixed(1);
  }
  return '0.0';
});

const deltaCapacity = computed(() => {
  if (selectedEquipment.value.type === 'backpack') {
    return (selectedEquipment.value.item as PlayerBackpack).capacity - playerStore.currentBackpack.capacity;
  }
  return 0;
});

const buyAndEquipSelected = () => {
  if (selectedEquipment.value.type === 'tool') {
    const t = selectedEquipment.value.item as PlayerTool;
    if (playerStore.buyTool(t)) {
      gameStore.showBanner(`🛒 Zakupiono i wyposażono: ${t.name}`, 'success');
    } else {
      gameStore.showBanner(`❌ Niewystarczająca ilość kredytów na ${t.name} (wymagane $${t.cost})`, 'warning');
    }
  } else {
    const b = selectedEquipment.value.item as PlayerBackpack;
    if (playerStore.buyBackpack(b)) {
      gameStore.showBanner(`🛒 Zakupiono i wyposażono: ${b.name}`, 'success');
    } else {
      gameStore.showBanner(`❌ Niewystarczająca ilość kredytów na ${b.name} (wymagane $${b.cost})`, 'warning');
    }
  }
};

const equipSelected = () => {
  if (selectedEquipment.value.type === 'tool') {
    const t = selectedEquipment.value.item as PlayerTool;
    playerStore.equipTool(t);
    gameStore.showBanner(`🔧 Wyposażono: ${t.name}`, 'info');
  } else {
    const b = selectedEquipment.value.item as PlayerBackpack;
    playerStore.equipBackpack(b);
    gameStore.showBanner(`🎒 Założono: ${b.name}`, 'info');
  }
};

const toolShortNames = [
  'Skrobak Ręczny',
  'Szczotka Komp.',
  'Miotła Szeroka',
  'Turbina Ssąca',
  'Odkurzacz Wir.',
  'Mega-Harvester',
];

const backpackShortNames = [
  'Zasobnik Starter',
  'Zasobnik Wzmoc.',
  'Zbiornik Ciśn.',
  'Kontener Komp.',
  'Tytanowy Mag.',
  'Zbiornik Atlas',
];

const getToolShortName = (idx: number) => toolShortNames[idx] ?? `Narzędzie T${idx + 1}`;
const getBackpackShortName = (idx: number) => backpackShortNames[idx] ?? `Zasobnik T${idx + 1}`;

// Fleet & Logistics Hub helpers
const BOT_DEPLOY_COST = 120;
const botSpeedCost = computed(() => gameStore.botSpeedLevel === 1 ? 60 : 150);
const botBrushCost = computed(() => gameStore.botBrushLevel === 1 ? 50 : 120);
const botCapacityCost = computed(() => gameStore.botCapacityLevel === 1 ? 70 : 160);

const botSpeedLabel = computed(() => {
  if (gameStore.botSpeedLevel === 1) return '90 px/s';
  if (gameStore.botSpeedLevel === 2) return '135 px/s';
  return '180 px/s (Max)';
});

const botBrushLabel = computed(() => {
  if (gameStore.botBrushLevel === 1) return 'Szczotki 28 px';
  if (gameStore.botBrushLevel === 2) return 'Zgarniacz 44 px';
  return 'Turbina 64 px';
});

const botCapacityLabel = computed(() => {
  if (gameStore.botCapacityLevel === 1) return '15 kg';
  if (gameStore.botCapacityLevel === 2) return '35 kg';
  return '80 kg';
});

const deployBot = () => {
  if (playerStore.credits >= BOT_DEPLOY_COST) {
    playerStore.spendCredits(BOT_DEPLOY_COST);
    window.dispatchEvent(new CustomEvent('venus-deploy-bot'));
    gameStore.showBanner('🤖 WYPUSZCZONO NOWEGO SWEEP-BOTA!', 'success');
  }
};

const upgradeSpeed = () => {
  if (gameStore.upgradeBotSpeed(botSpeedCost.value)) {
    window.dispatchEvent(new CustomEvent('venus-upgrade-bot'));
  }
};

const upgradeBrush = () => {
  if (gameStore.upgradeBotBrush(botBrushCost.value)) {
    window.dispatchEvent(new CustomEvent('venus-upgrade-bot'));
  }
};

const upgradeCapacity = () => {
  if (gameStore.upgradeBotCapacity(botCapacityCost.value)) {
    window.dispatchEvent(new CustomEvent('venus-upgrade-bot'));
  }
};

// ==========================================
// INTERACTIVE PLANETARY MAP STATE & METHODS
// ==========================================
const mapContainerRef = ref<HTMLDivElement | null>(null);
const planetMapCanvas = ref<HTMLCanvasElement | null>(null);
const mapZoom = ref(0.11); // Initial zoom fits 6144 world into canvas
const mapPan = ref({ x: 0, y: 0 });
const isPanning = ref(false);
let panStart = { x: 0, y: 0 };
const hoveredSectorInfo = ref<{ id: string; cleanPct: number; cx: number; cy: number; isClaimed: boolean } | null>(null);

const WORLD_W = 6144;
const WORLD_H = 6144;

const fitWholePlanetMap = () => {
  const container = mapContainerRef.value;
  if (!container) return;
  const cw = container.clientWidth || 800;
  const ch = container.clientHeight || 500;
  const fitZoom = Math.min((cw - 40) / WORLD_W, (ch - 40) / WORLD_H);
  mapZoom.value = Math.max(0.06, fitZoom);
  mapPan.value = {
    x: cw / 2 - (WORLD_W / 2) * mapZoom.value,
    y: ch / 2 - (WORLD_H / 2) * mapZoom.value,
  };
  renderPlanetMap();
};

const centerMapOnPlayer = () => {
  const container = mapContainerRef.value;
  if (!container) return;
  const cw = container.clientWidth || 800;
  const ch = container.clientHeight || 500;
  const px = gameStore.playerCoords?.x ?? 3072;
  const py = gameStore.playerCoords?.y ?? 3072;
  mapZoom.value = 0.35;
  mapPan.value = {
    x: cw / 2 - px * mapZoom.value,
    y: ch / 2 - py * mapZoom.value,
  };
  renderPlanetMap();
};

const zoomInMap = () => {
  const container = mapContainerRef.value;
  const cw = container ? container.clientWidth / 2 : 400;
  const ch = container ? container.clientHeight / 2 : 300;
  const newZoom = Math.min(1.8, mapZoom.value * 1.3);
  mapPan.value.x = cw - (cw - mapPan.value.x) * (newZoom / mapZoom.value);
  mapPan.value.y = ch - (ch - mapPan.value.y) * (newZoom / mapZoom.value);
  mapZoom.value = newZoom;
  renderPlanetMap();
};

const zoomOutMap = () => {
  const container = mapContainerRef.value;
  const cw = container ? container.clientWidth / 2 : 400;
  const ch = container ? container.clientHeight / 2 : 300;
  const newZoom = Math.max(0.05, mapZoom.value / 1.3);
  mapPan.value.x = cw - (cw - mapPan.value.x) * (newZoom / mapZoom.value);
  mapPan.value.y = ch - (ch - mapPan.value.y) * (newZoom / mapZoom.value);
  mapZoom.value = newZoom;
  renderPlanetMap();
};

const startMapPan = (e: MouseEvent) => {
  if (e.button !== 0) return;
  isPanning.value = true;
  panStart = { x: e.clientX - mapPan.value.x, y: e.clientY - mapPan.value.y };
};

const handleMapMouseMove = (e: MouseEvent) => {
  if (isPanning.value) {
    mapPan.value = {
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    };
    renderPlanetMap();
  }

  const canvas = planetMapCanvas.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mouseCanvasX = e.clientX - rect.left;
  const mouseCanvasY = e.clientY - rect.top;
  const worldX = (mouseCanvasX - mapPan.value.x) / mapZoom.value;
  const worldY = (mouseCanvasY - mapPan.value.y) / mapZoom.value;

  let foundSector: any = null;
  for (const s of gameStore.minimapSectors) {
    const dx = Math.abs(worldX - s.cx);
    const dy = Math.abs(worldY - s.cy);
    if (dx + dy <= 256) {
      foundSector = s;
      break;
    }
  }
  hoveredSectorInfo.value = foundSector;
};

const endMapPan = () => {
  isPanning.value = false;
};

const handleMapWheel = (e: WheelEvent) => {
  const canvas = planetMapCanvas.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const zoomFactor = e.deltaY < 0 ? 1.2 : 0.833;
  const newZoom = Math.max(0.05, Math.min(2.0, mapZoom.value * zoomFactor));

  mapPan.value.x = mouseX - (mouseX - mapPan.value.x) * (newZoom / mapZoom.value);
  mapPan.value.y = mouseY - (mouseY - mapPan.value.y) * (newZoom / mapZoom.value);
  mapZoom.value = newZoom;

  renderPlanetMap();
};

const renderPlanetMap = () => {
  const canvas = planetMapCanvas.value;
  const container = mapContainerRef.value;
  if (!canvas || !container) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;

  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#070a12';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(mapPan.value.x, mapPan.value.y);
  ctx.scale(mapZoom.value, mapZoom.value);

  // 1. World Boundary Outline & Desert Fill
  ctx.fillStyle = '#100e17';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 4 / mapZoom.value;
  ctx.strokeRect(0, 0, WORLD_W, WORLD_H);

  // 2. Concentric Valheim/Factorio Danger Rings from (3072, 3072)
  const baseCX = 3072;
  const baseCY = 3072;

  // Zone 0: Safe Oasis (750px)
  ctx.beginPath();
  ctx.arc(baseCX, baseCY, 750, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.25)';
  ctx.lineWidth = 2 / mapZoom.value;
  ctx.stroke();

  // Zone 1: Extinct Terraces (1750px)
  ctx.beginPath();
  ctx.arc(baseCX, baseCY, 1750, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.2)';
  ctx.lineWidth = 2 / mapZoom.value;
  ctx.stroke();

  // Zone 2: Active Calderas (2650px)
  ctx.beginPath();
  ctx.arc(baseCX, baseCY, 2650, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
  ctx.lineWidth = 2 / mapZoom.value;
  ctx.stroke();

  // 3. Draw Sectors (Rhombus 512px)
  const hw = 256;
  const hh = 256;
  for (const s of gameStore.minimapSectors) {
    ctx.beginPath();
    ctx.moveTo(s.cx, s.cy - hh);
    ctx.lineTo(s.cx + hw, s.cy);
    ctx.lineTo(s.cx, s.cy + hh);
    ctx.lineTo(s.cx - hw, s.cy);
    ctx.closePath();

    if (s.isClaimed) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.40)';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3 / mapZoom.value;
      ctx.stroke();
    } else if (s.cleanPct > 5) {
      const alpha = Math.min(0.5, (s.cleanPct / 100) * 0.5);
      ctx.fillStyle = `rgba(245, 158, 11, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 2 / mapZoom.value;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
      ctx.lineWidth = 1 / mapZoom.value;
      ctx.stroke();
    }

    if (mapZoom.value > 0.15) {
      ctx.fillStyle = s.isClaimed ? '#7dd3fc' : (s.cleanPct > 5 ? '#fde047' : '#64748b');
      ctx.font = `bold ${Math.max(10, 14 / mapZoom.value)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = s.isClaimed ? '✓ 100%' : (s.cleanPct > 0 ? `${s.cleanPct.toFixed(0)}%` : '');
      if (label) {
        ctx.fillText(label, s.cx, s.cy);
      }
    }
  }

  // 4. Draw Craters
  for (const cr of gameStore.minimapCraters) {
    ctx.beginPath();
    ctx.arc(cr.x, cr.y, cr.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3 / mapZoom.value;
    ctx.stroke();
  }

  // 5. Base Depot (Center)
  ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
  const baseSize = 80;
  ctx.fillRect(baseCX - baseSize / 2, baseCY - baseSize / 2, baseSize, baseSize);
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 4 / mapZoom.value;
  ctx.strokeRect(baseCX - baseSize / 2, baseCY - baseSize / 2, baseSize, baseSize);

  // 6. Active Silos
  for (const silo of gameStore.silosList) {
    const siloX = (silo.gridX + 1) * 32;
    const siloY = (silo.gridY + 1) * 32;
    ctx.fillStyle = silo.acceptsBots ? '#38bdf8' : '#94a3b8';
    const sSize = 40;
    ctx.fillRect(siloX - sSize / 2, siloY - sSize / 2, sSize, sSize);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / mapZoom.value;
    ctx.strokeRect(siloX - sSize / 2, siloY - sSize / 2, sSize, sSize);
  }

  // 7. Venera Relics
  for (const r of gameStore.minimapRelics) {
    ctx.beginPath();
    ctx.arc(r.x, r.y, 25, 0, Math.PI * 2);
    ctx.fillStyle = r.isAnalyzed ? '#22c55e' : (r.isUncovered ? '#f59e0b' : '#9333ea');
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / mapZoom.value;
    ctx.stroke();
  }

  // 8. Sweep-Bots
  for (const bot of gameStore.minimapBots) {
    ctx.beginPath();
    ctx.arc(bot.x, bot.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / mapZoom.value;
    ctx.stroke();
  }

  // 9. Player Rover Position & Heading
  const px = gameStore.playerCoords?.x ?? 3072;
  const py = gameStore.playerCoords?.y ?? 3072;
  const rot = gameStore.playerRotation ?? 0;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot);

  ctx.beginPath();
  const arrSize = 35;
  ctx.moveTo(arrSize, 0);
  ctx.lineTo(-arrSize * 0.7, -arrSize * 0.5);
  ctx.lineTo(-arrSize * 0.4, 0);
  ctx.lineTo(-arrSize * 0.7, arrSize * 0.5);
  ctx.closePath();
  ctx.fillStyle = '#22c55e';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3 / mapZoom.value;
  ctx.stroke();

  ctx.restore();

  ctx.restore();
  ctx.restore();
};

watch(() => gameStore.commandHubTab, (tab) => {
  if (tab === 'map') {
    nextTick(() => {
      fitWholePlanetMap();
    });
  }
});
</script>
