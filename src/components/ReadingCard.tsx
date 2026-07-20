import React from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { ScriptCard } from '../types';
import { formatInstructionsJSX } from '../utils/textHelpers';
import { getTextDirection } from '../utils/textDirection';

interface ReadingCardProps {
  card: ScriptCard;
  index: number;
  total: number;
  isDarkMode: boolean;
  fontSize: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export const ReadingCard: React.FC<ReadingCardProps> = ({
  card,
  index,
  total,
  isDarkMode,
  fontSize,
  onSwipeLeft,
  onSwipeRight
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-10, 10]);
  const opacity = useTransform(x, [-150, -100, 0, 100, 150], [0.6, 0.95, 1, 0.95, 0.6]);

  const likeOpacity = useTransform(x, [0, 80], [0, 1]);
  const nopeOpacity = useTransform(x, [-80, 0], [1, 0]);

  let borderClass = '';
  let bgStyle = '';
  let badgeLabel = '';
  let badgeBg = '';

  if (card.type === 'intro') {
    borderClass = isDarkMode ? 'border-indigo-500/30' : 'border-indigo-400/50';
    bgStyle = isDarkMode ? 'rgba(99, 102, 241, 0.08)' : 'rgba(238, 242, 255, 0.5)';
    badgeLabel = 'פתיח';
    badgeBg = isDarkMode ? 'bg-indigo-950 text-indigo-300 border border-indigo-900/40' : 'bg-indigo-50 text-indigo-700 border border-indigo-100';
  } else if (card.type === 'body') {
    borderClass = isDarkMode ? 'border-emerald-500/30' : 'border-emerald-400/50';
    bgStyle = isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(236, 253, 245, 0.5)';
    badgeLabel = 'גוף הדיון';
    badgeBg = isDarkMode ? 'bg-emerald-950 text-emerald-300 border border-emerald-900/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-100';
  } else if (card.type === 'outro') {
    borderClass = isDarkMode ? 'border-amber-500/30' : 'border-amber-400/50';
    bgStyle = isDarkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(254, 243, 199, 0.5)';
    badgeLabel = 'סיכום';
    badgeBg = isDarkMode ? 'bg-amber-950 text-amber-300 border border-amber-900/40' : 'bg-amber-50 text-amber-700 border border-amber-100';
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={(event, info) => {
        const swipeThreshold = 100;
        if (info.offset.x < -swipeThreshold) {
          onSwipeLeft();
        } else if (info.offset.x > swipeThreshold) {
          onSwipeRight();
        }
      }}
      className={`w-full min-h-[260px] rounded-2xl p-8 border select-none relative flex flex-col justify-between cursor-grab active:cursor-grabbing shadow-lg transition-shadow duration-300 ${borderClass}`}
      style={{
        x,
        rotate,
        opacity,
        background: isDarkMode
          ? `linear-gradient(to bottom, ${bgStyle}, rgba(24, 24, 31, 0.98))`
          : `linear-gradient(to bottom, ${bgStyle}, rgba(255, 255, 255, 0.98))`,
        direction: 'rtl'
      }}
      initial={{ scale: 0.96, opacity: 0, y: 15 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.92, opacity: 0, y: -15 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
    >
      {/* Visual Tinder Swipe badges */}
      <motion.div
        style={{ opacity: likeOpacity, rotate: -10 }}
        className="absolute top-6 right-6 border-2 border-emerald-500/70 text-emerald-500 bg-emerald-500/5 font-black text-xs px-2.5 py-1 rounded uppercase tracking-wider pointer-events-none"
      >
        הקודם
      </motion.div>
      <motion.div
        style={{ opacity: nopeOpacity, rotate: 10 }}
        className="absolute top-6 left-6 border-2 border-indigo-500/70 text-indigo-500 bg-indigo-500/5 font-black text-xs px-2.5 py-1 rounded uppercase tracking-wider pointer-events-none"
      >
        הבא
      </motion.div>

      {/* Card Header */}
      <div className="flex items-center justify-between mb-4 pointer-events-none">
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${badgeBg}`}>
          {badgeLabel}
        </span>
        <span className={`text-xs font-mono ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {index + 1} מתוך {total}
        </span>
      </div>

      {/* Card Body Text */}
      <div
        className={`flex-1 leading-relaxed font-sans font-medium pointer-events-none mb-6 whitespace-pre-wrap ${
          isDarkMode ? 'text-zinc-100' : 'text-zinc-800'
        }`}
        dir={getTextDirection(card.text)}
        style={{
          textAlign: 'start',
          fontSize: `${fontSize}px`,
        }}
      >
        {formatInstructionsJSX(card.text, isDarkMode)}
      </div>

      {/* Footer hint */}
      <div className="text-center mt-2 pointer-events-none">
        <span className={`text-[10px] tracking-widest uppercase opacity-60 font-sans ${
          isDarkMode ? 'text-zinc-500' : 'text-zinc-400'
        }`}>
          ← גרור/י שמאלה לכרטיסייה הבאה | גרור/י ימינה לקודמת →
        </span>
      </div>
    </motion.div>
  );
};
