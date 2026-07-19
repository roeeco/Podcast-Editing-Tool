import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Book,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Trash2,
  Download,
  GripVertical,
  ExternalLink,
  ArrowRightLeft
} from 'lucide-react';
import { ScriptCard } from '../types';
import { escapeHtml } from '../utils/escapeHtml';
import { SCRIPT_TEMPLATES } from '../data/templates';

const getWordCount = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const cleaned = trimmed.replace(/\[\d+:\d+\s*-\s*\d+:\d+\]/g, '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
};

const getReadTimeSeconds = (words: number) => {
  return Math.round((words / 130) * 60);
};

const formatReadTime = (seconds: number) => {
  if (seconds === 0) return '0 שניות קריאה';
  if (seconds < 60) return `כ-${seconds} שניות קריאה`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `כ-${mins} דקות קריאה`;
  return `כ-${mins} דק' ו-${secs} שניות קריאה`;
};

const formatInstructionsHTML = (text: string): string => {
  if (!text) return '';
  let escaped = escapeHtml(text);
  escaped = escaped.replace(/(\([^)]+\))/g, '<span class="speaker-instruction" style="color: #b45309 !important; background-color: #fef3c7 !important; font-style: italic; font-size: 13px; padding: 1px 4px; border-radius: 4px; margin: 0 2px; display: inline-block;">$1</span>');
  escaped = escaped.replace(/(\[[^\]]+\])/g, '<span class="general-instruction" style="color: #3730a3 !important; background-color: #e0e7ff !important; font-style: italic; font-size: 12px; font-weight: 600; padding: 2px 6px; border-radius: 4px; border: 1px dashed #c7d2fe; margin: 0 2px; display: inline-block;">$1</span>');
  return escaped;
};

