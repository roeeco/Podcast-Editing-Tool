import React from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  BookOpen,
  Mic,
  Scissors,
  Music,
  Download,
  Archive,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { PodcastTrack, ScriptCard } from '../types';

interface WorkflowRailProps {
  mainTab: 'text' | 'tracks';
  setMainTab: (tab: 'text' | 'tracks') => void;
  teleprompterMode: boolean;
  setTeleprompterMode: (val: boolean) => void;
  tracks: PodcastTrack[];
  scriptContent: string;
  scriptCards: ScriptCard[];
  setIsFreesoundModalOpen: (val: boolean) => void;
  isDarkMode: boolean;
}

export const WorkflowRail: React.FC<WorkflowRailProps> = ({
  mainTab,
  setMainTab,
  teleprompterMode,
  setTeleprompterMode,
  tracks,
  scriptContent,
  scriptCards,
  setIsFreesoundModalOpen,
  isDarkMode,
}) => {
  // Determine if each step is completed
  const isStep1Done = scriptContent.trim().length > 10 || scriptCards.length > 0;
  const isStep2Done = teleprompterMode; // Currently active in rehearse mode or has been in it
  const isStep3Done = tracks.length > 0;
  const isStep4Done = tracks.length > 0 && tracks.some(t => t.trimStart > 0 || t.trimEnd < t.duration);
  const isStep5Done = tracks.some(t => t.isEffect || (t.fadeInDuration || 0) > 0 || (t.fadeOutDuration || 0) > 0 || (t.silenceAfter || 0) > 0);
  const isStep6Done = tracks.length > 0 && !tracks.some(t => !t.peaks); // simple proxy, or checking if merged pod exists
  
  const steps = [
    {
      id: 'write',
      label: 'כתיבת תסריט / כרטיסיות',
      icon: FileText,
      desc: 'ניסוח נקודות דיון או תסריט מלא',
      isDone: isStep1Done,
      action: () => {
        setMainTab('text');
        setTeleprompterMode(false);
        document.getElementById('script-panel')?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      id: 'rehearse',
      label: 'תרגול במצב קריאה',
      icon: BookOpen,
      desc: 'סימולציה וקריאה עם טלפרומפטר',
      isDone: isStep2Done,
      action: () => {
        setMainTab('text');
        setTeleprompterMode(true);
        document.getElementById('script-panel')?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      id: 'record',
      label: 'הקלטה או העלאה',
      icon: Mic,
      desc: 'הקלטת טייקים מהמיקרופון או העלאת קבצים',
      isDone: isStep3Done,
      action: () => {
        document.getElementById('recording-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      id: 'trim',
      label: 'חיתוך וסידור',
      icon: Scissors,
      desc: 'עריכת מקטעים וקביעת סדר כרונולוגי',
      isDone: isStep4Done,
      action: () => {
        setMainTab('tracks');
        document.getElementById('script-panel')?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      id: 'music',
      label: 'מעברים ואפקטים',
      icon: Music,
      desc: 'שילוב פתיח מוזיקלי, ג׳ינגלים ורעשים',
      isDone: isStep5Done,
      action: () => {
        setMainTab('tracks');
        setIsFreesoundModalOpen(true);
      }
    },
    {
      id: 'merge',
      label: 'מיזוג וייצוא',
      icon: Download,
      desc: 'חיבור הרצועות לקובץ שמע סופי',
      isDone: isStep6Done,
      action: () => {
        setMainTab('tracks');
        setTimeout(() => {
          document.getElementById('script-panel')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    },
    {
      id: 'backup',
      label: 'גיבוי ZIP פרויקט',
      icon: Archive,
      desc: 'שמירת קובץ גיבוי להמשך עבודה',
      isDone: false,
      action: () => {
        document.getElementById('project-management-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  ];

  return (
    <div className={`rounded-2xl p-5 border transition-all duration-300 w-full mb-2 ${
      isDarkMode 
        ? 'bg-[#1e1e24]/60 border-zinc-800 shadow-md shadow-black/10' 
        : 'bg-zinc-50 border-zinc-200/80 shadow-sm'
    }`}>
      
      <div className="flex flex-col gap-1.5 mb-4 text-right">
        <h3 className="text-sm font-bold tracking-tight uppercase text-indigo-400 font-sans">מתווה עבודה מונחה • Guided Studio Workflow</h3>
        <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'} font-sans`}>
          עקבו אחר שבעת שלבי היצירה האקדמיים לבניית הסכת של דקה מנצחת. לחצו על כל שלב למעבר מהיר ישירות לפעולה.
        </p>
      </div>

      {/* Grid checklist list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3.5">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              onClick={step.action}
              className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between group h-full relative ${
                step.isDone
                  ? (isDarkMode ? 'bg-[#18181f]/40 border-emerald-500/35 hover:border-emerald-500/60' : 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-400')
                  : (isDarkMode ? 'bg-[#252530]/40 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm')
              }`}
            >
              {/* Top Row: Icon and completion circle */}
              <div className="flex items-center justify-between gap-2.5 mb-2 pointer-events-none">
                <div className={`p-2 rounded-lg transition-colors ${
                  step.isDone
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : (isDarkMode ? 'bg-[#2a2a35] text-zinc-400 group-hover:text-zinc-200' : 'bg-zinc-100 text-zinc-500 group-hover:text-zinc-700')
                }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                </div>
                {step.isDone ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-zinc-700' : 'text-zinc-300'}`} />
                )}
              </div>

              {/* Info text */}
              <div className="pointer-events-none">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`text-[10px] font-bold font-mono tracking-wide ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    0{idx + 1}
                  </span>
                  <h4 className={`text-xs font-black font-sans leading-tight ${
                    step.isDone
                      ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-950')
                      : (isDarkMode ? 'text-zinc-300' : 'text-zinc-800')
                  }`}>
                    {step.label}
                  </h4>
                </div>
                <p className={`text-[10px] leading-snug font-sans ${isDarkMode ? 'text-zinc-500 group-hover:text-zinc-400' : 'text-zinc-500'}`}>
                  {step.desc}
                </p>
              </div>
              
              {/* Highlight bar on hover */}
              <div className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-t transition-all scale-x-0 group-hover:scale-x-100 ${
                step.isDone ? 'bg-emerald-500' : 'bg-indigo-500'
              }`} />
            </div>
          );
        })}
      </div>

    </div>
  );
};
