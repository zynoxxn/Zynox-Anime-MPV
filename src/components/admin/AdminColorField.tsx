import React from 'react';

interface AdminColorFieldProps {
  label?: string;
  value: string;
  onChange: (hex: string) => void;
  presets?: string[];
  presetSwatches?: string[];
  helperText?: string;
  className?: string;
}

const DEFAULT_PRESETS = [
  '#1E88FF', // ZYNOX Blue
  '#22C55E', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#7C4DFF', // Violet
  '#00CFFF', // Cyan
];

export const AdminColorField: React.FC<AdminColorFieldProps> = ({
  label,
  value = '#1E88FF',
  onChange,
  presets,
  presetSwatches,
  helperText,
  className = '',
}) => {
  const effectivePresets = presetSwatches || presets || DEFAULT_PRESETS;
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-white">
          {label}
        </label>
      )}

      {/* 6 Preset Swatches (32px circles) */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {effectivePresets.slice(0, 6).map((preset) => {
          const isSelected = (value || '').toUpperCase() === preset.toUpperCase();
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              style={{ backgroundColor: preset }}
              className={`w-8 h-8 rounded-full transition-transform cursor-pointer relative ${
                isSelected
                  ? 'ring-2 ring-offset-2 ring-offset-[#0B1324] ring-[#1E88FF] scale-110'
                  : 'hover:scale-105 opacity-90'
              }`}
              title={preset}
            />
          );
        })}
      </div>

      {/* Fully visible Hex input (44px) */}
      <div className="flex items-center gap-2 pt-1 max-w-xs">
        <div
          className="w-10 h-10 rounded-[10px] border border-white/10 shrink-0"
          style={{ backgroundColor: value || '#1E88FF' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1E88FF"
          className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] focus:ring-1 focus:ring-[#1E88FF] rounded-[10px] px-3 font-mono text-xs text-white outline-none uppercase"
          maxLength={9}
        />
      </div>

      {helperText && (
        <p className="text-xs text-[#94A3B8]">{helperText}</p>
      )}
    </div>
  );
};