interface ScriptEditorProps {
  podcastName: string;
  setPodcastName: (val: string) => void;
  participants: string;
  setParticipants: (val: string) => void;
  scriptContent: string;
  setScriptContent: (val: string) => void;
  scriptMode: 'text' | 'cards';
  setScriptMode: (val: 'text' | 'cards') => void;
  scriptCards: ScriptCard[];
  setScriptCards: React.Dispatch<React.SetStateAction<ScriptCard[]>>;
  teleprompterMode: boolean;
  setTeleprompterMode: (val: boolean) => void;
  setActiveCardIndex: (index: number) => void;
  isDarkMode: boolean;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
  setConfirmModal: (modal: any) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  podcastName,
  setPodcastName,
  participants,
  setParticipants,
  scriptContent,
  setScriptContent,
  scriptMode,
  setScriptMode,
  scriptCards,
  setScriptCards,
  teleprompterMode,
  setTeleprompterMode,
  setActiveCardIndex,
  isDarkMode,
  setErrorMsg,
  setSuccessMsg,
  setConfirmModal,
}) => {
  const [showExamples, setShowExamples] = useState<boolean>(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState<boolean>(false);
  const [aiStudentNotes, setAiStudentNotes] = useState<string>("");
  const [aiDynamic, setAiDynamic] = useState<string>("ראיון עיתונאי");
  const [aiParticipantsCount, setAiParticipantsCount] = useState<string>("2");
  const [aiCharacterNames, setAiCharacterNames] = useState<string>("מראיין, מרואיין");
  const [aiOutputFormat, setAiOutputFormat] = useState<string>("כרטיסיות שיחה דינמיות - Talking Points");
  const [aiDuration, setAiDuration] = useState<string>("שתי דקות");
  const [aiTone, setAiTone] = useState<string>("חברי");
  const [aiPromptCopied, setAiPromptCopied] = useState<boolean>(false);
  const [aiPastedOutput, setAiPastedOutput] = useState<string>("");
  const [aiTargetType, setAiTargetType] = useState<'cards' | 'text'>('cards');
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [dragOverCardIndex, setDragOverCardIndex] = useState<number | null>(null);

  // Synchronize AI Assistant Output Presentation Format with the editing style (scriptMode) above the panel
  useEffect(() => {
    if (scriptMode === 'text') {
      setAiOutputFormat("תסריט מלא");
      setAiTargetType("text");
    } else if (scriptMode === 'cards') {
      setAiOutputFormat("כרטיסיות שיחה דינמיות - Talking Points");
      setAiTargetType("cards");
    }
  }, [scriptMode]);

  // Synchronize default participant count and names based on selected dynamic
  useEffect(() => {
    if (aiDynamic === "ראיון עיתונאי") {
      setAiParticipantsCount("2");
      setAiCharacterNames("מראיין, מרואיין");
    } else if (aiDynamic === "דיבייט") {
      setAiParticipantsCount("2");
      setAiCharacterNames("משתתף א', משתתף ב'");
    } else if (aiDynamic === "שיחת סלון") {
      setAiParticipantsCount("3");
      setAiCharacterNames("מנחה, יעל, תומר");
    } else if (aiDynamic === "מונולוג חקר") {
      setAiParticipantsCount("1");
      setAiCharacterNames("דובר");
    }
  }, [aiDynamic]);

  const handleAddCard = (type: 'intro' | 'body' | 'outro') => {
    const newCard: ScriptCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      text: type === 'intro' ? 'שלום לכולם וברוכים הבאים להסכת שלנו!' : type === 'body' ? 'בפרק של היום נעסוק ב...' : 'תודה שהאזנתם לנו, להתראות!'
    };
    setScriptCards((prev) => [...prev, newCard]);
  };

  const handleDeleteCard = (id: string) => {
    setScriptCards((prev) => prev.filter(c => c.id !== id));
  };

  const handleUpdateCardText = (id: string, text: string) => {
    setScriptCards((prev) => prev.map(c => c.id === id ? { ...c, text } : c));
  };

  const handleMoveCardUp = (index: number) => {
    if (index === 0) return;
    setScriptCards((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  const handleMoveCardDown = (index: number) => {
    setScriptCards((prev) => {
      if (index === prev.length - 1) return prev;
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  const handleCardDrop = (targetIndex: number) => {
    if (draggedCardIndex === null || draggedCardIndex === targetIndex) return;
    setScriptCards((prev) => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedCardIndex, 1);
      updated.splice(targetIndex, 0, draggedItem);
      return updated;
    });
    setDraggedCardIndex(null);
    setDragOverCardIndex(null);
  };

  const proceedExtraction = (inputText: string) => {
    if (aiTargetType === 'text') {
      setScriptContent(inputText);
      setScriptMode('text');
      setSuccessMsg('🏆 התסריט הועבר בהצלחה למערכת ההקלטה!');
    } else {
      const parsedCards: ScriptCard[] = [];
      const lines = inputText.split('\n');

      const hasCardDelimiters = lines.some(line =>
        line.includes('=== כרטיסייה') ||
        line.includes('=== כרטיסיה') ||
        line.trim().startsWith('כרטיסייה') ||
        line.trim().startsWith('כרטיסיה') ||
        line.trim().startsWith('כרטיסיית ניווט') ||
        line.trim().startsWith('[כרטיסייה')
      );

      if (hasCardDelimiters) {
        let currentType: 'intro' | 'body' | 'outro' = 'body';
        let currentTextLines: string[] = [];

        const saveCard = () => {
          const cardText = currentTextLines.join('\n').trim();
          if (cardText) {
            parsedCards.push({
              id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              type: currentType,
              text: cardText
            });
          }
          currentTextLines = [];
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const isDelimiter = line.includes('=== כרטיסייה') ||
                              line.includes('=== כרטיסיה') ||
                              line.match(/^כרטיסייה\s*\d+/i) ||
                              line.match(/^כרטיסיה\s*\d+/i) ||
                              line.match(/^\[כרטיסייה/) ||
                              line.startsWith('כרטיסיית ניווט');

          if (isDelimiter) {
            saveCard();
            if (line.includes('פתיח') || line.toLowerCase().includes('intro')) {
              currentType = 'intro';
            } else if (line.includes('סיכום') || line.includes('סיום') || line.toLowerCase().includes('outro') || line.toLowerCase().includes('conclusion')) {
              currentType = 'outro';
            } else {
              currentType = 'body';
            }
          } else {
            if (line.startsWith('סוג:') || line.startsWith('סוג כרטיסייה:') || line.startsWith('סוג כרטיסיה:')) {
              const typeVal = line.split(':')[1].trim();
              if (typeVal.includes('פתיח')) currentType = 'intro';
              else if (typeVal.includes('סיכום') || typeVal.includes('סיום')) currentType = 'outro';
              else currentType = 'body';
            } else if (line.startsWith('טקסט:') || line.startsWith('תוכן:')) {
              const textVal = line.substring(line.indexOf(':') + 1).trim();
              if (textVal) {
                currentTextLines.push(textVal);
              }
            } else {
              if (lines[i]) {
                currentTextLines.push(lines[i]);
              }
            }
          }
        }
        saveCard();
      }

      if (parsedCards.length === 0) {
        let currentType: 'intro' | 'body' | 'outro' = 'body';
        let currentTextLines: string[] = [];

        const saveCard = () => {
          const cardText = currentTextLines.join('\n').trim();
          if (cardText) {
            parsedCards.push({
              id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              type: currentType,
              text: cardText
            });
          }
          currentTextLines = [];
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const isIntro = line.startsWith('פתיח:') || line.startsWith('[פתיח') || line.toLowerCase().startsWith('intro:');
          const isOutro = line.startsWith('סיכום:') || line.startsWith('סיום:') || line.startsWith('[סיכום') || line.toLowerCase().startsWith('outro:') || line.toLowerCase().startsWith('conclusion:');
          const isBody = line.startsWith('גוף הדיון:') || line.startsWith('גוף:') || line.startsWith('[גוף') || line.toLowerCase().startsWith('body:');

          if (isIntro || isOutro || isBody) {
            saveCard();
            currentType = isIntro ? 'intro' : isOutro ? 'outro' : 'body';
            const content = line.substring(line.indexOf(':') + 1).trim();
            if (content) {
              currentTextLines.push(content);
            }
          } else {
            currentTextLines.push(lines[i]);
          }
        }
        saveCard();
      }

      if (parsedCards.length === 0) {
        const paragraphs = inputText.split(/\n\s*\n/);
        paragraphs.forEach((para, idx) => {
          const text = para.trim();
          if (text) {
            let type: 'intro' | 'body' | 'outro' = 'body';
            if (idx === 0) type = 'intro';
            else if (idx === paragraphs.length - 1) type = 'outro';

            parsedCards.push({
              id: `card-${Date.now()}-${idx}`,
              type,
              text
            });
          }
        });
      }

      if (parsedCards.length > 0) {
        setScriptCards(parsedCards);
        setActiveCardIndex(0);
        setScriptMode('cards');
        setSuccessMsg(`🏆 הפקת בהצלחה ${parsedCards.length} כרטיסיות דיון!`);
      } else {
        setErrorMsg('לא הצלחנו לפענח כרטיסיות מהטקסט שהוזן. ודאו שהטקסט בפורמט הנכון.');
      }
    }

    setIsAiAssistantOpen(false);
  };

  const handleExportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setErrorMsg('אנא מאפשר/י פעולת פופ-אפ בדפדפן על מנת לייצא את הקובץ ל-PDF.');
      return;
    }

    const title = "תסריט וכרטיסיות ההסכת שלי";
    const dateStr = new Date().toLocaleDateString('he-IL');

    const validCards = scriptCards.filter(card => card.text && card.text.trim().length > 0);
    const hasCards = scriptMode === 'cards' && validCards.length > 0;
    const hasText = scriptMode === 'text' && scriptContent && scriptContent.trim().length > 0;

    let cardsHTML = '';
    if (hasCards) {
      cardsHTML = validCards.map((card, idx) => {
        const typeLabel = card.type === 'intro' ? 'פתיח 🎬' : card.type === 'outro' ? 'סיכום 🏁' : 'גוף / נקודה לדיון 🎙️';
        return `
          <div class="card-box" style="background-color: #ffffff !important; border: 2px solid #000000 !important; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; direction: rtl; text-align: right; color: #000000 !important;">
            <span class="card-header-badge" style="font-weight: 800; font-size: 13px; color: #000000 !important; border-bottom: 1.5px solid #000000; padding-bottom: 5px; margin-bottom: 8px; display: block;">${typeLabel} #${idx + 1}</span>
            <p class="card-body-text" style="font-size: 14px; line-height: 1.6; color: #000000 !important; margin: 0; white-space: pre-wrap; font-weight: 500;">${formatInstructionsHTML(card.text)}</p>
          </div>
        `;
      }).join('');
    }

    let formattedTextHTML = '';
    if (hasText) {
      formattedTextHTML = scriptContent
        .split('\n\n')
        .map(p => {
          const dialogueMatch = p.match(/^(\[[0-9:\s-]*\])?\s*([^:]+):/);
          if (dialogueMatch) {
            const time = dialogueMatch[1] ? `<span style="color: #4b5563; font-family: monospace; font-size: 13px; margin-left: 8px; background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${escapeHtml(dialogueMatch[1])}</span>` : '';
            const speaker = `<strong style="color: #000000; font-size: 15px; border-bottom: 2px solid #000000; padding-bottom: 1px;">${escapeHtml(dialogueMatch[2])}:</strong>`;
            const rest = p.substring(dialogueMatch[0].length);
            return `<p style="margin-bottom: 14px; line-height: 1.6; font-size: 14px; color: #000000; margin-top: 0;">${time} ${speaker} ${formatInstructionsHTML(rest)}</p>`;
          }
          return `<p style="margin-bottom: 14px; line-height: 1.6; font-size: 14px; color: #000000; margin-top: 0;">${formatInstructionsHTML(p)}</p>`;
        })
        .join('');
    }

    let contentHTML = '';
    if (hasText) {
      contentHTML += `
        <div>
          <div class="section-title" style="font-size: 18px; font-weight: 700; color: #000000; border-bottom: 2px solid #000000; padding-bottom: 4px; margin-top: 10px; margin-bottom: 15px; display: inline-block;">✍️ תסריט מלא</div>
          <div style="background-color: #ffffff; border: 1.5px solid #000000; border-radius: 8px; padding: 20px; margin-bottom: 20px; color: #000000;">
            ${formattedTextHTML}
          </div>
        </div>
      `;
    }

    if (hasCards) {
      contentHTML += `
        <div>
          <div class="section-title" style="font-size: 18px; font-weight: 700; color: #000000; border-bottom: 2px solid #000000; padding-bottom: 4px; margin-top: 10px; margin-bottom: 15px; display: inline-block;">📋 כרטיסיות דיון ונקודות לניווט</div>
          <div style="margin-top: 10px;">
            ${cardsHTML}
          </div>
        </div>
      `;
    }

    if (!hasText && !hasCards) {
      contentHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #4b5563; font-style: italic; border: 1.5px solid #000000; border-radius: 8px;">
          אין כרטיסיות דיון עם טקסט או תסריט כתוב לייצוא.
        </div>
      `;
    }

    const infoHeaderHTML = (podcastName || participants) ? `
      <div style="background-color: #ffffff; border: 1.5px solid #000000; border-radius: 8px; padding: 14px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; direction: rtl; text-align: right;">
        ${podcastName ? `<div><strong style="color: #000000; font-size: 12px; display: block; margin-bottom: 4px;">שם ההסכת:</strong><span style="font-size: 14px; font-weight: 700; color: #000000;">${escapeHtml(podcastName)}</span></div>` : '<div></div>'}
        ${participants ? `<div><strong style="color: #000000; font-size: 12px; display: block; margin-bottom: 4px;">משתתפים:</strong><span style="font-size: 14px; font-weight: 700; color: #000000;">${escapeHtml(participants)}</span></div>` : '<div></div>'}
      </div>
    ` : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;900&display=swap');
          
          @page {
            size: auto;
            margin: 15mm 15mm 15mm 15mm;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Rubik', sans-serif;
            direction: rtl;
            text-align: right;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            width: 100%;
          }

          .header {
            border-bottom: 2px solid #000000;
            padding-bottom: 15px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header-title {
            font-size: 24px;
            font-weight: 900;
            color: #000000;
            margin: 0 0 6px 0;
            letter-spacing: -0.025em;
          }
          .header-subtitle {
            font-size: 13px;
            color: #374151;
            margin: 0;
          }
          .meta-date {
            font-size: 12px;
            color: #4b5563;
            text-align: left;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #000000;
            padding-top: 15px;
            font-size: 11px;
            color: #4b5563;
            text-align: center;
            page-break-inside: avoid;
          }
          
          @media print {
            body {
              padding: 0;
              margin: 0;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            .section-title, .header, .footer {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="header-title">${title}</h1>
            <p class="header-subtitle">הופק באמצעות סטודיו ההסכתים הדיגיטלי של MTEACH</p>
          </div>
          <div class="meta-date">
            תאריך הפקה: ${dateStr}
          </div>
        </div>

        ${infoHeaderHTML}
        ${contentHTML}

        <div class="footer">
          הופק באופן מקצועי באמצעות סטודיו ההסכתים הדיגיטלי • המכללה לחינוך MTEACH
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const currentWordsCount = useMemo(() => {
    if (scriptMode === 'text') {
      return getWordCount(scriptContent);
    } else {
      return getWordCount(scriptCards.map(c => c.text).join(' '));
    }
  }, [scriptContent, scriptCards, scriptMode]);

  return (
    <div id="script-panel" className="flex flex-col gap-5 rounded-2xl p-6 transition-colors duration-300 w-full bg-[#2d2d37]/45 shadow-xl border border-zinc-700/20">
      
      <div className="flex items-center justify-between pb-3 border-b border-zinc-700/10">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-zinc-400" />
          <h2 className="text-base font-bold uppercase tracking-wider text-zinc-300 font-sans">
            תסריט ונקודות לדיון
          </h2>
        </div>
      </div>

      {!teleprompterMode ? (
        /* EDIT MODE */
        <div className="flex flex-col gap-5 flex-1">
          
          {/* Podcast Info Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-zinc-700/10">
            <div className="flex flex-col gap-1.5">
              <label className={`font-bold text-xs ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'} font-sans`}>
                שם ההסכת (פודקאסט):
              </label>
              <input
                type="text"
                value={podcastName}
                onChange={(e) => setPodcastName(e.target.value)}
                placeholder="למשל: היסטוריה של המדע..."
                className={`rounded-xl p-2.5 text-sm font-bold border font-sans ${
                  isDarkMode 
                    ? 'bg-[#2d2d37] text-zinc-200 border-zinc-700/60 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-700' 
                    : 'bg-white text-zinc-800 border-zinc-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={`font-bold text-xs ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'} font-sans`}>
                שמות המשתתפים בשיחה:
              </label>
              <input
                type="text"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="למשל: דניאל ומיכל..."
                className={`rounded-xl p-2.5 text-sm font-bold border font-sans ${
                  isDarkMode 
                    ? 'bg-[#2d2d37] text-zinc-200 border-zinc-700/60 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-700' 
                    : 'bg-white text-zinc-800 border-zinc-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
            </div>
          </div>

          {/* Script Mode & Examples Row */}
          <div className="flex flex-col gap-2 border-b border-zinc-700/10 pb-4">
            <label className={`font-bold text-xs ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'} font-sans`}>
              סגנון עריכה:
            </label>
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex rounded-xl p-1 gap-1 bg-[#1c1c22]">
                <button
                  onClick={() => setScriptMode('text')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    scriptMode === 'text'
                      ? 'bg-[#373743] text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  תסריט
                </button>
                <button
                  onClick={() => setScriptMode('cards')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    scriptMode === 'cards'
                      ? 'bg-[#373743] text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  כרטיסיות דיון
                </button>
              </div>

              {/* Compact Examples Selector */}
              <div className="relative">
                {!showExamples ? (
                  <button
                    onClick={() => setShowExamples(true)}
                    className="py-1.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#2d2d37] hover:bg-[#373743] text-zinc-300 hover:text-white border border-zinc-700/50 shadow-md transition-all cursor-pointer flex items-center justify-center font-sans"
                  >
                    <span>דוגמאות</span>
                  </button>
                ) : (
                  <div className="absolute left-0 right-auto top-full mt-2 z-50 w-72 bg-[#2d2d37] p-3.5 rounded-xl border border-zinc-700/50 shadow-2xl shadow-black/85">
                    <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-zinc-700/25">
                      <label className="text-xs font-bold text-zinc-300 font-sans">
                        בחר/י דוגמה להסכת:
                      </label>
                      <button
                        onClick={() => setShowExamples(false)}
                        className="text-[11px] font-bold px-2 py-0.5 rounded transition-all bg-[#434351] hover:bg-[#4d4d5d] text-zinc-300 cursor-pointer"
                      >
                        סגור
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {SCRIPT_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          onClick={() => {
                            if (scriptMode === 'text') {
                              setScriptContent(tmpl.content);
                            } else {
                              setScriptCards(tmpl.cards.map((c, idx) => ({
                                id: `card-${Date.now()}-${idx}`,
                                type: c.type as 'intro' | 'body' | 'outro',
                                text: c.text
                              })));
                            }
                            if (tmpl.podcastName) {
                              setPodcastName(tmpl.podcastName);
                            }
                            if (tmpl.participants) {
                              setParticipants(tmpl.participants);
                            }
                            setShowExamples(false);
                          }}
                          className="text-center font-bold text-xs py-2 px-1 rounded-lg transition-all block focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer bg-[#1c1c22] hover:bg-[#373743] text-white border border-zinc-700/40 shadow-sm"
                        >
                          {tmpl.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Assistant Scaffolding Panel */}
          <div className={`rounded-2xl border p-4.5 mb-5 transition-all duration-300 ${
            isAiAssistantOpen
              ? (isDarkMode ? 'bg-[#1c1c22] border-[#6366f1]/40 shadow-lg shadow-indigo-950/20' : 'bg-indigo-50/50 border-indigo-200 shadow-md')
              : (isDarkMode ? 'bg-[#2a2a33]/45 border-zinc-700/40 hover:border-zinc-600/60' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/80')
          }`}>
            <button
              onClick={() => setIsAiAssistantOpen(!isAiAssistantOpen)}
              className="w-full flex items-center justify-between font-bold text-xs sm:text-sm text-right cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6366f1] shrink-0 animate-pulse" />
                <span className={isDarkMode ? 'text-zinc-100 font-sans' : 'text-zinc-800 font-sans'}>
                  {scriptMode === 'text' ? 'סייע כתיבת תסריט מלא' : 'סייע כתיבת כרטיסיות דיון'}
                </span>
                <span className="text-[9px] font-black tracking-wide px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase font-sans">
                  חדש!
                </span>
              </div>
              {isAiAssistantOpen ? <ChevronUp className="w-4.5 h-4.5 text-zinc-400" /> : <ChevronDown className="w-4.5 h-4.5 text-zinc-400" />}
            </button>

            {isAiAssistantOpen && (
              <div className="mt-4 pt-4 border-t border-zinc-700/25 flex flex-col gap-4 text-xs sm:text-sm">
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'} font-sans`}>
                  השתמשו בכלי זה כפיגום דיגיטלי (Scaffolding) כדי לתרגם את החומר העיוני שלכם למתווה שיח מוכן להקלטה. 
                  מלאו את השדות שלהלן, העתיקו את הפרומפט וקבלו תוצר מושלם מג׳מיני.
                </p>

                {/* Step A - Student Notes / Summary Input */}
                <div className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-zinc-700/25 bg-zinc-800/10">
                  <label className={`font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'} font-sans`}>
                    <Book className="w-4 h-4 text-[#6366f1] shrink-0" />
                    הדבקת סיכום השיעור / נקודות מפתח / חומרי למידה:
                  </label>
                  <p className={`text-[11px] leading-relaxed mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'} font-sans`}>
                    הזינו את סיכום המאמר או נקודות התוכן שאתם רוצים להעביר בפרק:
                  </p>
                  <textarea
                    value={aiStudentNotes}
                    onChange={(e) => setAiStudentNotes(e.target.value)}
                    placeholder="לדוגמה:&#10;- למידה מכוונת הישג מפחיתה את חדוות הלמידה של התלמידים.&#10;- חשיבות היכולת של המורה לבצע רפלקציה בזמן אמת (Reflection-in-action)..."
                    className={`w-full min-h-[120px] rounded-xl p-3 text-xs sm:text-sm focus:outline-none transition-all leading-relaxed font-sans border ${
                      isDarkMode
                        ? 'bg-[#1e1e24] text-zinc-200 border-zinc-800 focus:border-indigo-500'
                        : 'bg-zinc-50 text-zinc-800 border-zinc-200 focus:border-indigo-400'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className={`font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'} font-sans`}>
                      זמן כולל מיועד:
                    </label>
                    <select
                      value={aiDuration}
                      onChange={(e) => setAiDuration(e.target.value)}
                      className={`rounded-xl p-2.5 font-bold border cursor-pointer font-sans ${
                        isDarkMode ? 'bg-[#2d2d37] text-zinc-200 border-zinc-700' : 'bg-white text-zinc-800 border-zinc-300'
                      }`}
                    >
                      <option value="דקה אחת">דקה אחת</option>
                      <option value="שתי דקות">שתי דקות</option>
                      <option value="חמש דקות">חמש דקות</option>
                      <option value="עשר דקות">עשר דקות</option>
                      <option value="ללא הגבלת זמן">ללא הגבלת זמן</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={`font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'} font-sans`}>
                      מספר משתתפים:
                    </label>
                    <select
                      value={aiParticipantsCount}
                      onChange={(e) => setAiParticipantsCount(e.target.value)}
                      className={`rounded-xl p-2.5 font-bold border cursor-pointer font-sans ${
                        isDarkMode ? 'bg-[#2d2d37] text-zinc-200 border-zinc-700' : 'bg-white text-zinc-800 border-zinc-300'
                      }`}
                    >
                      <option value="1">משתתף יחיד</option>
                      <option value="2">שני משתתפים</option>
                      <option value="3">שלושה משתתפים</option>
                      <option value="4">ארבעה משתתפים</option>
                      <option value="5">חמישה משתתפים או יותר</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'} font-sans`}>
                    שמות הדמויות / משתתפים:
                  </label>
                  <input
                    type="text"
                    value={aiCharacterNames}
                    onChange={(e) => setAiCharacterNames(e.target.value)}
                    placeholder="לדוגמה: מראיין, דוד בן-גוריון"
                    className={`rounded-xl p-2.5 font-bold border font-sans ${
                      isDarkMode
                        ? 'bg-[#2d2d37] text-zinc-200 border-zinc-700 focus:border-indigo-500'
                        : 'bg-white text-zinc-800 border-zinc-300 focus:border-indigo-400'
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'} font-sans`}>
                    טון התסריט / כרטיסיות הדיון:
                  </label>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className={`rounded-xl p-2.5 font-bold border cursor-pointer font-sans ${
                      isDarkMode ? 'bg-[#2d2d37] text-zinc-200 border-zinc-700 focus:border-indigo-500' : 'bg-white text-zinc-800 border-zinc-300 focus:border-indigo-400'
                    }`}
                  >
                    <option value="חברי">חברי (חם, בגובה העיניים)</option>
                    <option value="אקדמי">אקדמי (רשמי ומקצועי)</option>
                    <option value="שיחת רחוב">שיחת רחוב (יומיומי, סלנג קליל)</option>
                    <option value="עצבני">עצבני (טמפרמנטי, מתווכח בלהט)</option>
                    <option value="אינטימי">אינטימי (אישי ורגיש)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 p-3 rounded-xl border border-[#6366f1]/10 bg-indigo-500/5">
                  <label className={`font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-800'} font-sans`}>
                    <Book className="w-4 h-4 text-[#6366f1]" />
                    דינמיקת השיח המבוקשת:
                  </label>
                  <p className={`text-[11px] leading-relaxed mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'} font-sans`}>
                    בחרו את הפורמט הדידקטי המתאים להצפת הידע שברצונכם להציג:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        id: 'ראיון עיתונאי',
                        title: 'ראיון עיתונאי',
                        desc: 'מראיין שואל שאלות עומק מאתגרות, ומרואיין (מומחה) משיב מתוך בקיאות ומבוסס ראיות.'
                      },
                      {
                        id: 'דיבייט',
                        title: 'דיבייט (עימות רטורי)',
                        desc: 'עימות מובנה וקצבי בין שתי עמדות מנוגדות סביב סוגיה שנויה במחלוקת. הצגת טיעונים והפרכת עמדת הנגד.'
                      },
                      {
                        id: 'שיחת סלון',
                        title: 'שיחת סלון (פאנל)',
                        desc: 'שיחה קבוצתית קולחת וחופשית (מנחה + משתתפים) המנגישה ידע מורכב בצורה חברתית וטבעית.'
                      },
                      {
                        id: 'מונולוג חקר',
                        title: 'מונולוג חקר (סולו)',
                        desc: 'הגשת מונולוג אישי, סוחף ומובנה היטב של דובר יחיד, המשלב חקירה תיאורטית מעמיקה יחד עם סיפור נרטיבי או ניתוח מקרה בוחן.'
                      }
                    ].map((arch) => (
                      <label
                        key={arch.id}
                        onClick={() => setAiDynamic(arch.id)}
                        className={`p-2 rounded-lg border transition-all cursor-pointer flex flex-col gap-0.5 text-right font-sans ${
                          aiDynamic === arch.id
                            ? (isDarkMode ? 'bg-indigo-950/40 border-[#6366f1] text-white' : 'bg-indigo-50 border-[#6366f1] text-indigo-950')
                            : (isDarkMode ? 'bg-[#1c1c22] border-zinc-800 hover:border-zinc-700 text-zinc-300' : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700')
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <input
                            type="radio"
                            name="aiDynamic"
                            checked={aiDynamic === arch.id}
                            onChange={() => {}}
                            className="accent-indigo-500 cursor-pointer"
                          />
                          <span>{arch.title}</span>
                        </div>
                        <span className={`text-[10px] pr-5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {arch.desc}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!aiStudentNotes.trim()) {
                      setErrorMsg('אנא הזינו קודם כל את רשימות התוכן שלכם בשלב א׳.');
                      return;
                    }

                    const generatedPrompt = `שלום ג׳מיני. אתה מומחה להנדסת פרומפטים פדגוגיים וארכיטקטורת דיאלוגים לתחום הכשרת המורים (MTEACH).
התפקיד שלך הוא לתרגם את רשימות התוכן והרעיונות שלי למתווה שיח פדגוגי מוכן להקלטה.

להלן פרטי הפודקאסט המבוקש:
1. נקודות מפתח ותוכן עיוני (עוגני תוכן):
"${aiStudentNotes}"

2. דינמיקת השיח הנבחרת: ${aiDynamic}
3. פורמט הפלט המבוקש: ${aiOutputFormat}
4. משך זמן מיועד: ${aiDuration}
5. מספר המשתתפים: ${aiParticipantsCount}
6. שמות הדמויות / המשתתפים: ${aiCharacterNames}
7. טון מבוקש: ${aiTone}

הנחיות פדגוגיות ומבניות קשיחות שעליך ליישם בדיוק רב:
- עוגני תוכן מובלעים: ודא שכל עוגני התוכן והמושגים שציינתי ברשימות משולבים באופן טבעי לאורך הדיון.
- ללא הערות טון או הנחיות משחק: אין לכתוב בסוגריים עגולים שום הנחיה לגבי טון הדיבור, אינטונציה, הבעה או רגש של המשתתפים. הסטודנטים יחליטו בעצמם כיצד לגשת לשיח ולהביע את עצמם. השפה עצמה של הדו-שיח או נקודות השיחה צריכה להביע את הטון המבוקש, ללא תיוג מפורש של טונים בטקסט.
- ללא הערות הפקה, מעברים או מוזיקה: אין לכתוב בסוגריים מרובעים או עגולים שום הנחיות בימוי, אפקטים, מוזיקה או מעברים.

- שמירה על טון הדיבור המבוקש (${aiTone}): עליך לעצב את השפה, הבחירה המילולית וסגנון המשפטים לפי הטון שנבחר:
  * חברי: סגנון חם, ידידותי, מעודד ובגובה העיניים.
  * אקדמי: סגנון רשמי, מנוסח בקפידה, עשיר במושגים מקצועיים ורציני.
  * שיחת רחוב: סגנון יומיומי חופשי, קליל, עם שימוש בסלנג נפוץ ובאינטראקציה טבעית ומשוחררת.
  * עצבני: סגנון טמפרמנטי, קולני, לעיתים חסר סבלנות, המתווכח בלהט רב, מביע התנגדות ויוצר חיכוך דינמי.
  * אינטימי: סגנון קרוב, אישי, רגיש, שקט ואיטי, המבוסס על שיתוף כן של רגשות ומחשבות פנימיות.

- התאמה מלאה לדינמיקת השיח הנבחרת (${aiDynamic}):
  ${aiDynamic === 'ראיון עיתונאי' ? 'המבנה מבוסס על ראיון א-סימטרי (מראיין ומרואיין/מומחה). המראיין מנווט עם שאלות חשיבה מאתגרות שנבנו מראש דרך תחקיר, מזהה נקודות תורפה ודוחף לעומק. המרואיין מביא את עומק התוכן העיוני, עונה בצורה ממוקדת, מנומקת ומבוססת ראיות.' : ''}
  ${aiDynamic === 'דיבייט' ? 'המבנה מבוסס על דו-שיח ועימות רטורי מובנה וקצבי בין שתי עמדות מנוגדות סביב סוגיה שנויה במחלוקת. המשתתפים מציגים מערך טיעונים קשיח מבוסס ראיות, ומקשיבים באופן פעיל כדי להגיב ולהפריך את עמדת הצד השני. הקפד על חוקי הלוגיקה והנימוק.' : ''}
  ${aiDynamic === 'שיחת סלון' ? 'המבנה מבוסס על פאנל עם מנחה (3 משתתפים ומעלה). השיחה קבוצתית, קולחת, אסוציאטיבית ובגובה העיניים. על המשתתפים לתרגם ידע מופשט ומושגים תיאורטיים לדיאלוג קהילתי, לשלב אנלוגיות והומור. המשתתפים משלימים זה את דברי זה באורגניות.' : ''}
  ${aiDynamic === 'מונולוג חקר' ? 'המבנה מבוסס על משתתף יחיד (סולו שואו – דובר בודד הפונה ישירות אל המאזין). הדובר מגיש מונולוג אישי, סוחף ומובנה היטב המשלב חקירה תיאורטית מעמיקה יחד עם סיפור נרטיבי או מקרה בוחן מעשי מהשטח, תוך שמירה על רמה גבוהה של קשב, רפלקציה עצמית עמוקה, קצב משתנה וטיעונים חדים.' : ''}

- שמירה קפדנית על שמות המשתתפים (${aiCharacterNames}) ומספר המשתתפים (${aiParticipantsCount}):
  יש לוודא שהתסריט או כרטיסיות השיחה מכילים בדיוק את הדמויות האלה ללא המצאת שמות אחרים או חריגה ממספר המשתתפים שצוין!

- התאמה מלאה לפורמט הפלט המבוקש (קריטי!):
  ${aiOutputFormat === 'תסריט מלא' 
    ? `עבור "תסריט מלא": כתוב תסריט דיאלוג מלא וזורם בשפה דבורה, חמה וטבעית מנקודת המבט של הסטודנטים המקליטים. על המילים להיות כתובות מילה במילה ללא הנחיות טון.` 
    : `עבור "כרטיסיות שיחה דינמיות - Talking Points": חל איסור מוחלט ומלא לכתוב תסריט, דיאלוג או משפטים מוכנים מראש לקריאה! 
    התוכן של כל כרטיסייה חייב להיות מנוסח אך ורק כנקודות מפתח (Bullet Points). 
    ב${aiDynamic}: 
    ${aiDynamic === 'ראיון עיתונאי' ? 'ספק כרטיסיית שאלות ליבה ונקודות מעקב למראיין, וכרטיסיית עוגני תוכן ונתונים גולמיים (ללא תשובות מנוסחות) למרואיין.' : ''}
    ${aiDynamic === 'דיבייט' ? 'ספק כרטיסיות עמדה המכילות רק ראיות, נתונים קשיחים ומושגי חובה עבור כל צד.' : ''}
    ${aiDynamic === 'שיחת סלון' ? 'ספק למנחה ולמשתתפים כרטיסיות של נקודות מפתח, תתי-נושאים ומושגי חובה שיש לשלב לאורך הפרק (ללא ניסוח הדיאלוג עצמו).' : ''}
    ${aiDynamic === 'מונולוג חקר' ? 'ספק לדובר היחיד כרטיסיית מפת נרטיב קשיחה (מבוא ונרטיב, גוף וניתוח מושגי, תובנות ורפלקציה) ומושגי חובה לשילוב לאורך הפרק (ללא ניסוח המשפטים עצמם).' : ''}`
  }

- פורמט מבנה פלט קשיח לפענוח אוטומטי (קריטי):
  ${aiOutputFormat === 'תסריט מלא'
    ? `אנא החזר את התסריט המלא כפסקאות ברורות, כאשר כל פסקה מתחילה בשם הדובר ונקודתיים, למשל באמצעות השמות שבחרתי [${aiCharacterNames}], למשל:\n` + aiCharacterNames.split(',')[0].trim() + ': שלום לכולם...\n' + (aiCharacterNames.split(',')[1] ? aiCharacterNames.split(',')[1].trim() + ': אהלן...' : '')
    : 'אנא החזר את כרטיסיות הדיון עטופות בתוויות הפרדה קשיחות של "=== כרטיסייה ===" בדיוק בפורמט הבא עבור כל כרטיסייה:\n\n=== כרטיסייה ===\nסוג: [פתיח / גוף הדיון / סיכום]\nטקסט: [נקודות שיחה מנחות, מושגים, ראיות ושאלות מפתח ממוקדות לכל דובר - מנוסח אך ורק כנקודות (Bullet Points), ללא תסריט דיאלוג של מילה במילה!]\n\nאין להוסיף טקסט מקדים או מסכם מחוץ לפורמט זה כדי לא לפגוע בפענוח.'}

אנא הפק כעת את הפלט המבוקש בעברית רהוטה ופדגוגית בדיוק רב, ללא הקדמות נוספות מצידך - התחל ישירות בתוכן הפודקאסט עצמו.`;

                    navigator.clipboard.writeText(generatedPrompt).then(() => {
                      setAiPromptCopied(true);
                      setTimeout(() => setAiPromptCopied(false), 4000);
                      window.open('https://gemini.google.com/', '_blank');
                    }).catch(err => {
                      console.error('Failed to copy text: ', err);
                      window.open('https://gemini.google.com/', '_blank');
                    });
                  }}
                  className="w-full mt-2 py-3 rounded-xl font-bold bg-[#6366f1] hover:bg-indigo-700 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm font-sans"
                >
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>{aiPromptCopied ? '✅ הפרומפט הועתק! פותח את Gemini...' : 'הפק והעתק פרומפט פדגוגי ופתח את Gemini חיצונית'}</span>
                  <ExternalLink className="w-4 h-4 text-indigo-200 animate-bounce" />
                </button>

                {aiPromptCopied && (
                  <p className="text-center font-bold text-emerald-500 text-xs animate-pulse mt-1 font-sans">
                    הפרומפט הועתק ללוח בהצלחה! הדביקו אותו ב-Gemini שנפתח כעת בכרטיסייה חדשה.
                  </p>
                )}

                <div className="border-t border-zinc-700/25 my-4 pt-4 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4.5 h-4.5 text-[#6366f1] shrink-0" />
                    <h4 className={`font-bold text-sm font-sans ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                      שלב ב׳ – קליטת התוצר מ-Gemini (פענוח והזרקה אוטומטית)
                    </h4>
                  </div>
                  
                  <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'} font-sans`}>
                    העתיקו את התוצאה המלאה שג׳מיני ייצר, והדביקו אותה כאן. המערכת תפרק ותאכלס את התוכן שלכם אוטומטית במערכת ההקלטה!
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <label className={`font-bold text-xs ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'} font-sans`}>
                      הדביקו כאן את פלט השיחה מ-Gemini:
                    </label>
                    <textarea
                      value={aiPastedOutput}
                      onChange={(e) => setAiPastedOutput(e.target.value)}
                      placeholder="=== כרטיסייה ===&#10;סוג: פתיח&#10;טקסט: שלום לכולם...&#10;&#10;או פסקאות מתוך תסריט מלא..."
                      className={`w-full min-h-[120px] rounded-xl p-3 text-xs sm:text-sm focus:outline-none transition-all leading-relaxed font-sans border ${
                        isDarkMode
                          ? 'bg-[#1e1e24] text-zinc-200 border-zinc-800 focus:border-indigo-500'
                          : 'bg-zinc-50 text-zinc-800 border-zinc-200 focus:border-indigo-400'
                      }`}
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!aiPastedOutput.trim()) {
                        setErrorMsg('אנא הדביקו קודם כל את הפלט מג׳מיני.');
                        return;
                      }

                      const hasExistingData = aiTargetType === 'cards'
                        ? scriptCards.length > 0
                        : scriptContent.trim().length > 0;

                      if (hasExistingData) {
                        setConfirmModal({
                          isOpen: true,
                          title: 'עדכון תסריט / כרטיסיות 🔄',
                          description: aiTargetType === 'cards'
                            ? 'שים לב, פעולה זו תעדכן ותחליף את כרטיסיות הטקסט הנוכחיות בתוצרים שחולצו מג׳מיני. האם לאשר?'
                            : 'שים לב, פעולה זו תעדכן ותחליף את התסריט הנוכחי בתוצרים שחולצו מג׳מיני. האם לאשר?',
                          confirmText: 'כן, עדכן והחלף 🔄',
                          cancelText: 'ביטול',
                          onConfirm: () => {
                            proceedExtraction(aiPastedOutput);
                          }
                        });
                      } else {
                        proceedExtraction(aiPastedOutput);
                      }
                    }}
                    className="w-full mt-1 py-3 rounded-xl font-bold bg-[#6366f1] hover:bg-indigo-700 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm font-sans"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-indigo-200" />
                    <span>חלץ, פרק והזרק למערכת ההקלטה</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {scriptMode === 'text' ? (
            <div className="flex-1 flex flex-col min-h-[300px]">
              <label className="text-sm mb-2 flex items-center justify-between font-bold font-sans">
                <span className="text-zinc-300">כתוב/י או הדבק/י את התסריט שלך כאן:</span>
                <button
                  onClick={() => setScriptContent('')}
                  className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                  <span>נקה הכל</span>
                </button>
              </label>
              <textarea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                placeholder="הדבק/י כאן טקסט מלא להקראה..."
                className={`w-full flex-1 rounded-xl p-4 text-base focus:outline-none transition-all leading-relaxed resize-none font-sans border ${
                  isDarkMode 
                    ? 'bg-[#2d2d37] text-zinc-200 border-zinc-700/60 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-700' 
                    : 'bg-zinc-100 text-zinc-800 border-zinc-300 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300'
                }`}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Cards layout */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className={`text-sm block font-bold font-sans ${isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    הוספת כרטיסיית דיון חדשה:
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleAddCard('intro')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer font-sans ${
                      isDarkMode 
                        ? 'bg-[#373743]/50 border-indigo-500/40 text-indigo-300 hover:bg-[#434351]/80 hover:border-indigo-400' 
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300'
                    }`}
                  >
                    + פתיח
                  </button>
                  <button
                    onClick={() => handleAddCard('body')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer font-sans ${
                      isDarkMode 
                        ? 'bg-[#373743]/50 border-emerald-500/40 text-emerald-300 hover:bg-[#434351]/80 hover:border-emerald-400' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300'
                    }`}
                  >
                    + גוף
                  </button>
                  <button
                    onClick={() => handleAddCard('outro')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer font-sans ${
                      isDarkMode 
                        ? 'bg-[#373743]/50 border-amber-500/40 text-amber-300 hover:bg-[#434351]/80 hover:border-amber-400' 
                        : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300'
                    }`}
                  >
                    + סיכום
                  </button>
                  <button
                    onClick={() => setScriptCards([])}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1 font-sans ${
                      isDarkMode 
                        ? 'bg-red-950/20 border-red-900/50 text-red-300 hover:bg-red-950/40 hover:border-red-700' 
                        : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300'
                    }`}
                    title="נקה את כל הכרטיסיות"
                  >
                    <Trash2 className="w-3 h-3 text-red-500 shrink-0" />
                    <span>נקה הכל</span>
                  </button>
                </div>
              </div>

              {/* Scrollable list of cards */}
              <div className="flex flex-col gap-3 max-h-[520px] md:max-h-[580px] overflow-y-auto pr-1 pb-6">
                {scriptCards.length === 0 ? (
                  <div className={`py-12 px-4 border-2 border-dashed rounded-xl text-center font-sans ${
                    isDarkMode ? 'border-[#373743]' : 'border-zinc-200'
                  }`}>
                    <p className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      אין כרטיסיות דיון עדיין. לחצו על אחד הכפתורים למעלה כדי להוסיף פתיח, גוף או סיכום.
                    </p>
                  </div>
                ) : (
                  scriptCards.map((card, index) => {
                    const isBeingDragged = draggedCardIndex === index;
                    const isHoveredOver = dragOverCardIndex === index && draggedCardIndex !== index;
                    
                    let borderColorClass = '';
                    let badgeBgClass = '';
                    let badgeText = '';
                    if (card.type === 'intro') {
                      borderColorClass = 'border-r-8 border-indigo-500';
                      badgeBgClass = isDarkMode ? 'bg-indigo-950/40 text-indigo-300' : 'bg-indigo-50 text-indigo-700';
                      badgeText = 'פתיח';
                    } else if (card.type === 'body') {
                      borderColorClass = 'border-r-8 border-emerald-500';
                      badgeBgClass = isDarkMode ? 'bg-emerald-950/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700';
                      badgeText = 'גוף הדיון';
                    } else {
                      borderColorClass = 'border-r-8 border-amber-500';
                      badgeBgClass = isDarkMode ? 'bg-amber-950/40 text-amber-300' : 'bg-amber-50 text-amber-700';
                      badgeText = 'סיכום';
                    }

                    return (
                      <div
                        key={card.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverCardIndex !== index) {
                            setDragOverCardIndex(index);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleCardDrop(index);
                        }}
                        className={`flex flex-col gap-2 p-3 rounded-xl transition-all relative ${borderColorClass} ${
                          isBeingDragged
                            ? 'opacity-30 border border-dashed border-zinc-500 bg-[#2d2d37]/50 scale-[0.99]'
                            : isHoveredOver
                            ? 'bg-zinc-700/20 scale-[1.01]'
                            : (isDarkMode ? 'bg-[#373743] text-zinc-100 shadow-sm border border-zinc-700/30' : 'bg-zinc-100 text-zinc-900 shadow-sm')
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              draggable
                              onDragStart={() => setDraggedCardIndex(index)}
                              onDragEnd={() => {
                                setDraggedCardIndex(null);
                                setDragOverCardIndex(null);
                              }}
                              className={`p-1.5 rounded cursor-grab active:cursor-grabbing transition-colors ${
                                isDarkMode ? 'hover:bg-[#434351] text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'
                              }`}
                              title="גרור לשינוי סדר"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-md font-sans ${badgeBgClass}`}>
                              {badgeText}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleMoveCardUp(index)}
                              disabled={index === 0}
                              className={`p-1 rounded transition-colors disabled:opacity-30 ${
                                isDarkMode ? 'hover:bg-[#434351] text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'
                              }`}
                              title="הזז למעלה"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveCardDown(index)}
                              disabled={index === scriptCards.length - 1}
                              className={`p-1 rounded transition-colors disabled:opacity-30 ${
                                isDarkMode ? 'hover:bg-[#434351] text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'
                              }`}
                              title="הזז למטה"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCard(card.id)}
                              className={`p-1 rounded transition-colors ${
                                isDarkMode ? 'hover:bg-[#434351] text-red-400' : 'hover:bg-zinc-200 text-red-600'
                              }`}
                              title="מחק כרטיסיה"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <textarea
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = `${el.scrollHeight}px`;
                            }
                          }}
                          value={card.text}
                          onChange={(e) => handleUpdateCardText(card.id, e.target.value)}
                          placeholder="הקלד את נקודות השיח או התסריט לחלק זה..."
                          className={`w-full p-2.5 text-sm rounded-lg focus:outline-none transition-all leading-relaxed resize-none overflow-hidden ${
                            isDarkMode 
                              ? 'bg-[#252530] text-zinc-200 focus:ring-1 focus:ring-zinc-700' 
                              : 'bg-white text-zinc-800 border border-zinc-200 focus:ring-1 focus:ring-zinc-300'
                          }`}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Unified Edit Mode Footer: Word Count, Time, Export to PDF */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border transition-all mt-2 ${
            isDarkMode 
              ? 'border-zinc-700/30 bg-[#1c1c22]/50' 
              : 'border-zinc-200 bg-zinc-50'
          }`}>
            <div className="flex items-center gap-2.5 text-sm font-sans">
              <span className={`font-bold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>נתוני תסריט:</span>
              <span className={`px-3 py-1.5 rounded-lg border text-xs font-medium font-sans ${
                isDarkMode 
                  ? 'bg-[#31313f] border-zinc-700/50 text-zinc-200' 
                  : 'bg-zinc-100 border-zinc-300 text-zinc-700'
              }`}>
                <strong className="text-[#ffcc00] font-black">{currentWordsCount}</strong> מילים • <strong className="text-emerald-500 font-bold">{formatReadTime(getReadTimeSeconds(currentWordsCount))}</strong> הקראה משוערת
              </span>
            </div>
            
            <button
              onClick={handleExportToPDF}
              className="w-full sm:w-auto text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold transition-all border-2 border-[#ffcc00] text-[#ffcc00] bg-transparent hover:bg-[#ffcc00]/10 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md font-sans"
              title="ייצוא התסריט והכרטיסיות לקובץ PDF מעוצב"
            >
              <Download className="w-4 h-4 text-[#ffcc00]" />
              <span>ייצוא ל-PDF 📄</span>
            </button>
          </div>

        </div>
      ) : null}
    </div>
  );
};
