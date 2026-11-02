import React from 'react';
import { Sliders, RotateCcw } from 'lucide-react';
import type { AudioFilters, EqualizerPreset, BassBoostLevel } from '../types/musicTypes';
import { PresetEqualizerSelector } from './filters/presetEqualizerSelector';
import { CustomEqualizerBands } from './filters/customEqualizerBands';
import { BassBoostSelector } from './filters/bassBoostSelector';
import { AudioEffectsControls } from './filters/audioEffectsControls';

interface FilterEqualizerViewProps {
  filters: AudioFilters | undefined;
  onApplyFilter: (key: string, value: unknown) => void;
  onResetFilters: () => void;
}

const PRESET_BANDS: Record<string, number[]> = {
  off: [0, 0, 0, 0, 0],
  pop: [2, 3, 4, 3, 2],
  rock: [5, 3, -2, 4, 5],
  classical: [4, 2, -1, 3, 4],
  jazz: [3, 2, 1, 2, 4],
  electronic: [6, 4, 0, 3, 5],
  vocal: [-3, -1, 5, 4, 1],
};

export const FilterEqualizerView: React.FC<FilterEqualizerViewProps> = ({
  filters,
  onApplyFilter,
  onResetFilters,
}) => {
  const currentFilters: AudioFilters = filters || {
    bass_boost: 'off',
    equalizer: 'off',
    nightcore: false,
    vaporwave: false,
    speed: 1.0,
    treble: 0,
    karaoke: false,
  };

  const handleSelectPreset = (presetId: EqualizerPreset) => {
    if (presetId === 'custom') {
      const activeBands = currentFilters.custom_eq && currentFilters.custom_eq.length === 5
        ? currentFilters.custom_eq
        : [0, 0, 0, 0, 0];
      onApplyFilter('custom_eq', activeBands);
    } else {
      onApplyFilter('equalizer', presetId);
    }
  };

  const handleCustomBandsChange = (updatedBands: number[]) => {
    onApplyFilter('custom_eq', updatedBands);
  };

  const handleCustomBandsReset = () => {
    onApplyFilter('custom_eq', [0, 0, 0, 0, 0]);
  };

  const activeBands = currentFilters.custom_eq && currentFilters.custom_eq.length === 5
    ? currentFilters.custom_eq
    : (PRESET_BANDS[currentFilters.equalizer] || [0, 0, 0, 0, 0]);

  return (
    <div className="max-w-[960px] mx-auto pb-10 animate-fade-in">
      {/* Title & Reset Button */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <Sliders size={22} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">
              Audio Filter & Equalizer
            </h1>
            <p className="text-[13px] text-slate-400 mt-0.5">
              Pengaturan filter tersimpan permanen per-user dan otomatis disinkronkan saat lagu diputar.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetFilters}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#131E30] hover:bg-[#1A263B] border border-slate-700/40 text-slate-300 hover:text-slate-100 text-[12.5px] font-semibold cursor-pointer transition-colors"
        >
          <RotateCcw size={14} />
          <span>Reset Semua Filter</span>
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* 1. Preset Equalizer */}
        <PresetEqualizerSelector
          currentPreset={currentFilters.equalizer}
          onSelectPreset={handleSelectPreset}
        />

        {/* 2. Custom 5-Band Sliders */}
        <CustomEqualizerBands
          bands={activeBands}
          onChange={handleCustomBandsChange}
          onReset={handleCustomBandsReset}
        />

        {/* 3. Bass Boost Selection */}
        <BassBoostSelector
          currentLevel={currentFilters.bass_boost}
          onSelectLevel={(level: BassBoostLevel) => onApplyFilter('bass_boost', level)}
        />

        {/* 4. Speed, Treble & Toggle Modes */}
        <AudioEffectsControls
          speed={currentFilters.speed}
          treble={currentFilters.treble}
          nightcore={currentFilters.nightcore}
          vaporwave={currentFilters.vaporwave}
          karaoke={currentFilters.karaoke}
          onChangeSpeed={(val) => onApplyFilter('speed', val)}
          onChangeTreble={(val) => onApplyFilter('treble', val)}
          onToggleNightcore={() => onApplyFilter('nightcore', !currentFilters.nightcore)}
          onToggleVaporwave={() => onApplyFilter('vaporwave', !currentFilters.vaporwave)}
          onToggleKaraoke={() => onApplyFilter('karaoke', !currentFilters.karaoke)}
        />
      </div>
    </div>
  );
};
