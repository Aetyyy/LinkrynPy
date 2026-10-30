import React, { useState, useEffect } from 'react';
import { Sliders, RotateCcw, Sparkles, Disc, Radio, SlidersHorizontal } from 'lucide-react';
import { AudioFilters, BassBoostLevel, EqualizerPreset } from '../types/music';

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

const FREQ_BANDS = [
  { label: '60 Hz', desc: 'Sub-Bass' },
  { label: '230 Hz', desc: 'Bass' },
  { label: '910 Hz', desc: 'Mid/Vokal' },
  { label: '3.6 kHz', desc: 'Presence' },
  { label: '14 kHz', desc: 'Treble/Air' },
];

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

  const bassBoostOptions: { id: BassBoostLevel; label: string; desc: string }[] = [
    { id: 'off', label: 'Off', desc: 'Normal' },
    { id: 'soft', label: 'Soft', desc: '+6 dB' },
    { id: 'medium', label: 'Medium', desc: '+11 dB' },
    { id: 'hard', label: 'Hard', desc: '+16 dB (Punchy)' },
  ];

  const eqPresets: { id: EqualizerPreset; label: string }[] = [
    { id: 'off', label: 'Flat (Normal)' },
    { id: 'pop', label: 'Pop' },
    { id: 'rock', label: 'Rock' },
    { id: 'classical', label: 'Klasik' },
    { id: 'jazz', label: 'Jazz' },
    { id: 'electronic', label: 'Elektronik' },
    { id: 'vocal', label: 'Vocal Boost' },
    { id: 'custom', label: 'Custom EQ' },
  ];

  // --- Smooth Multi-Band EQ State ---
  const serverEqBands = currentFilters.custom_eq && currentFilters.custom_eq.length === 5
    ? currentFilters.custom_eq
    : (PRESET_BANDS[currentFilters.equalizer] || [0, 0, 0, 0, 0]);

  const [localBands, setLocalBands] = useState<number[]>(serverEqBands);
  const [isSlidingEq, setIsSlidingEq] = useState<boolean>(false);

  useEffect(() => {
    if (!isSlidingEq) {
      if (currentFilters.custom_eq && currentFilters.custom_eq.length === 5) {
        setLocalBands(currentFilters.custom_eq);
      } else if (PRESET_BANDS[currentFilters.equalizer]) {
        setLocalBands(PRESET_BANDS[currentFilters.equalizer]);
      }
    }
  }, [currentFilters.equalizer, currentFilters.custom_eq, isSlidingEq]);

  const handleBandChange = (index: number, val: number) => {
    setIsSlidingEq(true);
    setLocalBands((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleBandRelease = () => {
    setIsSlidingEq(false);
    onApplyFilter('custom_eq', localBands);
  };

  const handlePresetSelect = (presetId: EqualizerPreset) => {
    if (presetId === 'custom') {
      onApplyFilter('custom_eq', localBands);
    } else {
      const defaultBands = PRESET_BANDS[presetId] || [0, 0, 0, 0, 0];
      setLocalBands(defaultBands);
      onApplyFilter('equalizer', presetId);
    }
  };

  // --- Smooth Speed Slider State ---
  const [localSpeed, setLocalSpeed] = useState<number>(currentFilters.speed);
  const [isSlidingSpeed, setIsSlidingSpeed] = useState<boolean>(false);

  useEffect(() => {
    if (!isSlidingSpeed) {
      setLocalSpeed(currentFilters.speed);
    }
  }, [currentFilters.speed, isSlidingSpeed]);

  const handleSpeedRelease = () => {
    setIsSlidingSpeed(false);
    onApplyFilter('speed', localSpeed);
  };

  // --- Smooth Treble Slider State ---
  const [localTreble, setLocalTreble] = useState<number>(currentFilters.treble);
  const [isSlidingTreble, setIsSlidingTreble] = useState<boolean>(false);

  useEffect(() => {
    if (!isSlidingTreble) {
      setLocalTreble(currentFilters.treble);
    }
  }, [currentFilters.treble, isSlidingTreble]);

  const handleTrebleRelease = () => {
    setIsSlidingTreble(false);
    onApplyFilter('treble', localTreble);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Title & Reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--active-blue-bg)',
              border: '1px solid var(--active-blue-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sliders size={22} color="var(--primary-blue)" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
              Audio Filter & Equalizer
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Atur profil frekuensi equalizer, bass drop, dan efek audio FFmpeg secara real-time.
            </p>
          </div>
        </div>

        <button
          onClick={onResetFilters}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '12.5px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <RotateCcw size={14} />
          <span>Reset Semua Filter</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Equalizer Presets */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            padding: '20px 24px',
          }}
        >
          <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Preset Equalizer
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Pilih karakter suara yang sudah dikalibrasi atau kustomisasi manual di bawah.
              </p>
            </div>
            {currentFilters.equalizer === 'custom' && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'var(--soft-blue)',
                  backgroundColor: 'var(--active-blue-bg)',
                  border: '1px solid var(--active-blue-border)',
                  padding: '3px 10px',
                  borderRadius: '20px',
                }}
              >
                ● Mode Custom Aktif
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
            {eqPresets.map((preset) => {
              const isSelected = currentFilters.equalizer === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: isSelected ? '700' : '500',
                    border: isSelected ? '1px solid var(--primary-blue)' : '1px solid var(--border-subtle)',
                    backgroundColor: isSelected ? 'var(--active-blue-bg)' : 'var(--bg-surface-secondary)',
                    color: isSelected ? 'var(--soft-blue)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom 5-Band Equalizer Sliders */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            padding: '22px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={17} color="var(--primary-blue)" />
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Kustomisasi Equalizer (5-Band Frequency)
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Geser frekuensi sesuai selera audio Anda. Pengaturan berlaku otomatis saat dilepas.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setLocalBands([0, 0, 0, 0, 0]);
                onApplyFilter('custom_eq', [0, 0, 0, 0, 0]);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <RotateCcw size={12} />
              <span>Flat (0 dB)</span>
            </button>
          </div>

          {/* 5-Band Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '14px',
              padding: '16px',
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {FREQ_BANDS.map((band, idx) => {
              const val = localBands[idx] !== undefined ? localBands[idx] : 0;
              const isGainPositive = val > 0;
              const isGainNegative = val < 0;

              return (
                <div
                  key={band.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 4px',
                  }}
                >
                  {/* Gain readout */}
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: isGainPositive
                        ? 'var(--primary-blue)'
                        : isGainNegative
                        ? 'var(--status-danger)'
                        : 'var(--text-muted)',
                      minWidth: '40px',
                      textAlign: 'center',
                    }}
                  >
                    {val > 0 ? `+${val} dB` : `${val} dB`}
                  </span>

                  {/* Vertical Fader Track */}
                  <div
                    style={{
                      height: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={val}
                      onChange={(e) => handleBandChange(idx, parseInt(e.target.value, 10))}
                      onMouseUp={handleBandRelease}
                      onTouchEnd={handleBandRelease}
                      style={{
                        WebkitAppearance: 'slider-vertical',
                        width: '18px',
                        height: '130px',
                        cursor: 'pointer',
                        accentColor: 'var(--primary-blue)',
                      }}
                    />
                  </div>

                  {/* Frequency Labels */}
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      {band.label}
                    </p>
                    <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      {band.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bass Boost Levels */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            padding: '20px 24px',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Bass Boost
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Penguatan frekuensi rendah (low-end frequencies). Tingkat Hard dioptimalkan bertenaga (+16 dB).
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {bassBoostOptions.map((opt) => {
              const isSelected = currentFilters.bass_boost === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onApplyFilter('bass_boost', opt.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid var(--primary-blue)' : '1px solid var(--border-subtle)',
                    backgroundColor: isSelected ? 'var(--active-blue-bg)' : 'var(--bg-surface-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <p
                    style={{
                      fontSize: '13.5px',
                      fontWeight: isSelected ? '700' : '600',
                      color: isSelected ? 'var(--soft-blue)' : 'var(--text-primary)',
                      margin: 0,
                    }}
                  >
                    {opt.label}
                  </p>
                  <p
                    style={{
                      fontSize: '11px',
                      color: isSelected ? 'var(--primary-blue)' : 'var(--text-muted)',
                      margin: '2px 0 0 0',
                    }}
                  >
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Special Audio Modes & Smooth Sliders */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            padding: '20px 24px',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
            Efek Tambahan & Kecepatan (Geser Halus)
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            
            {/* Speed Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>
                  Kecepatan Pemutaran
                </span>
                <span style={{ fontSize: '13px', color: 'var(--soft-blue)', fontWeight: '700' }}>
                  {localSpeed.toFixed(2)}x
                </span>
              </div>
              <div style={{ position: 'relative', height: '6px', backgroundColor: 'rgba(148, 163, 184, 0.2)', borderRadius: '999px' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${((localSpeed - 0.5) / 1.5) * 100}%`,
                    backgroundColor: 'var(--primary-blue)',
                    borderRadius: '999px',
                  }}
                />
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={localSpeed}
                  onChange={(e) => {
                    setIsSlidingSpeed(true);
                    setLocalSpeed(parseFloat(e.target.value));
                  }}
                  onMouseUp={handleSpeedRelease}
                  onTouchEnd={handleSpeedRelease}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    left: 0,
                    width: '100%',
                    height: '18px',
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
                <span>0.5x (Lambat)</span>
                <span>1.0x (Normal)</span>
                <span>2.0x (Cepat)</span>
              </div>
            </div>

            {/* Treble Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>
                  Treble Boost / Cut
                </span>
                <span style={{ fontSize: '13px', color: 'var(--soft-blue)', fontWeight: '700' }}>
                  {localTreble > 0 ? `+${localTreble}` : localTreble} dB
                </span>
              </div>
              <div style={{ position: 'relative', height: '6px', backgroundColor: 'rgba(148, 163, 184, 0.2)', borderRadius: '999px' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${((localTreble + 10) / 20) * 100}%`,
                    backgroundColor: 'var(--primary-blue)',
                    borderRadius: '999px',
                  }}
                />
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={localTreble}
                  onChange={(e) => {
                    setIsSlidingTreble(true);
                    setLocalTreble(parseInt(e.target.value, 10));
                  }}
                  onMouseUp={handleTrebleRelease}
                  onTouchEnd={handleTrebleRelease}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    left: 0,
                    width: '100%',
                    height: '18px',
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
                <span>-10 dB</span>
                <span>0 dB</span>
                <span>+10 dB</span>
              </div>
            </div>

            {/* Toggle Modes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', gridColumn: '1 / -1', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                
                {/* Nightcore Toggle */}
                <button
                  onClick={() => onApplyFilter('nightcore', !currentFilters.nightcore)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: currentFilters.nightcore ? '1px solid var(--primary-blue)' : '1px solid var(--border-subtle)',
                    backgroundColor: currentFilters.nightcore ? 'var(--active-blue-bg)' : 'var(--bg-surface-secondary)',
                    color: currentFilters.nightcore ? 'var(--soft-blue)' : 'var(--text-secondary)',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Sparkles size={15} color={currentFilters.nightcore ? 'var(--primary-blue)' : 'currentColor'} />
                  <span>Nightcore Mode</span>
                </button>

                {/* Vaporwave Toggle */}
                <button
                  onClick={() => onApplyFilter('vaporwave', !currentFilters.vaporwave)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: currentFilters.vaporwave ? '1px solid var(--primary-blue)' : '1px solid var(--border-subtle)',
                    backgroundColor: currentFilters.vaporwave ? 'var(--active-blue-bg)' : 'var(--bg-surface-secondary)',
                    color: currentFilters.vaporwave ? 'var(--soft-blue)' : 'var(--text-secondary)',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Disc size={15} color={currentFilters.vaporwave ? 'var(--primary-blue)' : 'currentColor'} />
                  <span>Vaporwave (Slowed)</span>
                </button>

                {/* Karaoke Toggle */}
                <button
                  onClick={() => onApplyFilter('karaoke', !currentFilters.karaoke)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: currentFilters.karaoke ? '1px solid var(--primary-blue)' : '1px solid var(--border-subtle)',
                    backgroundColor: currentFilters.karaoke ? 'var(--active-blue-bg)' : 'var(--bg-surface-secondary)',
                    color: currentFilters.karaoke ? 'var(--soft-blue)' : 'var(--text-secondary)',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Radio size={15} color={currentFilters.karaoke ? 'var(--primary-blue)' : 'currentColor'} />
                  <span>Vocal Cut (Karaoke)</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
