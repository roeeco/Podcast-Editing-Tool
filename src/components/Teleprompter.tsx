import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { ScriptCard } from '../types';
import { getTextDirection } from '../utils/textDirection';

const formatInstructionsJSX = (text: string, isDark: boolean) => {
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

interface ReadingCardProps {
  card: ScriptCard;
  index: number;
  total: number;
  isDarkMode: boolean;
  fontSize: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const ReadingCard: React.FC<ReadingCardProps> = ({
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
        className={`flex-1 text-right leading-relaxed font-sans font-medium pointer-events-none mb-6 whitespace-pre-wrap ${
          isDarkMode ? 'text-zinc-100' : 'text-zinc-800'
        }`}
        style={{ fontSize: `${fontSize}px` }}
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

interface TeleprompterProps {
  scriptMode: 'text' | 'cards';
  scriptContent: string;
  scriptCards: ScriptCard[];
  teleprompterMode: boolean;
  setTeleprompterMode: (val: boolean) => void;
  isDarkMode: boolean;
}

export const Teleprompter: React.FC<TeleprompterProps> = ({
  scriptMode,
  scriptContent,
  scriptCards,
  teleprompterMode,
  setTeleprompterMode,
  isDarkMode,
}) => {
  const [fontSize, setFontSize] = useState<number>(20);
  const [speechRate, setSpeechRate] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [guideLineTop, setGuideLineTop] = useState<number>(0);
  const [guideLineHeight, setGuideLineHeight] = useState<number>(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Derived content for teleprompter based on mode
  const teleprompterText = useMemo(() => {
    if (scriptMode === 'text') {
      return scriptContent;
    } else {
      return scriptCards.map(card => {
        const prefix = card.type === 'intro' ? 'פתיח: ' : card.type === 'body' ? 'גוף הדיון: ' : 'סיכום: ';
        return `${prefix}${card.text}`;
      }).join('\n\n');
    }
  }, [scriptContent, scriptCards, scriptMode]);

  // Split script into words but preserve paragraph boundaries
  const parsedWords = useMemo(() => {
    const lines = teleprompterText.split('\n');
    let globalIndex = 0;
    return lines.map((line) => {
      const lineWords = line.split(/\s+/).filter(Boolean);
      const mapped = lineWords.map((word) => {
        const isSpeakerInstruction = word.includes('(') || word.includes(')');
        const isGeneralInstruction = word.includes('[') || word.includes(']');
        const isInstruction = isSpeakerInstruction || isGeneralInstruction;
        const item = {
          word,
          index: globalIndex,
          isInstruction,
          isSpeakerInstruction,
          isGeneralInstruction,
        };
        globalIndex++;
        return item;
      });
      return {
        lineWords: mapped,
        isEmpty: line.trim() === '',
        direction: getTextDirection(line),
      };
    });
  }, [teleprompterText]);

  // Handle script scrolling and word highlighting (Teleprompter)
  useEffect(() => {
    let intervalId: number | null = null;
    if (isScrolling && teleprompterMode) {
      const msPerWord = speechRate === 'slow' ? 520 : speechRate === 'normal' ? 460 : 350;
      
      intervalId = window.setInterval(() => {
        setActiveWordIndex((prev) => {
          const totalWords = parsedWords.reduce((sum, line) => sum + line.lineWords.length, 0);
          if (prev >= totalWords - 1) {
            setIsScrolling(false);
            return prev;
          }
          return prev + 1;
        });
      }, msPerWord) as unknown as number;
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isScrolling, teleprompterMode, speechRate, parsedWords]);

  // Automatically scroll the container to keep the active word in the upper third of the box
  useEffect(() => {
    if (teleprompterMode && isScrolling) {
      const activeWordElem = document.getElementById(`tele-word-${activeWordIndex}`);
      if (activeWordElem && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const rect = activeWordElem.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top + container.scrollTop;
        
        container.scrollTo({
          top: Math.max(0, relativeTop - containerRect.height / 3),
          behavior: 'smooth'
        });
      }
    }
  }, [activeWordIndex, teleprompterMode, isScrolling]);

  // Update guide line position to match the active word's line
  useEffect(() => {
    if (teleprompterMode) {
      const updatePosition = () => {
        const activeWordElem = document.getElementById(`tele-word-${activeWordIndex}`);
        if (activeWordElem && scrollContainerRef.current) {
          const offsetTop = activeWordElem.offsetTop;
          const offsetHeight = activeWordElem.offsetHeight;
          setGuideLineTop(offsetTop - 2);
          setGuideLineHeight(offsetHeight + 4);
        } else {
          setGuideLineHeight(0);
        }
      };

      updatePosition();
      const handle = requestAnimationFrame(updatePosition);
      return () => cancelAnimationFrame(handle);
    }
  }, [activeWordIndex, teleprompterMode, fontSize, teleprompterText]);

  return (
    <div id="teleprompter-stage" className="flex flex-col gap-5 rounded-2xl p-6 transition-colors duration-300 w-full bg-[#2d2d37]/45 shadow-xl border border-zinc-700/20">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-700/10">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-zinc-400" />
          <h2 className="text-base font-bold uppercase tracking-wider text-zinc-300 font-sans">
            {scriptMode === 'cards' ? 'מצב קריאה - כרטיסיות דיון 🎙️' : 'מצב טלפרומפטר - תסריט 🚀'}
          </h2>
        </div>
        <button
          onClick={() => setTeleprompterMode(false)}
          className={`text-xs sm:text-sm px-4 py-2 rounded-xl font-bold transition-all cursor-pointer bg-[#373743] hover:bg-[#434351] text-zinc-200`}
        >
          חזרה לעריכה ✍️
        </button>
      </div>

      {scriptMode === 'cards' ? (
        /* CARD-BY-CARD READING MODE */
        <div className="flex flex-col gap-6 flex-1">
          
          <div className={`p-4 rounded-xl flex items-center justify-between gap-4 text-sm ${
            isDarkMode ? 'bg-[#1c1c22]' : 'bg-zinc-100'
          }`}>
            <div className="flex items-center gap-2">
              <span className={isDarkMode ? 'text-zinc-400 font-sans' : 'text-zinc-600 font-sans'}>גופן:</span>
              <button
                onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold cursor-pointer ${
                  isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-200' : 'bg-[#e4e4e7] hover:bg-zinc-300 text-zinc-800'
                }`}
              >
                A-
              </button>
              <span className="font-bold w-6 text-center">{fontSize}</span>
              <button
                onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold cursor-pointer ${
                  isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-200' : 'bg-[#e4e4e7] hover:bg-zinc-300 text-zinc-800'
                }`}
              >
                A+
              </button>
            </div>

            <span className={`text-xs font-sans ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
              ניתן להחליף כרטיסייה על ידי גרירה או שימוש בחצים למטה
            </span>
          </div>

          {scriptCards.length === 0 ? (
            <div className={`flex-1 rounded-2xl p-12 text-center border-2 border-dashed font-sans ${
              isDarkMode ? 'border-zinc-700/30 text-zinc-500' : 'border-zinc-200 text-zinc-400'
            }`}>
              לא נוספו כרטיסיות דיון עדיין. חזור/י למצב עריכה כדי ליצור כרטיסיות.
            </div>
          ) : (
            (() => {
              const activeCard = scriptCards[activeCardIndex] || scriptCards[0];
              if (!activeCard) return null;
              
              return (
                <div className="flex flex-col gap-4 flex-1">
                  <div className="relative flex-1 flex items-center justify-center min-h-[310px]">
                    <AnimatePresence mode="wait">
                      <ReadingCard
                        key={activeCardIndex}
                        card={activeCard}
                        index={activeCardIndex}
                        total={scriptCards.length}
                        isDarkMode={isDarkMode}
                        fontSize={fontSize}
                        onSwipeLeft={() => {
                          if (activeCardIndex < scriptCards.length - 1) {
                            setActiveCardIndex(prev => prev + 1);
                          }
                        }}
                        onSwipeRight={() => {
                          if (activeCardIndex > 0) {
                            setActiveCardIndex(prev => prev - 1);
                          }
                        }}
                      />
                    </AnimatePresence>
                  </div>

                  {/* Pagination controls */}
                  <div className="flex items-center justify-between px-2">
                    <button
                      disabled={activeCardIndex === 0}
                      onClick={() => setActiveCardIndex(prev => prev - 1)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                        activeCardIndex === 0
                          ? (isDarkMode 
                              ? 'border-zinc-800 text-zinc-700 bg-transparent cursor-not-allowed opacity-45' 
                              : 'border-zinc-200 text-zinc-300 bg-transparent cursor-not-allowed')
                          : (isDarkMode 
                              ? 'border-zinc-700 text-zinc-200 bg-[#2d2d37] hover:bg-[#373743]' 
                              : 'border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-50')
                      }`}
                    >
                      <ArrowRight className="w-4 h-4 shrink-0" />
                      <span className="font-sans">הקודמת</span>
                    </button>

                    <span className={`text-sm font-bold font-sans ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      כרטיסייה {activeCardIndex + 1} מתוך {scriptCards.length}
                    </span>

                    <button
                      disabled={activeCardIndex === scriptCards.length - 1}
                      onClick={() => setActiveCardIndex(prev => prev + 1)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                        activeCardIndex === scriptCards.length - 1
                          ? (isDarkMode 
                              ? 'border-zinc-800 text-zinc-700 bg-transparent cursor-not-allowed opacity-45' 
                              : 'border-zinc-200 text-zinc-300 bg-transparent cursor-not-allowed')
                          : (isDarkMode 
                              ? 'border-zinc-700 text-zinc-200 bg-[#2d2d37] hover:bg-[#373743]' 
                              : 'border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-50')
                      }`}
                    >
                      <span className="font-sans">הבאה</span>
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      ) : (
        /* EXISTING TELEPROMPTER SCROLLING MODE */
        <div className="flex flex-col gap-5 flex-1">
          
          <div className={`p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-sm ${
            isDarkMode ? 'bg-[#1c1c22]' : 'bg-zinc-100'
          }`}>
            
            <div className="flex items-center gap-2">
              <span className={isDarkMode ? 'text-zinc-400 font-sans' : 'text-zinc-600 font-sans'}>גופן:</span>
              <button
                onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold cursor-pointer ${
                  isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-200' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                }`}
              >
                A-
              </button>
              <span className="font-bold w-6 text-center">{fontSize}</span>
              <button
                onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold cursor-pointer ${
                  isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-200' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                }`}
              >
                A+
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={isDarkMode ? 'text-zinc-400 font-sans' : 'text-zinc-600 font-sans'}>קצב דיבור:</span>
              <div className={`flex rounded-lg p-0.5 ${isDarkMode ? 'bg-[#121216]' : 'bg-zinc-200'}`}>
                {(['slow', 'normal', 'fast'] as const).map((rate) => {
                  const label = rate === 'slow' ? 'איטי' : rate === 'normal' ? 'רגיל' : 'מהיר';
                  const isActive = speechRate === rate;
                  return (
                    <button
                      key={rate}
                      onClick={() => setSpeechRate(rate)}
                      className={`px-3 py-1 rounded-md transition-all font-bold text-xs cursor-pointer ${
                        isActive
                          ? (isDarkMode ? 'bg-[#373743] text-white shadow' : 'bg-white text-zinc-900 shadow')
                          : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setIsScrolling(!isScrolling)}
              className={`px-5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                isScrolling
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : (isDarkMode ? 'bg-zinc-200 text-zinc-950 hover:bg-white' : 'bg-zinc-800 text-white hover:bg-zinc-900')
              }`}
            >
              {isScrolling ? 'עצור גלילה' : 'הפעל גלילה'}
            </button>
          </div>

          {/* Scrolling Stage */}
          <div
            ref={scrollContainerRef}
            className={`flex-1 rounded-2xl p-6 overflow-y-auto max-h-[380px] scroll-smooth relative ${
              isDarkMode ? 'bg-[#18181f] border border-zinc-700/20' : 'bg-zinc-100/60'
            }`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {/* Visual reading line marker */}
            {guideLineHeight > 0 && (
              <div 
                className={`absolute left-0 right-0 pointer-events-none transition-all duration-200 ${
                  isDarkMode ? 'bg-emerald-500/10 border-y border-emerald-500/25' : 'bg-emerald-500/5 border-y border-emerald-500/15'
                }`}
                style={{
                  top: `${guideLineTop}px`,
                  height: `${guideLineHeight}px`
                }}
              />
            )}
            
            <div className="leading-relaxed font-bold select-none pt-2 pb-48 px-2 space-y-4">
              {parsedWords.length === 0 || (parsedWords.length === 1 && parsedWords[0].isEmpty) ? (
                <span className={`font-sans ${isDarkMode ? 'text-zinc-600 italic' : 'text-zinc-400 italic'}`}>לא נכתב תסריט עדיין. חזור/י למצב עריכה כדי להזין טקסט.</span>
              ) : (
                parsedWords.map((paragraph, pIdx) => {
                  if (paragraph.isEmpty) {
                    return <div key={pIdx} className="h-4" />;
                  }
                  return (
                    <div
                      key={pIdx}
                      dir={paragraph.direction}
                      style={{ textAlign: 'start' }}
                      className="block leading-relaxed mb-4"
                    >
                      {paragraph.lineWords.map((wordObj) => {
                        const isCurrent = wordObj.index === activeWordIndex;
                        const isPast = wordObj.index < activeWordIndex;
                        return (
                          <span
                            key={wordObj.index}
                            id={`tele-word-${wordObj.index}`}
                            onClick={() => setActiveWordIndex(wordObj.index)}
                            dir="auto"
                            style={{ unicodeBidi: 'isolate' }}
                            className={`transition-all duration-200 rounded px-1.5 py-0.5 inline-block mx-1 cursor-pointer ${
                              isCurrent
                                ? (isDarkMode ? 'text-black bg-white scale-110 shadow-lg font-black' : 'text-white bg-zinc-850 scale-110 shadow font-black')
                                : isPast
                                ? (isDarkMode ? 'text-zinc-700 font-bold font-sans' : 'text-zinc-300 font-bold font-sans')
                                : wordObj.isSpeakerInstruction
                                ? (isDarkMode ? 'text-amber-400 bg-amber-500/5 italic font-medium font-sans' : 'text-amber-700/90 bg-amber-500/5 italic font-medium font-sans')
                                : wordObj.isGeneralInstruction
                                ? (isDarkMode ? 'text-indigo-300 bg-indigo-500/10 italic font-semibold border-b border-dashed border-indigo-500/30 text-[0.9em] font-sans' : 'text-indigo-800 bg-indigo-50 italic font-semibold border-b border-dashed border-indigo-300 text-[0.9em] font-sans')
                                : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200 font-sans' : 'text-zinc-800 hover:text-zinc-950 font-sans')
                            }`}
                          >
                            {wordObj.word}
                          </span>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>💡 קרא/י לאורך הקו המנחה הירוק</span>
            <button
              onClick={() => {
                if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
                setIsScrolling(false);
                setActiveWordIndex(0);
              }}
              className="hover:text-slate-300 flex items-center gap-1 text-slate-400 bg-slate-800/40 px-2.5 py-1 rounded cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>התחל מחדש</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
