import React from 'react';
import { motion } from 'motion/react';

interface MobileSliderPopoverProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  onClose: () => void;
  label: string;
  colorClass: string;
}

export const MobileSliderPopover: React.FC<MobileSliderPopoverProps> = ({
  value,
  min,
  max,
  step,
  onChange,
  onClose,
  label,
  colorClass
}) => {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 5 }}
        className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-50 p-2 rounded-lg shadow-xl border bg-[#1e1e24] border-zinc-700 text-white flex flex-col items-center gap-1.5 min-w-[130px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{label}</div>
        <div className="flex items-center gap-1.5">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={`w-20 h-1 ${colorClass} bg-zinc-700 rounded-lg appearance-none cursor-pointer`}
          />
          <span className="font-mono text-xs font-bold min-w-[28px] text-center">
            {value.toFixed(1)}s
          </span>
        </div>
      </motion.div>
    </>
  );
};
