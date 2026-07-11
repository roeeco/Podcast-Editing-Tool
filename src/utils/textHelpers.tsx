import React from 'react';

// Helper functions for word count and average reading time (Hebrew ~130 words per minute)
export const getWordCount = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Filter out timestamps and non-word characters to get a more accurate speech-word count
  const cleaned = trimmed
    .replace(/\[\d+:\d+\s*-\s*\d+:\d+\]/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
    .trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
};

export const getReadTimeSeconds = (words: number): number => {
  return Math.round((words / 130) * 60);
};

export const formatReadTime = (seconds: number): string => {
  if (seconds === 0) return '0 שניות קריאה';
  if (seconds < 60) return `כ-${seconds} שניות קריאה`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `כ-${mins} דקות קריאה`;
  return `כ-${mins} דק' ו-${secs} שניות קריאה`;
};

export const formatInstructionsJSX = (text: string, isDark: boolean): React.ReactNode => {
  if (!text) return null;
  const parts = text.split(/(\([^)]+\)|\[[^\]]+\])/g);
  return parts.map((part, index) => {
    if (part.startsWith('(') && part.endsWith(')')) {
      return (
        <span 
          key={index} 
          className={`italic font-sans font-medium px-1.5 py-0.5 rounded mx-1 ${
            isDark ? 'text-amber-400 bg-amber-500/5' : 'text-amber-700/90 bg-amber-500/5'
          }`}
        >
          {part}
        </span>
      );
    } else if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span 
          key={index} 
          className={`italic font-sans font-semibold border-b border-dashed px-1.5 py-0.5 rounded mx-1 text-[0.9em] ${
            isDark ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30' : 'text-indigo-800 bg-indigo-50 border-indigo-300'
          }`}
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};
