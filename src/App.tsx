import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  Trash2,
  ChevronUp,
  ChevronDown,
  Download,
  Volume2,
  FileAudio,
  RotateCcw,
  Plus,
  BookOpen,
  Sparkles,
  Clock,
  AlertCircle,
  Info,
  Sliders,
  Scissors,
  FileText,
  VolumeX,
  Check,
  Languages,
  GripVertical,
  Sun,
  Moon,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Book,
  ExternalLink,
  Music,
  Search,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { PodcastTrack, ScriptSuggestion, ScriptCard } from './types';
import { TrackTimeline } from './components/TrackTimeline';
import {
  getAllTracksFromDB,
  saveTrackToDB,
  deleteTrackFromDB,
  clearTracksFromDB,
  saveSettingsToLocalStorage,
  loadSettingsFromLocalStorage,
  getConsentStatus,
  setConsentStatus
} from './utils/storage';

// Pre-defined Hebrew templates for student scripts representing 1-minute academic podcasts
const SCRIPT_TEMPLATES: ScriptSuggestion[] = [
  {
    id: 'debate_evaluation',
    title: 'דו-שיח',
    content: `[00:00 - 00:10] נועם: "שלום לכולם, אני נועם ואיתי נמצאת מיכל. אנחנו מקליטים ישירות מהמכללה לחינוך במסגרת קורס הערכת הישגים ב-MTEACH. היום אנחנו רוצים לשאול את עצמנו: למה כל כך קשה לנו, כמורים לעתיד, ליישם הערכה חלופית בכיתות הטרוגניות בישראל?"

[00:10 - 00:35] נועם: "כשנכנסתי השבוע להתנסות המעשית בבית הספר, ראיתי שהמורים מוצפים בעומס מטורף. בסוף הם פשוט חוזרים למבחנים הרגילים של פעם שמבוססים על שינון. קשה להם מאוד לנהל תהליך אמיתי של הערכה לשם למידה (AfL), כשיש להם שלושים תלמידים בכיתה עם פערים עצומים. מיכל, את חושבת שזה רק עניין של חוסר זמן, או שיש כאן בעיה עמוקה יותר במערכת?"

[00:35 - 00:50] מיכל: "אני לגמרי מבינה את מה שראית בכיתה, נועם, וזה באמת אתגר קשוח. אבל אני מאמינה שהמפתח נמצא במה שסיכמנו בשיעור האחרון – המעבר לציון מספרי יבש הוא מה שמקבע את הפערים. אם נתחיל להשתמש במשוב איכותני מקדם למידה, נוכל לתת לכל תלמיד בכיתה ההטרוגנית הזו יעד שמותאם אישית אליו. זה משנה לחלוטין את חוויית המסוגלות והמוטיבציה שלו."

[00:50 - 01:00] מיכל: "בשורה התחתונה, כל עוד משרד החינוך ימשיך למדוד אותנו רק בשורות תחתונות של ציונים, יהיה לנו קשה לשנות את התרבות הזו בשטח. תודה שהקשבתם לנו, אנחנו היינו נועם ומיכל ב'מדברים הערכה', נתראה בפרק הבא!"`,
    cards: [
      { type: 'intro', text: 'פתיח:\nמה אנחנו עושים: ברגע שאות הפתיחה המוזיקלי נחלש, אני פותח את המיקרופון. אנחנו מציגים את עצמנו בקול טבעי, מציינים שאנחנו מקליטים במסגרת קורס ההערכה של MTEACH, ומציגים מיד את הדילמה של הפרק כדי ליצור תיאום ציפיות חד עם המאזינים.' },
      { type: 'body', text: 'כרטיסיית הניווט שלי (נועם – דובר א\'):\nאני מציג את האתגר המעשי שסיכמנו בשיעורים: מדוע המורים שפגשתי בהתנסות המעשית בבתי הספר נוטים לחזור למבחנים רגילים המבוססים על שינון, למרות שהם רוצים ליישם הערכה חלופית.\nאני חייב לשלב בדיבור שלי את מושג החובה (עוגן התוכן): "הערכה לשם למידה (AfL)", אבל אני עושה זאת במילים שלי ולא מקריא הגדרה יבשה מהספר.\nאני מסיים בשאלה ישירה שמאלצת את השותפה מולי להגיב אליי.' },
      { type: 'body', text: 'כרטיסיית הניווט שלי (מיכל – דוברת ב\'):\nאני מקשיבה באופן פעיל לדוגמה שנועם נותן מהכיתה שלו. אני לא קופצת ישר לטקסט המוכן שלי, אלא מגיבה קודם כל לדבריו כדי לייצר שיחה אמיתית ורציפה (Communality).\nאני מציעה מענה לדילמה שלו באמצעות מושג התוכן שסיכמנו בכיתה: "משוב איכותני מקדם למידה".\nאני מסבירה בקצרה כיצד משוב כזה בכיתה הטרוגנית מחזק את תחושת המסוגלות (Competence) והמוטיבציה הפנימית של התלמיד ללמוד.' },
      { type: 'outro', text: 'סיכום:\nאני מנסחת משפט סיכום קצר שמציג תובנה ביקורתית על עתיד הפרקטיקה הזו במערכת החינוך בישראל, מודה לנועם ולמאזינים, ומורידה את הפרק אל אות הסיום המוזיקלי.' }
    ]
  },
  {
    id: 'panel_sociology',
    title: 'פאנל עמיתים',
    content: `[00:00 - 00:10] מנחה: "שלום לכולם, אתם בפאנל המהיר של 'סוציולוגיה מהשטח'. אני כאן עם עמית ושירה, והיום בדקה אחת אנחנו שואלים את עצמנו: האם המקיפים בפריפריה בישראל באמת פותחים דלתות, או שהם עדיין מייצרים הסללה סמויה? עמית, מה אתה רואה בשטח?"

[00:10 - 00:32] עמית: "תשמעו, כשאני מסתכל על מה שקורה בהתנסות המעשית שלי השנה בבית הספר בדרום, אי אפשר שלא לראות את בורדייה קם לתחייה. לתלמידים שמגיעים מרקע מוחלש יש פחות מה שהאקדמיה מגדירה הון תרבותי, ובמקום שהמערכת תצמצם את הפער, היא מנתבת אותם מראש למגמות מקצועיות פחות נחשבות. זו פשוט הסללה מודרנית, רק בשמות מכובסים."

[00:32 - 00:50] שירה: "אני מבינה לגמרי את האכזבה שלך ממה שראית, עמית, אבל אני רוצה לאתגר את הגישה הפסימיסטית הזו. בתיכון הטכנולוגי שאני מתנסה בו במרכז, המגמות האלו הן ה-מנוף למוביליות חברתית. התלמידים שלי מקבלים הסמכות טכנולוגיות שנותנות להם כרטיס כניסה ישיר לתפקידים יוקרתיים בצבא ומשם להייטק. זה משנה את מסלול החיים שלהם, בלי קשר לנקונדת הזינוק."

[00:50 - 01:00] מנחה: "אז המתח בין שעתוק פערים להזדמנות אמיתית נשאר הדילמה הכי גדולה שלנו כמורים לעתיד. תודה לעמית ושירה על הדיון המרתק, נתראה בפרק הבא של 'סוציולוגיה מהשטח'!"`,
    cards: [
      { type: 'intro', text: 'פתיח:\nמה אני עושה (כמנחה הפאנל): אני פותח את המיקרופון מיד עם דעיכת הג\'ינגל, מציג את חברי הפאנל (עמית ושירה) ומציג את שאלת המפתח לפאנל הסוציולוגי הלימודי שלנו: האם המקיף בפריפריה הוא כלי למוביליות או מלכודת משעתקת פערים? אני זורק את רשות הדיבור ישירות לעמית.' },
      { type: 'body', text: 'כרטיסיית הניווט שלי (עמית – משתתף א\', הזווית הביקורתית):\nאני מציג את העמדה הביקורתית מתוך חומרי הלימוד שסיכמנו בכיתה.\nאני מחויב לשלב בדיבור שלי את עוגן התוכן: "הון תרבותי" (לפי בורדייה), ומקשר אותו ישירות למה שראיתי בעיניים שלי במהלך ההתנסות המעשית השנה בבית ספר בדרום (כדי לייצר רפלקציה עמוקה מבוססת חוויה).\nאני טוען שקיימת הסללה מודרנית במסווה של מגמות טכנולוגיות ומסיים בנימה שמזמינה תגובה.' },
      { type: 'body', text: 'כרטיסיית הניווט שלי (שירה – משתתפת ב\', הזווית המערכתית והקשבה פעילה):\nאני מקשיבה היטב לטיעון של עמית על ההתנסות שלו. בשום אופן אני לא קוראת דף מוכן מראש, אלא פותחת במשפט שמתייחס ישירות למה שהוא אמר ("אני מבינה את האכזבה שלך מהשטח, עמית, אבל...").\nאני מציגה את זווית הנגד התיאורטית: כיצד רפורמות המגמות החדשות יכולות להוות מנוף לעוגן התוכן המחייב שלי: "מוביליות חברתית".\nאני נותנת דוגמה קצרה מתלמיד שאני חונכת בהתנסות שלי שמצא מסלול ישיר ליחידה טכנולוגית בצבא בזכות המגמה שלו.' },
      { type: 'outro', text: 'סיכום:\nמה אני עושה (כמנחה הפאנל): אני חוזר לשידור, קושר את שני הטיעונים של חבריי לתובנה ביקורתית מסכמת (הצורך של מורים בשטח להיות מודעים להסללה סמויה), מודה לעמית ושירה ומוריד את הפרק אל אות הסיום המוזיקלי.' }
    ]
  },
  {
    id: 'interview_philosophy',
    title: 'ראיון',
    content: `[00:00 - 00:10] מראיין: "ברוכים הבאים ל'חינוך בגובה העיניים'. אני נועם, והיום אני מארח את מיכל כדי להבין איך אפשר להחיות את מרטין בובר בכיתות הנוער של היום. מיכל, שלום לך."

[00:10 - 00:35] מראיין: "השבוע הגעתי להתנסות המעשית בתיכון, וזה היה מייאש. חצי כיתה הייתה בתוך הטלפונים, והרגשתי שהתקשורת בינינו היא לגמרי מה שבובר מכנה יחסי אני-לז – הם ראו בי רק פונקציה שמפריעה להם, ואני ראיתי בהם הפרעה. איך מפרקים את הניכור הזה בדור המסכים?"

[00:35 - 00:50] מיכל: "נועם, מה שחווית זו בדיוק הבעיה של מערכת החינוך המודרנית שמקדשת רק הספק וציונים. בובר לא אמר שזה קל, אבל הוא טען שכדי לייצר זיקה דיאלוגית של אני-אתה, אתה לא צריך מערך שיעור מושלם. אתה צריך פשוט להוריד את המגננות, להסתכל לתלמיד בעיניים, ולהקשיב לו באמת אפילו לדקה אחת. ברגע שתלמיד מרגיש שפגשת אותו כאדם, המסך פשוט יורד לבד."

[00:50 - 01:00] מראיין: "אז אולי במקום להחרים טלפונים, פשוט נתחיל לדבר איתם בגובה העיניים. תודה רבה מיכל, ותודה לכם המאזינים. נתראה בפרק הבא!"`,
    cards: [
      { type: 'intro', text: 'פתיח:\nמה אני עושה (כמראיין): אני פותח מיד עם דעיכת אות הפתיחה, מציג את ההסכת שלי, מברך את המרואיינת שלי (שהיא סטודנטית עמיתה לקורס שמגלמת מומחית לנושא או מורה מהשטח), ומציג את שאלת הפתיחה הממוקדת: האם אפשר לייצר קשר אמיתי כשהתלמידים תקועים בטיקטוק?' },
      { type: 'body', text: 'כרטיסיית הניווט שלי (נועם – המראיין החוקר):\nאני מציג דילמה מעשית שחוויתי השבוע בהתנסות המעשית: ניסיתי לנהל דיון בכיתה י\' וכולם היו עם הראש במסכים.\nאני מפנה שאלה ממוקדת ומאתגרת ומחייב את המרואיינת להתייחס לעוגן התוכן: "יחסי אני-לז" (התייחסות לאדם כאל חפץ או אמצעי) מול המצב בכיתות.' },
      { type: 'body', text: 'כרטיסיית הניווט שלי (מיכל – המרואיינת המומחית):\nאני מקשיבה לקושי האמיתי שנועם העלה מהשטח. אני לא מקריאה תשובה מוכנה מהדף, אלא פותחת בהתייחסות ישירה למסכים שהוא הזכיר.\nאני שולפת מזיכרוני ומסכמת את הפתרון של בובר באמצעות עוגן התוכן המחייב שלי: "זיקה דיאלוגית (אני-אתה)".\nאני מסבירה בקצרה ובמילים שלי שתרגול של חמש דקות ויסות או הקשבה בתחילת השיעור הוא לא בזבוז זמן, אלא הדרך היחידה לבנות פניות קוגניטיבית ללמידה.' },
      { type: 'outro', text: 'סיכום:\nמה אני עושה (כמראיין): אני מגיב בקצרמנט לתשובה שלה (למשל: "נקודה למחשבה לשיעור הבא שלי"), מודה לה ולמאזינים, ומסמן באצבע לשותף הטכני להעלות את מוזיקת הסיום.' }
    ]
  },
  {
    id: 'host_expert_sel',
    title: 'מנחה ומומחה',
    content: `[00:00 - 00:10] אני (מנחה): "שלום לכולם, אני נועם ואתם ב'מחשבים מסלול פדגוגי' מהמכללה לחינוך. היום נבין איך מנהלים כיתה סוערת בלי להרים את הקול, ואיתי באולפן נמצאת מיכל, הסטודנטית המומחית שלנו לקשר שבין רגש ללמידה. שלום מיכל."

[00:10 - 00:32] אני (מנחה): "מיכל, השבוע בהתנסות המעשית שלי בחטיבת הביניים הרגשתי שאני שוטר ולא מורה. התלמידים היו חסרי שקט, הניידים צפצפו, והרגשתי שאין לי שום כלי לייצר אקלים כיתה מיטבי כשכולם בתוך סערה. איך התיאוריה שלמדנו יכולה בכלל לפגוש בלגן כזה בזמן אמת?"

[00:32 - 00:50] מיכל (מומחית): "נועם, הקושי שחווית הוא בדיוק המקום שבו אנחנו חייבים לשנות דיסקט בשטח. הספרות המחקרית מראה שאי אפשר להשתיק כיתה בכוח, אלא חייבים להכניס למידה רגשית-חברתית (SEL) כחלק בלתי נפרד מהשיעור. כשאתה עוצר לשלוש דקות של תרגול ויסות רגשי או שיתוף קצר בפתיחת השיעור, התלמידים נרגעים, מרגישים שרואים אותם, והפניות שלהם להקשיב לחומר העיוני מזנקת."

[00:50 - 01:00] אני (מנחה): "אז בשורה התחתונה – כדי לנהל את הכיתה, אנחנו צריכים קודם כל ללמוד לנהל את הרגש של הלומדים. תודה רבה למיכל, תודה לכם המאזינים, ונתראה בפרק הבא של 'מחשבים מסלול פדגוגי'!"`,
    cards: [
      { type: 'intro', text: 'פתיח:\nמה אני עושה (כמנחה המקליט): ברגע שאות הפתיחה נחלש, אני פותח את המיקרופון, מציג את עצמי ואת ההסכת שלנו, ומציג את מיכל (עמיתתי לקבוצה) כמי שחקרה לעומק את תחום ה-SEL בסילבוס שלנו. אני מציג את השאלה המרכזית: איך מייצבים כיתה סוערת מבלי להפוך לשוטרים?' },
      { type: 'body', text: 'כרטיסיית הניווט שלי (נועם – המנחה):\nאני מביא דילמה חמה וחווייתית מתוך ההתנסות המעשית שלי השבוע בבית הספר: נכנסתי לכיתה ז\', כולם צעקו, הרגשתי חסר אונים וכל הזמן רק ביקשתי שקט.\nאני מפנה שאלה ישירה ומחייב את המרואיינת להתייחס לעוגן התוכן המרכזי: כיצד הבלגן הזה משפיע על "אקלים כיתה" חיובי?' },
      { type: 'body', text: 'כרטיסיית הניווט שלי (מיכל – הסטודנטית המומחית):\nאני מקשיבה לקושי האותנטי של נועם. אני לא מקריאה הגדרה יבשה מהסיכומים שלי, אלא פותחת בתיקוף התחושה שלו ("זה באמת שלב מתיש, נועם, אבל...").\nאני מציגה את הפתרון התיאורטי שסיכמנו בשיעור האחרון ומחויבת לשלב בדיבור שלי את שני עוגני התוכן המחייבים: "למידה רגשית-חברתית (SEL)" ו-"ויסות רגשי".\nאני מסבירה בקצרה ובמילים שלי שתרגול של חמש דקות ויסות או הקשבה בתחילת השיעור הוא לא בזבוז זמן, אלא הדרך היחידה לבנות פניות קוגניטיבית ללמידה.' },
      { type: 'outro', text: 'סיכום:\nמה אני עושה (כמנחה): אני חוזר לשידור, מנסח תובנה ביקורתית קצרה (מורה טוב הוא קודם כל עוגן רגשי ולא רק מזרים חומר), מודה למיכל ולמאזינים, ומוריד את הפרק אל אות הסיום המוזיקלי.' }
    ]
  }
];

// Helper functions for word count and average reading time (Hebrew ~130 words per minute)
const getWordCount = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Filter out timestamps and non-word characters to get a more accurate speech-word count
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

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Mobile recording panel expanded state
  const [isSidebarExpandedMobile, setIsSidebarExpandedMobile] = useState<boolean>(false);

  // Main Panel Tab: 'tracks' for editing tracks, 'text' for working with the text/script
  const [mainTab, setMainTab] = useState<'text' | 'tracks'>('text');

  // Toggle for showing example podcast scripts
  const [showExamples, setShowExamples] = useState<boolean>(false);

  // AI Prompt Assistant states (SMBK Pod AI Assistant)
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState<boolean>(false);
  const [aiStudentNotes, setAiStudentNotes] = useState<string>("");
  const [aiStructure, setAiStructure] = useState<string>("שיחה בין שני אנשים");
  const [aiOutputFormat, setAiOutputFormat] = useState<string>("תסריט מלא");
  const [aiDuration, setAiDuration] = useState<string>("3 דקות");
  const [aiArchetype, setAiArchetype] = useState<string>("בית מדרש");
  const [aiPromptCopied, setAiPromptCopied] = useState<boolean>(false);
  const [aiPastedOutput, setAiPastedOutput] = useState<string>("");
  const [aiTargetType, setAiTargetType] = useState<'cards' | 'text'>('cards');

  // Script / Notes panel state
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [scriptContent, setScriptContent] = useState<string>("");
  const [scriptMode, setScriptMode] = useState<'text' | 'cards'>('cards');
  const [scriptCards, setScriptCards] = useState<ScriptCard[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [podcastName, setPodcastName] = useState<string>("");
  const [participants, setParticipants] = useState<string>("");
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [dragOverCardIndex, setDragOverCardIndex] = useState<number | null>(null);

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



  const [teleprompterMode, setTeleprompterMode] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [scrollSpeed, setScrollSpeed] = useState<number>(3); // 1-10 scale
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  // Premium Teleprompter states
  const [speechRate, setSpeechRate] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);

  // Drag-and-drop state for track cards
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Audio Tracks State
  const [tracks, setTracks] = useState<PodcastTrack[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Freesound integration states
  const [isFreesoundModalOpen, setIsFreesoundModalOpen] = useState<boolean>(false);
  const [freesoundCategory, setFreesoundCategory] = useState<'intro' | 'transition' | 'outro'>('intro');
  const [freesoundResults, setFreesoundResults] = useState<any[]>([]);
  const [freesoundLoading, setFreesoundLoading] = useState<boolean>(false);
  const [freesoundSearchQuery, setFreesoundSearchQuery] = useState<string>("");
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  const fetchFreesoundAssets = async (category: 'intro' | 'transition' | 'outro', customQuery?: string) => {
    setFreesoundLoading(true);
    setErrorMsg(null);
    try {
      let query = customQuery;
      if (!query) {
        if (category === 'intro') {
          query = 'podcast intro music';
        } else if (category === 'transition') {
          query = 'podcast transition effect';
        } else {
          query = 'podcast closing music';
        }
      }

      const response = await fetch(`/api/freesound?type=${category === 'transition' ? 'soundeffects' : 'music'}&q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch from proxy, status: ${response.status}`);
      }
      const data = await response.json();
      setFreesoundResults(data.results || []);
    } catch (error: any) {
      console.error('Error loading Freesound assets:', error);
      setErrorMsg('שגיאה בטעינת קטעי שמע מ-Freesound. אנא נסה שוב.');
    } finally {
      setFreesoundLoading(false);
    }
  };

  useEffect(() => {
    if (isFreesoundModalOpen) {
      fetchFreesoundAssets(freesoundCategory, freesoundSearchQuery);
    }
  }, [isFreesoundModalOpen, freesoundCategory]);

  useEffect(() => {
    if (!isFreesoundModalOpen) {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
        setPreviewAudio(null);
      }
      setPreviewPlayingId(null);
      setFreesoundSearchQuery("");
    }
  }, [isFreesoundModalOpen]);

  const togglePreviewAudio = (hitId: string, audioUrl: string) => {
    if (previewPlayingId === hitId && previewAudio) {
      previewAudio.pause();
      setPreviewPlayingId(null);
    } else {
      if (previewAudio) {
        previewAudio.pause();
      }
      const audio = new Audio(audioUrl);
      audio.play().catch(e => console.error("Error playing preview:", e));
      audio.onended = () => {
        setPreviewPlayingId(null);
      };
      setPreviewAudio(audio);
      setPreviewPlayingId(hitId);
    }
  };

  const handleAddFreesoundTrack = async (hit: any) => {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.src = '';
      setPreviewAudio(null);
    }
    setPreviewPlayingId(null);

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const categoryHebrew = freesoundCategory === 'intro' ? 'פתיח' : freesoundCategory === 'transition' ? 'מעברון' : 'סגיר';
    const rawTags = (hit.tags && hit.tags.length > 0) ? hit.tags.join(', ') : '';
    const cleanTag = (hit.tags && hit.tags.length > 0) ? hit.tags[0] : 'Freesound';
    const trackName = `אפקט/מוזיקה (${categoryHebrew}) - ${cleanTag}`;

    try {
      const audioUrl = hit.previews['preview-hq-mp3'] || hit.previews['preview-lq-mp3'];
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error('CORS or Network error downloading file');
      }
      const audioBlob = await audioResponse.blob();

      const decodedBuffer = await decodeFileToBuffer(audioBlob);
      const duration = decodedBuffer.duration;

      const newTrack: PodcastTrack = {
        id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: trackName,
        blob: audioBlob,
        audioUrl: URL.createObjectURL(audioBlob),
        audioBuffer: decodedBuffer,
        duration: duration,
        trimStart: 0,
        trimEnd: duration,
        volume: 0.8,
        isEffect: true,
      };

      setTracks((prev) => [...prev, newTrack]);
      setSuccessMsg(`התווסף בהצלחה: ${trackName}`);
      setIsFreesoundModalOpen(false);
    } catch (err: any) {
      console.error('Error adding Freesound track:', err);
      alert('לא ניתן היה להוריד את הקובץ ישירות בשל הגבלות דפדפן, אנא נסה קטע אחר');
    } finally {
      setIsUploading(false);
    }
  };

  // Native recording instances
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  // Web Audio Context & Analyser
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micCanvasRef = useRef<HTMLCanvasElement>(null);

  // Audio Playback State for Individual Tracks
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Merge & Export State
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [hasUnmergedChanges, setHasUnmergedChanges] = useState<boolean>(true);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [mergedDuration, setMergedDuration] = useState<number>(0);
  const [isMergedPlayerPlaying, setIsMergedPlayerPlaying] = useState<boolean>(false);
  const mergedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setHasUnmergedChanges(true);
  }, [tracks]);

  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [lastScrollY, setLastScrollY] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 80) {
        setShowHeader(true);
      } else {
        if (currentScrollY > lastScrollY + 5) {
          setShowHeader(false);
        } else if (currentScrollY < lastScrollY - 5) {
          setShowHeader(true);
        }
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

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

  // Load saved settings and tracks on initial load if consent is accepted
  useEffect(() => {
    const hasConsented = getConsentStatus();
    if (!hasConsented) {
      setShowConsentModal(true);
    } else {
      loadSavedData();
    }
  }, []);

  const loadSavedData = async () => {
    const settings = loadSettingsFromLocalStorage();
    if (settings) {
      if (settings.podcastName !== undefined) setPodcastName(settings.podcastName);
      if (settings.participants !== undefined) setParticipants(settings.participants);
      if (settings.scriptContent !== undefined) setScriptContent(settings.scriptContent);
      if (settings.scriptMode !== undefined) setScriptMode(settings.scriptMode);
      if (settings.scriptCards !== undefined) setScriptCards(settings.scriptCards);
      if (settings.activeCardIndex !== undefined) setActiveCardIndex(settings.activeCardIndex);
      if (settings.aiStudentNotes !== undefined) setAiStudentNotes(settings.aiStudentNotes);
      if (settings.aiStructure !== undefined) setAiStructure(settings.aiStructure);
      if (settings.aiOutputFormat !== undefined) setAiOutputFormat(settings.aiOutputFormat);
      if (settings.aiDuration !== undefined) setAiDuration(settings.aiDuration);
      if (settings.aiArchetype !== undefined) setAiArchetype(settings.aiArchetype);
    }

    try {
      const storedTracks = await getAllTracksFromDB();
      if (storedTracks && storedTracks.length > 0) {
        const decodedTracks: PodcastTrack[] = [];
        for (const st of storedTracks) {
          try {
            const audioBuffer = await decodeFileToBuffer(st.blob);
            decodedTracks.push({
              id: st.id,
              name: st.name,
              blob: st.blob,
              audioUrl: URL.createObjectURL(st.blob),
              audioBuffer,
              duration: st.duration,
              trimStart: st.trimStart,
              trimEnd: st.trimEnd,
              volume: st.volume
            });
          } catch (err) {
            console.error(`Failed to decode track ${st.id} on load:`, err);
          }
        }

        if (settings && settings.trackIdsOrder) {
          const orderMap = new Map(settings.trackIdsOrder.map((id, index) => [id, index]));
          decodedTracks.sort((a, b) => {
            const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
            const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
            return indexA - indexB;
          });
        }

        if (decodedTracks.length > 0) {
          setTracks(decodedTracks);
        }
      }
    } catch (err) {
      console.error('Error loading tracks on startup:', err);
    }
  };

  // Auto-save settings when changes occur
  useEffect(() => {
    if (!getConsentStatus()) return;
    saveSettingsToLocalStorage({
      podcastName,
      participants,
      scriptContent,
      scriptMode,
      scriptCards,
      activeCardIndex,
      aiStudentNotes,
      aiStructure,
      aiOutputFormat,
      aiDuration,
      aiArchetype,
      trackIdsOrder: tracks.map(t => t.id)
    });
  }, [
    podcastName,
    participants,
    scriptContent,
    scriptMode,
    scriptCards,
    activeCardIndex,
    aiStudentNotes,
    aiStructure,
    aiOutputFormat,
    aiDuration,
    aiArchetype,
    tracks
  ]);

  // Sync tracks state with IndexedDB
  useEffect(() => {
    if (!getConsentStatus()) return;

    const syncTracksWithDB = async () => {
      try {
        const storedTracks = await getAllTracksFromDB();
        const storedMap = new Map(storedTracks.map(t => [t.id, t]));
        const currentMap = new Map(tracks.map(t => [t.id, t]));

        // 1. Delete tracks no longer in state
        for (const stored of storedTracks) {
          if (!currentMap.has(stored.id)) {
            await deleteTrackFromDB(stored.id);
          }
        }

        // 2. Add or update tracks
        for (const track of tracks) {
          const stored = storedMap.get(track.id);
          const needsSave = !stored ||
            stored.name !== track.name ||
            stored.trimStart !== track.trimStart ||
            stored.trimEnd !== track.trimEnd ||
            stored.volume !== track.volume ||
            stored.duration !== track.duration;

          if (needsSave) {
            await saveTrackToDB({
              id: track.id,
              name: track.name,
              blob: track.blob,
              duration: track.duration,
              trimStart: track.trimStart,
              trimEnd: track.trimEnd,
              volume: track.volume
            });
          }
        }
      } catch (err) {
        console.error('Error syncing tracks to DB:', err);
      }
    };

    syncTracksWithDB();
  }, [tracks]);

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

  // Split script into words but preserve paragraph boundaries.
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
      };
    });
  }, [teleprompterText]);

  // Drag and drop reordering handler
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    setTracks((prev) => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, draggedItem);
      return updated;
    });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 1. Initialize or get AudioContext lazily
  const getAudioContext = (): AudioContext => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtxClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // 2. Handle script scrolling and word highlighting (Teleprompter)
  useEffect(() => {
    let intervalId: number | null = null;
    if (isScrolling && teleprompterMode) {
      // Milliseconds per word based on selected speed (optimized: slow is faster, normal is slower)
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
      const activeWordElem = document.getElementById(`word-${activeWordIndex}`);
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

  // Handle Recording Timer and microphone level visualization
  useEffect(() => {
    if (isRecording) {
      recordIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000) as unknown as number;
    } else {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
      setRecordingSeconds(0);
    }

    return () => {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Clean up canvas animations and audio elements on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clean up object URLs to avoid memory leaks
      tracks.forEach((t) => URL.revokeObjectURL(t.audioUrl));
      if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    };
  }, []);

  // Keep aiTargetType in sync with scriptMode
  useEffect(() => {
    setAiTargetType(scriptMode);
  }, [scriptMode]);

  // Keep aiOutputFormat in sync with aiTargetType
  useEffect(() => {
    if (aiTargetType === 'text') {
      setAiOutputFormat("תסריט מלא");
    } else {
      setAiOutputFormat("כרטיסיות שיחה דינמיות - Talking Points");
    }
  }, [aiTargetType]);

  // Format seconds to MM:SS
  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(mins)}:${pad(remainingSecs)}`;
  };

  // Live microphone level drawing
  const drawMicLevel = () => {
    const canvas = micCanvasRef.current;
    const analyser = micAnalyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create a gradient style for the level indicator
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#10b981'); // Emerald 500
      gradient.addColorStop(0.5, '#3b82f6'); // Blue 500
      gradient.addColorStop(1, '#6366f1'); // Indigo 500

      ctx.fillStyle = '#f1f5f9'; // background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw active waveform bars
      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 1.2;

        ctx.fillStyle = gradient;
        // Center-align the bars vertically
        const y = (canvas.height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  // 3. Start Recording
  const startRecording = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;

      const audioCtx = getAudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // smaller size for snappy level bar
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        try {
          // Decode Blob to AudioBuffer for Web Audio API trimming
          const decodedBuffer = await decodeFileToBuffer(audioBlob);
          const duration = decodedBuffer.duration;

          const newTrack: PodcastTrack = {
            id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: `הקלטה מהמיקרופון - טייק ${tracks.filter((t) => t.name.includes('הקלטה')).length + 1}`,
            blob: audioBlob,
            audioUrl: URL.createObjectURL(audioBlob),
            audioBuffer: decodedBuffer,
            duration: duration,
            trimStart: 0,
            trimEnd: duration,
            volume: 1.0,
          };

          setTracks((prev) => [...prev, newTrack]);
          setSuccessMsg('ההקלטה נשמרה בהצלחה והתווספה לרשימת הרצועות!');
        } catch (err: any) {
          console.error(err);
          setErrorMsg('שגיאה בפענוח נתוני השמע שהוקלטו.');
        }

        // Clean up recording stream
        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach((track) => track.stop());
          recordingStreamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Trigger canvas drawing animation next tick
      setTimeout(() => {
        drawMicLevel();
      }, 50);

    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('גישת המיקרופון נחסמה. אנא אפשר/י גישה למיקרופון בהגדרות הדפדפן כדי להקליט.');
      } else {
        setErrorMsg('לא ניתן לגשת למיקרופון. ודא/י שהוא מחובר כראוי.');
      }
    }
  };

  // 4. Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  // Helper: Decode File/Blob to AudioBuffer using lazy AudioContext
  async function decodeFileToBuffer(fileOrBlob: File | Blob): Promise<AudioBuffer> {
    const audioCtx = getAudioContext();
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    return new Promise((resolve, reject) => {
      audioCtx.decodeAudioData(
        arrayBuffer,
        (decoded) => resolve(decoded),
        (err) => {
          console.error('Error decoding audio data:', err);
          reject(err);
        }
      );
    });
  }

  // 5. Handle File Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const newUploadedTracks: PodcastTrack[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      try {
        const decodedBuffer = await decodeFileToBuffer(file);
        const duration = decodedBuffer.duration;

        const newTrack: PodcastTrack = {
          id: `track-${Date.now()}-${i}`,
          name: file.name.replace(/\.[^/.]+$/, ""), // strip extension for cleaner display name
          blob: file,
          audioUrl: URL.createObjectURL(file),
          audioBuffer: decodedBuffer,
          duration: duration,
          trimStart: 0,
          trimEnd: duration,
          volume: 1.0,
        };

        newUploadedTracks.push(newTrack);
      } catch (err) {
        console.error(err);
        setErrorMsg(`לא ניתן היה לפענח את הקובץ: "${file.name}". אנא ודא/י שזהו קובץ שמע תקין מסוג MP3, WAV או M4A.`);
      }
    }

    if (newUploadedTracks.length > 0) {
      setTracks((prev) => [...prev, ...newUploadedTracks]);
      setSuccessMsg(`הועלו בהצלחה ${newUploadedTracks.length} קבצי קול!`);
    }

    setIsUploading(false);
    // Clear input
    event.target.value = '';
  };

  // 6. Delete Track
  const handleDeleteTrack = (id: string) => {
    setTracks((prev) => {
      const toDelete = prev.find((t) => t.id === id);
      if (toDelete) {
        URL.revokeObjectURL(toDelete.audioUrl);
      }
      return prev.filter((t) => t.id !== id);
    });

    if (playingTrackId === id) {
      stopIndividualTrack();
    }
  };

  // 7. Reorder Tracks (Move Up / Down)
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setTracks((prev) => {
      const newTracks = [...prev];
      const temp = newTracks[index];
      newTracks[index] = newTracks[index - 1];
      newTracks[index - 1] = temp;
      return newTracks;
    });
  };

  const handleMoveDown = (index: number) => {
    setTracks((prev) => {
      if (index === prev.length - 1) return prev;
      const newTracks = [...prev];
      const temp = newTracks[index];
      newTracks[index] = newTracks[index + 1];
      newTracks[index + 1] = temp;
      return newTracks;
    });
  };

  // 8. Update individual track fields (name, trimStart, trimEnd, volume)
  const updateTrackField = (id: string, field: keyof PodcastTrack, value: any) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id === id) {
          const updated = { ...track, [field]: value };
          // Validate range slider bounds
          if (field === 'trimStart') {
            updated.trimStart = Math.max(0, Math.min(Number(value), track.trimEnd - 0.1));
          }
          if (field === 'trimEnd') {
            updated.trimEnd = Math.max(track.trimStart + 0.1, Math.min(Number(value), track.duration));
          }
          return updated;
        }
        return track;
      })
    );
  };

  const updateTrackTrim = (id: string, start: number, end: number) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id === id) {
          return {
            ...track,
            trimStart: Math.max(0, Math.min(start, track.duration - 0.1)),
            trimEnd: Math.max(start + 0.1, Math.min(end, track.duration))
          };
        }
        return track;
      })
    );
  };

  // 9. Previewing specific trimmed audio segment
  const playIndividualTrackSegment = (track: PodcastTrack) => {
    getAudioContext(); // user activation

    // If already playing this track, stop it
    if (playingTrackId === track.id) {
      stopIndividualTrack();
      return;
    }

    // Stop any other playing track
    stopIndividualTrack();

    // Create an HTML5 Audio object or seek to the start time
    const audio = new Audio(track.audioUrl);
    audio.currentTime = track.trimStart;
    audio.volume = track.volume;
    
    // Play the segment and schedule a pause when it reaches trimEnd
    audio.play()
      .then(() => {
        setPlayingTrackId(track.id);
        audioElementsRef.current[track.id] = audio;

        // Listen to timeupdate to check if we went past trimEnd
        const checkTime = () => {
          if (audio.currentTime >= track.trimEnd) {
            audio.pause();
            stopIndividualTrack();
          } else {
            // Keep checking
            if (playingTrackId === track.id || audioElementsRef.current[track.id] === audio) {
              requestAnimationFrame(checkTime);
            }
          }
        };
        requestAnimationFrame(checkTime);

        audio.onended = () => {
          stopIndividualTrack();
        };
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('שגיאה בניסיון להשמיע את הקטע.');
      });
  };

  const stopIndividualTrack = () => {
    if (playingTrackId && audioElementsRef.current[playingTrackId]) {
      audioElementsRef.current[playingTrackId].pause();
      delete audioElementsRef.current[playingTrackId];
    }
    setPlayingTrackId(null);
  };

  // 10. Web Audio API Merging and WAV Compilation
  const mergePodcastTracks = async () => {
    if (tracks.length === 0) {
      setErrorMsg('אנא הוסף/י לפחות רצועת שמע אחת לפני המיזוג.');
      return;
    }

    setIsMerging(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Stop any playing previews
    stopIndividualTrack();
    if (isMergedPlayerPlaying && mergedAudioRef.current) {
      mergedAudioRef.current.pause();
      setIsMergedPlayerPlaying(false);
    }

    try {
      const audioCtx = getAudioContext();

      // Filter valid tracks and calculate duration
      const tracksToMerge = tracks.map((track) => {
        const trimDuration = track.trimEnd - track.trimStart;
        return {
          ...track,
          trimDuration: Math.max(0, trimDuration)
        };
      }).filter(t => t.trimDuration > 0);

      if (tracksToMerge.length === 0) {
        throw new Error('אורך כל הרצועות שנבחרו למיזוג הוא 0 שניות.');
      }

      const totalSeconds = tracksToMerge.reduce((sum, t) => sum + t.trimDuration, 0);
      
      // Use standard sample rate (e.g. 44100 Hz)
      const sampleRate = 44100;
      const channels = 2; // Stereo output
      
      // Create output audio buffer
      const mergedBuffer = audioCtx.createBuffer(
        channels,
        Math.ceil(totalSeconds * sampleRate),
        sampleRate
      );

      // Iterate over both left & right channels to write sample data
      for (let channelIndex = 0; channelIndex < channels; channelIndex++) {
        const targetData = mergedBuffer.getChannelData(channelIndex);
        let writeOffset = 0;

        for (const track of tracksToMerge) {
          const buffer = track.audioBuffer;
          const trackChannels = buffer.numberOfChannels;
          
          // Fallback if track has fewer channels than target (e.g. Mono -> Stereo)
          const sourceChannelIndex = channelIndex < trackChannels ? channelIndex : 0;
          const sourceData = buffer.getChannelData(sourceChannelIndex);

          // Calculate start and end samples for the trim range
          const startSample = Math.floor(track.trimStart * buffer.sampleRate);
          const endSample = Math.floor(track.trimEnd * buffer.sampleRate);
          const sampleCount = endSample - startSample;

          // Perform sample-rate conversion if needed (or simple linear resampling fallback)
          // Since we assume simple playback, we can copy direct if sample rates match,
          // or scale the indexing if buffer.sampleRate !== sampleRate
          const rateRatio = buffer.sampleRate / sampleRate;

          for (let i = 0; i < Math.ceil(track.trimDuration * sampleRate); i++) {
            const targetSamplePos = writeOffset + i;
            if (targetSamplePos >= targetData.length) break;

            // Interpolate source index based on sample rates
            const sourceSamplePos = startSample + Math.floor(i * rateRatio);
            if (sourceSamplePos < sourceData.length) {
              // Apply individual track volume adjustment
              targetData[targetSamplePos] = sourceData[sourceSamplePos] * track.volume;
            } else {
              targetData[targetSamplePos] = 0;
            }
          }

          writeOffset += Math.ceil(track.trimDuration * sampleRate);
        }
      }

      // Encode the finished AudioBuffer into a WAV blob client-side
      const pcmWavBlob = bufferToWav(mergedBuffer);
      
      if (mergedUrl) {
        URL.revokeObjectURL(mergedUrl);
      }

      const downloadableUrl = URL.createObjectURL(pcmWavBlob);
      setMergedBlob(pcmWavBlob);
      setMergedUrl(downloadableUrl);
      setMergedDuration(totalSeconds);
      setHasUnmergedChanges(false);
      setSuccessMsg('🏆 ההסכת חובר ומוזג בהצלחה! השתמש/י בנגן למטה כדי להאזין או לחץ/י על כפתור ההורדה.');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'אירעה שגיאה בלתי צפויה במהלך חיבור ומיזוג הרצועות.');
    } finally {
      setIsMerging(false);
    }
  };

  // Native WAV encoder implementation
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // 1 = Raw Uncompressed Linear PCM
    const bitDepth = 16;
    
    let result;
    if (numOfChan === 2) {
      result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
      result = buffer.getChannelData(0);
    }
    
    const bufferLength = result.length * 2; // 16-bit is 2 bytes per sample
    const arrayBuffer = new ArrayBuffer(44 + bufferLength);
    const view = new DataView(arrayBuffer);
    
    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + bufferLength, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numOfChan, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numOfChan * (bitDepth / 8), true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* chunk length */
    view.setUint32(40, bufferLength, true);
    
    // Write the PCM audio samples
    floatTo16BitPCM(view, 44, result);
    
    return new Blob([view], { type: 'audio/wav' });
  };

  const interleave = (inputL: Float32Array, inputR: Float32Array): Float32Array => {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;
    
    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  };

  const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Global merged audio preview toggle
  const toggleMergedAudio = () => {
    if (!mergedUrl) return;

    if (!mergedAudioRef.current || mergedAudioRef.current.src !== mergedUrl) {
      if (mergedAudioRef.current) {
        mergedAudioRef.current.pause();
      }
      mergedAudioRef.current = new Audio(mergedUrl);
      mergedAudioRef.current.onended = () => {
        setIsMergedPlayerPlaying(false);
      };
    }

    if (isMergedPlayerPlaying) {
      mergedAudioRef.current.pause();
      setIsMergedPlayerPlaying(false);
    } else {
      getAudioContext(); // resume
      mergedAudioRef.current.play()
        .then(() => {
          setIsMergedPlayerPlaying(true);
        })
        .catch((err) => {
          console.error(err);
          setErrorMsg('שגיאה בניסיון להשמיע את ההסכת הממוזג.');
        });
    }
  };

  // Helper to format speaker and general instructions for PDF output
  const formatInstructionsHTML = (text: string): string => {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    // parentheticals (speaker instructions)
    escaped = escaped.replace(/(\([^)]+\))/g, '<span class="speaker-instruction">$1</span>');
    // brackets (general instructions / staging)
    escaped = escaped.replace(/(\[[^\]]+\])/g, '<span class="general-instruction">$1</span>');
    return escaped;
  };

  // Export script and cards to a beautiful, printable PDF
  const handleExportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('אנא מאפשר/י פעולת פופ-אפ בדפדפן על מנת לייצא את הקובץ ל-PDF.');
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
          <div class="card-box">
            <span class="card-header-badge">${typeLabel} #${idx + 1}</span>
            <p class="card-body-text">${formatInstructionsHTML(card.text)}</p>
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
            const time = dialogueMatch[1] ? `<span style="color: #4b5563; font-family: monospace; font-size: 13px; margin-left: 8px; background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${dialogueMatch[1]}</span>` : '';
            const speaker = `<strong style="color: #000000; font-size: 15px; border-bottom: 2px solid #000000; padding-bottom: 1px;">${dialogueMatch[2]}:</strong>`;
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
          <div class="section-title">✍️ תסריט מלא (טקסט חופשי)</div>
          <div style="background-color: #ffffff; border: 1.5px solid #000000; border-radius: 8px; padding: 20px; margin-bottom: 20px; color: #000000;">
            ${formattedTextHTML}
          </div>
        </div>
      `;
    }

    if (hasCards) {
      contentHTML += `
        <div>
          <div class="section-title">📋 כרטיסיות דיון ונקודות לניווט</div>
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
        ${podcastName ? `<div><strong style="color: #000000; font-size: 12px; display: block; margin-bottom: 4px;">שם ההסכת:</strong><span style="font-size: 14px; font-weight: 700; color: #000000;">${podcastName}</span></div>` : '<div></div>'}
        ${participants ? `<div><strong style="color: #000000; font-size: 12px; display: block; margin-bottom: 4px;">משתתפים:</strong><span style="font-size: 14px; font-weight: 700; color: #000000;">${participants}</span></div>` : '<div></div>'}
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
          
          /* Reset margins for printing to prevent extra blank pages */
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
          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #000000;
            border-bottom: 2px solid #000000;
            padding-bottom: 4px;
            margin-top: 10px;
            margin-bottom: 15px;
            display: inline-block;
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
          
          /* Card printing styles as requested */
          .card-box {
            background-color: #ffffff !important;
            border: 2px solid #000000 !important;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            page-break-inside: avoid;
            direction: rtl;
            text-align: right;
            color: #000000 !important;
          }

          .card-header-badge {
            font-weight: 800;
            font-size: 13px;
            color: #000000 !important;
            border-bottom: 1.5px solid #000000;
            padding-bottom: 5px;
            margin-bottom: 8px;
            display: block;
          }

          .card-body-text {
            font-size: 14px;
            line-height: 1.6;
            color: #000000 !important;
            margin: 0;
            white-space: pre-wrap;
            font-weight: 500;
          }

          /* Styling of speaker and general instructions inside the PDF */
          .speaker-instruction {
            color: #b45309 !important; /* amber-700 */
            background-color: #fef3c7 !important; /* amber-100 */
            font-style: italic;
            font-size: 13px;
            padding: 1px 4px;
            border-radius: 4px;
            margin: 0 2px;
            display: inline-block;
          }
          .general-instruction {
            color: #3730a3 !important; /* indigo-800 */
            background-color: #e0e7ff !important; /* indigo-100 */
            font-style: italic;
            font-size: 12px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px dashed #c7d2fe;
            margin: 0 2px;
            display: inline-block;
          }

          @media print {
            body {
              padding: 0;
              margin: 0;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            /* Avoid breaking section headers */
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

  // Reset all podcast tracks
  const handleClearProject = () => {
    if (confirm('האם את/ה בטוח/ה שברצונך למחוק את כל הרצועות ולהתחיל פרויקט חדש?')) {
      tracks.forEach((t) => URL.revokeObjectURL(t.audioUrl));
      setTracks([]);
      stopIndividualTrack();
      if (mergedUrl) {
        URL.revokeObjectURL(mergedUrl);
        setMergedUrl(null);
        setMergedBlob(null);
        setMergedDuration(0);
      }
      setIsMergedPlayerPlaying(false);
      if (mergedAudioRef.current) {
        mergedAudioRef.current.pause();
        mergedAudioRef.current = null;
      }
      setSuccessMsg('הפרויקט אופס בהצלחה.');
    }
  };

  // Card swipe gesture handlers
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [mouseStartX, setMouseStartX] = useState<number | null>(null);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      if (activeCardIndex < scriptCards.length - 1) {
        setActiveCardIndex(prev => prev + 1);
      }
    } else if (isRightSwipe) {
      if (activeCardIndex > 0) {
        setActiveCardIndex(prev => prev - 1);
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseStartX(e.clientX);
    setIsMouseDown(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || mouseStartX === null) return;
    const currentX = e.clientX;
    const distance = mouseStartX - currentX;
    if (Math.abs(distance) > 50) {
      if (distance > 50) {
        if (activeCardIndex < scriptCards.length - 1) {
          setActiveCardIndex(prev => prev + 1);
        }
      } else {
        if (activeCardIndex > 0) {
          setActiveCardIndex(prev => prev - 1);
        }
      }
      setIsMouseDown(false);
      setMouseStartX(null);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    setMouseStartX(null);
  };

  return (
    <div className={`min-h-screen flex flex-col selection:bg-zinc-500/30 transition-colors duration-300 ${
      isDarkMode ? 'bg-[#1a1a24] text-zinc-100' : 'bg-[#f4f4f8] text-zinc-900'
    }`}>
      
      {/* Privacy and Storage Consent Modal */}
      <AnimatePresence>
        {showConsentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`relative max-w-lg w-full rounded-2xl p-6 md:p-8 shadow-2xl border text-right ${
                isDarkMode 
                  ? 'bg-[#1e1e24] text-zinc-100 border-zinc-800' 
                  : 'bg-white text-zinc-800 border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500">
                  <Info className="w-6 h-6" />
                </div>
                <div>
                  <h2 className={`text-xl md:text-2xl font-black ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    שמירת עבודה והגנה על הפרטיות
                  </h2>
                  <p className="text-xs opacity-70">
                    MTEACH Podcast Studio
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-sm md:text-base leading-relaxed opacity-90">
                <p>
                  האתר משתמש באחסון המקומי של הדפדפן (Local Storage ו-IndexedDB) כדי לשמור באופן אוטומטי את ההקלטות שלכם, כרטיסיות השיחה, והטקסט שכתבתם.
                </p>
                <p className="font-bold text-[#ffcc00]">
                  כך, גם אם תצאו בטעות מהאתר או תרעננו את הדף, כל העבודה שלכם תישמר ותוכלו להמשיך בדיוק מאותה נקודה.
                </p>
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#252530] border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'}`}>
                  <p className="font-bold flex items-center gap-2 mb-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                    המידע שלכם נשאר אצלכם במכשיר:
                  </p>
                  <p className="text-xs md:text-sm">
                    כל קבצי השמע והטקסטים נשמרים <strong>אך ורק מקומית במכשיר האישי שלכם</strong>. אין שום העלאה של חומרי ההקלטה לשרתים חיצוניים, והפרטיות שלכם מוגנת ב-100%.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setConsentStatus(true);
                    setShowConsentModal(false);
                    loadSavedData();
                  }}
                  className="w-full bg-[#ffcc00] text-[#1a1a24] font-bold py-3.5 px-6 rounded-xl hover:bg-[#ffe066] transition-all duration-200 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  <span>אני מאשר/ת ומבין/ה – בואו נתחיל!</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Top Banner / Navigation */}
      <header className={`flex-none flex flex-col justify-center px-8 sticky top-0 z-50 bg-[#252530]/95 border-b border-zinc-800/40 backdrop-blur-md py-4 gap-3 transition-all duration-300 ease-in-out ${
        showHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      }`}>
        
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#2d2d37] text-zinc-100">
              <Mic className="w-6 h-6 text-[#ffcc00]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-zinc-100">
                הסכת בכיתה
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs uppercase tracking-widest text-zinc-500">תאריך פרויקט</span>
              <span className="font-bold text-sm text-zinc-300">{new Date().toLocaleDateString('he-IL')}</span>
            </div>
          </div>
        </div>

        {/* Second Row for Podcast Name and Participants */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/40">
          <div className="flex items-center gap-2.5 bg-[#1c1c22]/50 px-3.5 py-1.5 rounded-xl border border-zinc-700/30">
            <span className="text-xs font-bold text-zinc-400 shrink-0">שם ההסכת:</span>
            <input
              type="text"
              value={podcastName}
              onChange={(e) => setPodcastName(e.target.value)}
              placeholder="למשל: סודות הלמידה הדיגיטלית..."
              className="w-full bg-transparent text-zinc-100 text-xs sm:text-sm focus:outline-none placeholder-zinc-600"
            />
          </div>
          <div className="flex items-center gap-2.5 bg-[#1c1c22]/50 px-3.5 py-1.5 rounded-xl border border-zinc-700/30">
            <span className="text-xs font-bold text-zinc-400 shrink-0">משתתפים:</span>
            <input
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="למשל: פרופ' כהן, ד''ר לוי..."
              className="w-full bg-transparent text-zinc-100 text-xs sm:text-sm focus:outline-none placeholder-zinc-600"
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SIDEBAR: Recording & Uploading */}
        <section 
          id="recording-sidebar" 
          className={`lg:col-span-4 lg:sticky self-start flex flex-col gap-4 z-40 transition-all duration-300
            ${showHeader ? 'lg:top-[165px] max-lg:top-[140px]' : 'lg:top-4 max-lg:top-0'}
            max-lg:sticky max-lg:left-0 max-lg:right-0 max-lg:bg-[#202028]/95 max-lg:backdrop-blur-lg max-lg:border-b max-lg:border-zinc-800/80 max-lg:shadow-xl max-lg:rounded-b-3xl max-lg:p-4 max-lg:-mx-4 max-lg:px-4 max-lg:mb-2
            ${isSidebarExpandedMobile ? 'max-lg:max-h-[85vh] max-lg:overflow-y-auto' : 'max-lg:h-[72px] max-lg:overflow-hidden'}`}
        >
          <div className="rounded-2xl p-0 lg:p-4 flex flex-col gap-4 transition-all duration-300 bg-transparent lg:bg-[#2d2d37]/45 border-0 lg:border lg:border-zinc-700/30">
            
            {/* Header / Mobile Toggle Button */}
            <div 
              onClick={() => setIsSidebarExpandedMobile(!isSidebarExpandedMobile)}
              className="flex items-center justify-between cursor-pointer lg:pointer-events-none pb-2 lg:pb-0 border-b border-zinc-800/60 lg:border-none"
            >
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 text-zinc-300 lg:text-zinc-500">
                <span className="relative flex h-3 w-3 lg:hidden">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isRecording ? 'bg-red-400' : 'bg-[#ffcc00]'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isRecording ? 'bg-red-500' : 'bg-[#ffcc00]'}`}></span>
                </span>
                <Sliders className="w-4 h-4 text-zinc-500 hidden lg:block" />
                <span className="hidden lg:inline">הוספת רצועות קול (הקלטה/העלאה)</span>
                <span className="lg:hidden">הוספת רצועת קול</span>
                {isRecording && (
                  <span className="text-xs font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded animate-pulse mr-2 hidden lg:inline">
                    {formatTime(recordingSeconds)}
                  </span>
                )}
              </h2>
              
              <div className="lg:hidden flex items-center gap-2.5">
                {/* Quick Record/Stop button accessible when collapsed */}
                {isRecording ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stopRecording();
                    }}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-[11px] font-black px-3 py-1.5 rounded-xl transition-all shadow-md animate-pulse cursor-pointer"
                  >
                    <Square className="w-2 h-2 fill-white text-white" />
                    <span>עצור ({formatTime(recordingSeconds)})</span>
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRecording();
                    }}
                    className="flex items-center gap-1 bg-[#2d2d3c] hover:bg-[#3d3d4e] active:scale-95 text-red-500 border border-red-500/25 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5 text-red-500" />
                    <span>הקלטה 🔴</span>
                  </button>
                )}

                <div className="flex items-center gap-1.5 text-zinc-400 hover:text-white">
                  <span className="text-[11px] font-black bg-[#31313f] px-2 py-1.5 rounded-xl border border-zinc-700/50">
                    {isSidebarExpandedMobile ? 'מזער' : 'פתח'}
                  </span>
                  {isSidebarExpandedMobile ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#ffcc00]" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-[#ffcc00]" />
                  )}
                </div>
              </div>
            </div>

            <div className={`flex flex-col gap-4 ${isSidebarExpandedMobile ? 'flex' : 'max-lg:hidden lg:flex'}`}>
              {/* Record Block */}
              <div className={`p-4 rounded-xl transition-all border ${
                isRecording 
                  ? 'bg-red-950/20 border-red-800/40 shadow-lg shadow-red-500/5' 
                  : 'bg-[#373743]/60 border-[#434351]/50'
              }`}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-zinc-500'}`} />
                    הקלטה ישירה מהדפדפן
                  </span>
                  {isRecording && (
                    <span className="text-xs font-bold text-red-400 bg-red-950/40 px-2 py-0.5 rounded animate-pulse">
                      {formatTime(recordingSeconds)}
                    </span>
                  )}
                </div>

                {isRecording ? (
                  <div className="flex flex-col gap-3">
                    <canvas
                      ref={micCanvasRef}
                      className="w-full h-11 bg-[#2d2d37] rounded-xl overflow-hidden"
                      width={300}
                      height={44}
                    />
                    <button
                      onClick={stopRecording}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <Square className="w-3 h-3 fill-white" />
                      עצור והוסף לפרויקט
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startRecording}
                    className="w-full py-3.5 px-3 active:scale-[0.98] font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer text-xs bg-[#3d3d4b] hover:bg-[#474758] text-white"
                  >
                    <Mic className="w-5 h-5 mb-0.5 text-red-600" />
                    <span className="font-extrabold text-[13px]">התחל הקלטה חדשה</span>
                    <span className="text-[10px] font-normal opacity-80 text-zinc-300">לחץ כדי להקליט באמצעות המיקרופון</span>
                  </button>
                )}
              </div>

              {/* Upload Block */}
              <div className="p-4 rounded-xl flex flex-col justify-between border bg-[#373743]/60 border-[#434351]/50">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block mb-1">
                    העלאת קבצים קיימים
                  </span>
                  <p className="text-[10px] mb-3 leading-normal text-zinc-400">
                    תמיכה ב-MP3, WAV ו-M4A. הקובץ יפוענח מיידית.
                  </p>
                </div>

                <label className={`w-full py-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  isUploading
                    ? 'border-zinc-500 bg-[#2d2d37]/60'
                    : 'border-zinc-700 hover:border-zinc-500 bg-[#2d2d37]/30 hover:bg-[#2d2d37]/60'
                }`}>
                  <input
                    type="file"
                    accept="audio/*"
                    multiple
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className={`w-4 h-4 ${isUploading ? 'text-zinc-400 animate-bounce' : 'text-zinc-400'}`} />
                  <span className="text-[11px] font-bold">
                    {isUploading ? 'מפענח קובץ קול...' : 'גרור קובץ או לחץ לבחירה'}
                  </span>
                  <span className="text-[9px] text-zinc-500">ניתן להעלות מספר קבצים ביחד</span>
                </label>
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-950/40 border border-red-800 text-red-300 p-3 rounded-xl text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 p-3 rounded-xl text-xs flex items-start gap-2"
              >
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* CENTRAL / MAIN PANEL - taking 8 cols on desktop */}
        <section id="central-workspace" className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Segmented control for switching views */}
          <div className={`rounded-2xl p-1.5 flex gap-2 w-full transition-all border sticky z-30 shadow-lg bg-[#252530]/95 backdrop-blur-md border-zinc-700/40 shadow-black/30 duration-300 ${showHeader ? 'top-[165px]' : 'top-4'}`}>
            <button
              onClick={() => setMainTab('text')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all duration-250 cursor-pointer ${
                mainTab === 'text'
                  ? 'bg-[#ffcc00] text-zinc-950 shadow-lg shadow-[#ffcc00]/25 ring-1 ring-[#ffcc00]/35'
                  : 'text-zinc-400 hover:text-[#ffcc00] hover:bg-[#373748]/50'
              }`}
            >
              <FileText className={`w-4 h-4 sm:w-5 sm:h-5 ${mainTab === 'text' ? 'text-zinc-950' : 'text-[#ffcc00]'}`} />
              <span className="tracking-wide">עבודה עם הטקסט (תסריט וכרטיסיות)</span>
            </button>
            <button
              onClick={() => setMainTab('tracks')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all duration-250 cursor-pointer ${
                mainTab === 'tracks'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/20 ring-1 ring-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#373748]/50'
              }`}
            >
              <FileAudio className={`w-4 h-4 sm:w-5 sm:h-5 ${mainTab === 'tracks' ? 'text-white' : 'text-emerald-500'}`} />
              <span className="tracking-wide">רשימת הרצועות והעריכה ({tracks.length})</span>
            </button>
          </div>

          {mainTab === 'text' && (
            <div id="script-panel" className="flex flex-col gap-5 rounded-2xl p-6 transition-colors duration-300 w-full bg-[#2d2d37]/45 shadow-xl border border-zinc-700/20">
              
              <div className="flex items-center justify-between pb-3 border-b border-zinc-700/10">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-zinc-400" />
                  <h2 className="text-base font-bold uppercase tracking-wider text-zinc-300">
                    תסריט ונקודות לדיון
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTeleprompterMode(!teleprompterMode);
                      if (!teleprompterMode) {
                        setActiveCardIndex(0); // Reset to first card when entering Reading Mode
                      }
                    }}
                    className={`text-xs sm:text-sm px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      teleprompterMode
                        ? 'bg-[#ffcc00] text-zinc-950 shadow-sm'
                        : 'bg-[#373743] hover:bg-[#434351] text-zinc-300'
                    }`}
                  >
                    {scriptMode === 'cards' ? (
                      teleprompterMode ? (
                        <>
                          <span>מצב עריכה</span>
                        </>
                      ) : (
                        <>
                          <Book className="w-4 h-4 text-white shrink-0" />
                          <span>מצב קריאה</span>
                        </>
                      )
                    ) : (
                      teleprompterMode ? 'מצב עריכה' : 'מצב טלפרומפטר 🚀'
                    )}
                  </button>
                </div>
              </div>

              {!teleprompterMode ? (
                /* EDIT MODE */
                <div className="flex flex-col gap-5 flex-1">
                  
                  {/* Script Mode & Examples Row */}
                  <div className="flex flex-col gap-4 border-b border-zinc-700/10 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-zinc-300">סגנון עריכה:</span>
                      <div className="flex rounded-xl p-1 gap-1 bg-[#1c1c22]">
                        <button
                          onClick={() => setScriptMode('text')}
                          className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            scriptMode === 'text'
                              ? 'bg-[#373743] text-white shadow'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          טקסט חופשי
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
                    </div>

                    {/* Compact Examples Selector */}
                    <div className="relative">
                      {!showExamples ? (
                        <button
                          onClick={() => setShowExamples(true)}
                          className="py-1.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#2d2d37] hover:bg-[#373743] text-zinc-300 hover:text-white border border-zinc-700/50 shadow-md transition-all cursor-pointer flex items-center justify-center"
                        >
                          <span>דוגמאות</span>
                        </button>
                      ) : (
                        <div className="absolute left-0 right-auto top-full mt-2 z-50 w-72 bg-[#2d2d37] p-3.5 rounded-xl border border-zinc-700/50 shadow-2xl shadow-black/85">
                          <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-zinc-700/25">
                            <label className="text-xs font-bold text-zinc-300">
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

                  {scriptMode === 'text' ? (
                    <>
                      {/* Text editor with thin border to distinguish it */}
                      <div className="flex-1 flex flex-col min-h-[300px]">
                        <label className="text-sm mb-2 flex items-center justify-between font-bold">
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
                      placeholder="הדבק/י כאן נקודות לדיון, שאלות לראיון, או טקסט מלא להקראה..."
                      className={`w-full flex-1 rounded-xl p-4 text-base focus:outline-none transition-all leading-relaxed resize-none font-sans border ${
                        isDarkMode 
                          ? 'bg-[#2d2d37] text-zinc-200 border-zinc-700/60 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-700' 
                          : 'bg-zinc-100 text-zinc-800 border-zinc-300 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300'
                      }`}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* AI Prompt Generator Scaffolding Assistant (SMBK Pod AI Assistant) */}
                  <div className={`rounded-2xl border p-4.5 mb-5 transition-all duration-300 ${
                    isAiAssistantOpen
                      ? (isDarkMode ? 'bg-[#1c1c22] border-indigo-500/40 shadow-lg shadow-indigo-950/20' : 'bg-indigo-50/50 border-indigo-200 shadow-md')
                      : (isDarkMode ? 'bg-[#2a2a33]/45 border-zinc-700/40 hover:border-zinc-600/60' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/80')
                  }`}>
                    <button
                      onClick={() => setIsAiAssistantOpen(!isAiAssistantOpen)}
                      className="w-full flex items-center justify-between font-bold text-xs sm:text-sm text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 animate-pulse" />
                        <span className={isDarkMode ? 'text-zinc-100 font-sans' : 'text-zinc-800 font-sans'}>
                          סייע כתיבת כרטיסיות דיון
                        </span>
                        <span className="text-[9px] font-black tracking-wide px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                          חדש!
                        </span>
                      </div>
                      {isAiAssistantOpen ? <ChevronUp className="w-4.5 h-4.5 text-zinc-400" /> : <ChevronDown className="w-4.5 h-4.5 text-zinc-400" />}
                    </button>

                    {isAiAssistantOpen && (
                      <div className="mt-4 pt-4 border-t border-zinc-700/20 flex flex-col gap-4 text-xs sm:text-sm">
                        <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          השתמשו בכלי זה כפיגום דיגיטלי (Scaffolding) כדי לתרגם את החומר העיוני שלכם למתווה שיח מוכן להקלטה. 
                          מלאו את השדות שלהלן, לחצו על כפתור ההפקה והמערכת תעתיק את הפרומפט המתוחכם עבורכם ותפתח את Gemini בדפדפן!
                        </p>

                        {/* Step A - Raw Notes Input */}
                        <div className="flex flex-col gap-1.5">
                          <label className={`font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            שלב א׳ – הזנת הקלט הגולמי (נקודות מפתח, סיכומי שיעור או עוגני תוכן):
                          </label>
                          <textarea
                            value={aiStudentNotes}
                            onChange={(e) => setAiStudentNotes(e.target.value)}
                            placeholder="למשל: עקרונות הערכה חלופית, הבדל בין הערכה מסכמת לעיצוב, אתגרי המורה בכיתה הטרוגנית, חשיבות משוב איכותני מעמיק..."
                            className={`w-full min-h-[90px] rounded-xl p-3 text-xs sm:text-sm focus:outline-none transition-all leading-relaxed resize-none font-sans border ${
                              isDarkMode
                                ? 'bg-[#2d2d37] text-zinc-200 border-zinc-700 focus:border-indigo-500'
                                : 'bg-white text-zinc-800 border-zinc-300 focus:border-indigo-400'
                            }`}
                          />
                        </div>

                        {/* Step B - Dialogic Architecture Parameters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          
                          {/* Structure */}
                          <div className="flex flex-col gap-1.5">
                            <label className={`font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                              מבנה השיחה:
                            </label>
                            <select
                              value={aiStructure}
                              onChange={(e) => setAiStructure(e.target.value)}
                              className={`rounded-xl p-2.5 font-bold cursor-pointer border ${
                                isDarkMode ? 'bg-[#2d2d37] text-zinc-200 border-zinc-700' : 'bg-white text-zinc-800 border-zinc-300'
                              }`}
                            >
                              <option value="שיחה בין שני אנשים">שיחה בין שני אנשים</option>
                              <option value="פאנל עמיתים">פאנל עמיתים</option>
                              <option value="ראיון">ראיון</option>
                              <option value="מנחה ומומחה">מנחה ומומחה</option>
                              <option value="משתתף יחיד">משתתף יחיד (מונולוג)</option>
                            </select>
                          </div>

                          {/* Output Presentation Format (synced with editor style above) */}
                          <div className="flex flex-col gap-1.5">
                            <label className={`font-bold flex items-center justify-between ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                              <span>אופן הצגת השיחה:</span>
                              <span className="text-[10px] font-sans font-normal opacity-75">
                                (נקבע לפי סגנון העריכה שמעל)
                              </span>
                            </label>
                            <select
                              disabled
                              value={aiOutputFormat}
                              className={`rounded-xl p-2.5 font-bold border cursor-not-allowed opacity-80 ${
                                isDarkMode ? 'bg-[#1e1e24] text-zinc-300 border-zinc-800' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                              }`}
                            >
                              <option value="תסריט מלא">תסריט מלא</option>
                              <option value="כרטיסיות שיחה דינמיות - Talking Points">כרטיסיות שיחה דינמיות (Talking Points)</option>
                            </select>
                          </div>
                          
                          {/* Duration */}
                          <div className="flex flex-col gap-1.5">
                            <label className={`font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                              זמן כולל מיועד:
                            </label>
                            <input
                              type="text"
                              value={aiDuration}
                              onChange={(e) => setAiDuration(e.target.value)}
                              placeholder="למשל: דקה אחת / 3 דקות"
                              className={`rounded-xl p-2.5 font-bold border ${
                                isDarkMode ? 'bg-[#2d2d37] text-zinc-200 border-zinc-700' : 'bg-white text-zinc-800 border-zinc-300'
                              }`}
                            />
                          </div>

                        </div>

                        {/* Step C - Dialogic & Cognitive Archetype Alignment */}
                        <div className="flex flex-col gap-2 p-3 rounded-xl border border-indigo-500/10 bg-indigo-500/5">
                          <label className={`font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>
                            <Book className="w-4 h-4 text-indigo-400" />
                            ארכיטיפ דיאלוגי / קוגניטיבי (לב המהלך הפדגוגי):
                          </label>
                          <p className={`text-[11px] leading-relaxed mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            בחרו את הפרוטוקול והמבנה הדידקטי המתאים להצפת והערכת הידע שברצונכם להציג:
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              {
                                id: 'בית מדרש',
                                title: 'בית מדרש',
                                desc: 'מציג, מקשה, מחדד, מסכם (בוחן מורכבות והקשבה עמוקה לזולת)'
                              },
                              {
                                id: 'הסבר לציבור',
                                title: 'הסבר לציבור',
                                desc: 'שאלה, הסבר מושגי פשוט, דוגמה מהחיים, והפרכת מיתוס רווח (בוחן ארגון ופישוט ידע)'
                              },
                              {
                                id: 'מקרה מבחן',
                                title: 'מקרה מבחן',
                                desc: 'סיפור אישי או אירוע מוחשי מהשטח, ולאחר מכן ניתוח פדגוגי מבוסס תיאוריה (בוחן יישום ואמפתיה)'
                              },
                              {
                                id: 'העמדה שמתפרקת',
                                title: 'העמדה שמתפרקת',
                                desc: 'פתיחה בטיעון קיצוני/שכיח, פגישת התנגדויות וסתירות, וחילוץ מסקנה ביקורתית מאוזנת (בוחן חשיבה ביקורתית)'
                              },
                              {
                                id: 'שולחן עגול',
                                title: 'שולחן עגול',
                                desc: 'ייצוג בעלי עניין שונים (תלמיד, מורה, הורה, מנהל...) סביב סוגיית ליבה מורכבת (בוחן הבנה מערכתית)'
                              }
                            ].map((arch) => (
                              <label
                                key={arch.id}
                                onClick={() => setAiArchetype(arch.id)}
                                className={`p-2 rounded-lg border transition-all cursor-pointer flex flex-col gap-0.5 text-right ${
                                  aiArchetype === arch.id
                                    ? (isDarkMode ? 'bg-indigo-950/40 border-indigo-400 text-white' : 'bg-indigo-50 border-indigo-400 text-indigo-950')
                                    : (isDarkMode ? 'bg-[#1c1c22] border-zinc-800 hover:border-zinc-700 text-zinc-300' : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700')
                                }`}
                              >
                                <div className="flex items-center gap-1.5 font-bold text-xs">
                                  <input
                                    type="radio"
                                    name="aiArchetype"
                                    checked={aiArchetype === arch.id}
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

                        {/* Action Button: Generate & Copy Prompt, then Open Gemini */}
                        <button
                          onClick={() => {
                            if (!aiStudentNotes.trim()) {
                              alert('אנא הזינו קודם כל את רשימות התוכן שלכם בשלב א׳.');
                              return;
                            }

                            const generatedPrompt = `שלום ג׳מיני. אתה מומחה להנדסת פרומפטים פדגוגיים וארכיטקטורת דיאלוגים לתחום הכשרת המורים (MTEACH).
התפקיד שלך הוא לתרגם את רשימות התוכן והרעיונות שלי למתווה שיח פדגוגי מוכן להקלטה.

להלן פרטי הפודקאסט המבוקש:
1. נקודות מפתח ותוכן עיוני (עוגני תוכן):
"${aiStudentNotes}"

2. מבנה השיחה: ${aiStructure}
3. פורמט הפלט המבוקש: ${aiOutputFormat}
4. משך זמן מיועד: ${aiDuration}
5. ארכיטיפ קוגניטיבי/דיאלוגי מוביל: ${aiArchetype}

הנחיות פדגוגיות ומבניות קשיחות שעליך ליישם בדיוק רב:
- עוגני תוכן מובלעים: ודא שכל עוגני התוכן והמושגים שציינתי ברשימות משולבים באופן טבעי לאורך הדיון.
- ללא הערות טון או הנחיות משחק: אין לכתוב בסוגריים עגולים שום הנחיה לגבי טון הדיבור, אינטונציה, הבעה או רגש של המשתתפים (למשל, אל תכתוב "(בחיוך)", "(בהפתעה)", "(בטון רפלקטיבי)"). הסטודנטים יחליטו בעצמם כיצד לגשת לשיח ולהביע את עצמם.
- ללא הערות הפקה, מעברים או מוזיקה: אין לכתוב בסוגריים מרובעים או עגולים שום הנחיות בימוי, אפקטים, מוזיקה או מעברים (למשל, אל תכתוב "[מוזיקת רקע עולה]", "[הפסקה]", "[מעבר לכרטיסייה הבאה]").

- התאמה מלאה לפורמט הפלט:
  ${aiOutputFormat === 'תסריט מלא' 
    ? `עבור "תסריט מלא": כתוב תסריט דיאלוג מלא וזורם בשפה דבורה, חמה וטבעית מנקודת המבט של הסטודנטים המקליטים (כתיבה בגוף ראשון), אך ללא שום הנחיות טון או מוזיקה בסוגריים.` 
    : `עבור "כרטיסיות שיחה דינמיות - Talking Points": חל איסור מוחלט ומלא לכתוב תסריט, דיאלוג או משפטים מוכנים מראש לקריאה (אסור לכתוב "משה: ..." או "רועי: ..."). 
    התוכן של כל כרטיסייה חייב להיות מנוסח אך ורק כנקודות מפתח (Bullet Points), מושגי ליבה, כיווני מחשבה, רעיונות ושאלות מנחות לכל משתתף שיאפשרו לסטודנטים לנהל שיח ספונטני וטבעי לחלוטין - ללא הקראת טקסט מובנה מילה במילה. זהו לב העניין של הכרטיסיות!`
  }

- מבנה הדיאלוג בהתאם לארכיטיפ הנבחר (${aiArchetype}):
  ${aiArchetype === 'בית מדרש' ? 'עליך לבנות את מהלך הדיון לפי שלבי "בית מדרש": פתיחה בהצגת הנושא/מושג, העלאת קושי או קושיה מהותית, חידוד ודיוק הסתירה, וסיכום רפלקטיבי אינטגרטיבי (לבחינת מורכבות והקשבה עמוקה).' : ''}
  ${aiArchetype === 'הסבר לציבור' ? 'עליך לבנות את מהלך הדיון לפי שלבי "הסבר לציבור": שאילת שאלה מעוררת עניין, מתן הסבר מושגי פשוט וברור, הדגמה מעשית מהחיים, והפרכת מיתוס רווח בנושא (לבחינת ארגון ופישוט ידע).' : ''}
  ${aiArchetype === 'מקרה מבחן' ? 'עליך לבנות את מהלך הדיון לפי שלבי "מקרה מבחן": פתיחה בסיפור אישי או אירוע מוחשי שהתרחש בשטח/בכיתה, ולאחר מכן ניתוח פדגוגי מעמיק מתוך החומר התיאורטי והכלים שלמדנו (לבחינת יישום מעשי ואמפתיה).' : ''}
  ${aiArchetype === 'העמדה שמתפרקת' ? 'עליך לבנות את מהלך הדיון לפי שלבי "העמדה שמתפרקת": הצגת טיעון קיצוני או עמדה מסורתית רווחת בפתיחה, מפגש עם התנגדויות וסתירות פנימיות, וחילוץ של מסקנה ביקורתית ומאוזנת (לבחינת חשיבה ביקורתית מורכבת).' : ''}
  ${aiArchetype === 'שולחן עגול' ? 'עליך לבנות את מהלך הדיון סביב סוגיית ליבה מורכבת שבה מיוצגים בעלי עניין שונים ומגוונים (למשל: תלמיד, מורה, הורה, מנהל, קובע מדיניות), כאשר כל אחד מציג את זווית ראייתו הייחודית ומתפתח ביניהם דיון דינמי (לבחינת הבנה מערכתיר רחבה).' : ''}

- פורמט מבנה פלט קשיח לפענוח אוטומטי (קריטי):
  ${aiOutputFormat === 'תסריט מלא'
    ? 'אנא החזר את התסריט המלא כפסקאות ברורות, כאשר כל פסקה מתחילה בשם הדובר ונקודתיים, למשל:\nנועם: שלום לכולם...\nמיכל: אהלן נועם...'
    : 'אנא החזר את כרטיסיות הדיון עטופות בתוויות הפרדה קשיחות של "=== כרטיסייה ===" בדיוק בפורמט הבא עבור כל כרטיסייה:\n\n=== כרטיסייה ===\nסוג: [פתיח / גוף הדיון / סיכום]\nטקסט: [נקודות שיחה מנחות (Talking Points), מושגים, עוגנים ושאלות מפתח ממוקדות לכל דובר - מנוסח אך ורק כנקודות (Bullet Points), ללא תסריט דיאלוג של מילה במילה!]\n\nאין להוסיף טקסט מקדים או מסכם מחוץ לפורמט זה כדי לא לפגוע בפענוח.'}

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
                          className="w-full mt-2 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
                        >
                          <Sparkles className="w-4 h-4 text-indigo-200" />
                          <span>{aiPromptCopied ? '✅ הפרומפט הועתק! פותח את Gemini...' : 'הפק והעתק פרומפט פדגוגי ופתח את Gemini חיצונית'}</span>
                          <ExternalLink className="w-4 h-4 text-indigo-200 animate-bounce" />
                        </button>

                         {aiPromptCopied && (
                          <p className="text-center font-bold text-emerald-500 text-xs animate-pulse mt-1">
                            הפרומפט הועתק ללוח בהצלחה! הדביקו אותו ב-Gemini שנפתח כעת בכרטיסייה חדשה.
                          </p>
                        )}

                        {/* Step B - Parser / Return Flow */}
                        <div className="border-t border-zinc-700/25 my-5 pt-5 flex flex-col gap-4">
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                            <h4 className={`font-bold text-sm ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                              שלב ב׳ – קליטת התוצר מ-Gemini (פענוח והזרקה אוטומטית)
                            </h4>
                          </div>
                          
                          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            העתיקו את התוצאה המלאה שג׳מיני ייצר, והדביקו אותה כאן או טענו קובץ טקסט. המערכת תפרק ותאכלס את התוכן שלכם אוטומטית במערכת ההקלטה!
                          </p>

                          {/* File upload action */}
                          <div className="flex flex-col gap-1.5">
                            <label className={`font-bold text-xs ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'} flex items-center justify-between`}>
                              <span>טענו קובץ טקסט (אופציונלי):</span>
                              <span className="text-[10px] font-mono opacity-60">TXT, MD, JSON</span>
                            </label>
                            <input
                              type="file"
                              id="file-upload-parser"
                              accept=".txt,.md,.json"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const text = event.target?.result;
                                  if (typeof text === 'string') {
                                    setAiPastedOutput(text);
                                  }
                                };
                                reader.readAsText(file);
                              }}
                              className={`text-xs p-2 rounded-xl border focus:outline-none cursor-pointer file:cursor-pointer file:rounded-lg file:border-0 file:text-xs file:font-bold file:px-3 file:py-1 ${
                                isDarkMode 
                                  ? 'bg-[#1e1e24] text-zinc-300 border-zinc-800 file:bg-zinc-800 file:text-zinc-200' 
                                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 file:bg-zinc-200 file:text-zinc-800'
                              }`}
                            />
                          </div>

                          {/* Paste Output Text Area */}
                          <div className="flex flex-col gap-1.5">
                            <label className={`font-bold text-xs ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
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

                          {/* Target distribution select */}
                          <div className="flex flex-col gap-1.5">
                            <label className={`font-bold text-xs ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                              יעד פריסת המידע במערכת:
                            </label>
                            <div className="flex gap-4 items-center">
                              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                                <input
                                  type="radio"
                                  name="aiTargetType"
                                  checked={aiTargetType === 'cards'}
                                  onChange={() => setAiTargetType('cards')}
                                  className="accent-indigo-500 cursor-pointer"
                                />
                                <span>כרטיסיות דיון מובנות 🎴</span>
                              </label>
                              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                                <input
                                  type="radio"
                                  name="aiTargetType"
                                  checked={aiTargetType === 'text'}
                                  onChange={() => setAiTargetType('text')}
                                  className="accent-indigo-500 cursor-pointer"
                                />
                                <span>תסריט מלא רציף 📝</span>
                              </label>
                            </div>
                          </div>

                          {/* Central Trigger Action Button */}
                          <button
                            onClick={() => {
                              if (!aiPastedOutput.trim()) {
                                alert('אנא הדביקו קודם כל את הפלט מג׳מיני או טענו קובץ טקסט.');
                                return;
                              }

                              const hasExistingData = aiTargetType === 'cards'
                                ? scriptCards.length > 0
                                : scriptContent.trim().length > 0;

                              if (hasExistingData) {
                                const confirmOverwrite = window.confirm(
                                  aiTargetType === 'cards'
                                    ? 'שים לב, פעולה זו תעדכן ותחליף את כרטיסיות הטקסט הנוכחיות בתוצרים שחולצו מג׳מיני. האם לאשר?'
                                    : 'שים לב, פעולה זו תעדכן ותחליף את התסריט הנוכחי בתוצרים שחולצו מג׳מיני. האם לאשר?'
                                );
                                if (!confirmOverwrite) {
                                  return;
                                }
                              }

                              const inputText = aiPastedOutput;

                              if (aiTargetType === 'text') {
                                setScriptContent(inputText);
                                setScriptMode('text');
                                alert('התסריט הועבר בהצלחה למערכת ההקלטה!');
                              } else {
                                const parsedCards: ScriptCard[] = [];
                                const lines = inputText.split('\n');

                                // Look for card boundary separators
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

                                // Prefix split fallback
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

                                // Paragraph fallback
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
                                  alert(`הפקת בהצלחה ${parsedCards.length} כרטיסיות דיון!`);
                                } else {
                                  alert('לא הצלחנו לפענח כרטיסיות מהטקסט שהוזן. ודאו שהטקסט בפורמט הנכון.');
                                }
                              }

                              // Auto-close the assistant upon successful injection
                              setIsAiAssistantOpen(false);
                            }}
                            className="w-full mt-1 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
                          >
                            <ArrowRightLeft className="w-4 h-4 text-indigo-200" />
                            <span>חלץ, פרק והזרק למערכת ההקלטה</span>
                          </button>

                        </div>

                      </div>
                    )}
                  </div>

                  {/* Cards interface */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className={`text-sm block font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        הוספת כרטיסיית דיון חדשה:
                      </label>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => handleAddCard('intro')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isDarkMode 
                            ? 'bg-[#373743]/50 border-indigo-500/40 text-indigo-300 hover:bg-[#434351]/80 hover:border-indigo-400' 
                            : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300'
                        }`}
                      >
                        + פתיח
                      </button>
                      <button
                        onClick={() => handleAddCard('body')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isDarkMode 
                            ? 'bg-[#373743]/50 border-emerald-500/40 text-emerald-300 hover:bg-[#434351]/80 hover:border-emerald-400' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300'
                        }`}
                      >
                        + גוף
                      </button>
                      <button
                        onClick={() => handleAddCard('outro')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isDarkMode 
                            ? 'bg-[#373743]/50 border-amber-500/40 text-amber-300 hover:bg-[#434351]/80 hover:border-amber-400' 
                            : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300'
                        }`}
                      >
                        + סיכום
                      </button>
                      <button
                        onClick={() => setScriptCards([])}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1 ${
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

                  {/* Cards list - constrained height with internal scroll to keep controls and footer reachable */}
                  <div className="flex flex-col gap-3 max-h-[520px] md:max-h-[580px] overflow-y-auto pr-1 pb-6">
                    {scriptCards.length === 0 ? (
                      <div className={`py-12 px-4 border-2 border-dashed rounded-xl text-center ${
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
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${badgeBgClass}`}>
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
                </>
              )}

              {/* Unified Edit Mode Footer: Word Count, Time, Export to PDF */}
              <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border transition-all mt-2 ${
                isDarkMode 
                  ? 'border-zinc-700/30 bg-[#1c1c22]/50' 
                  : 'border-zinc-200 bg-zinc-50'
              }`}>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className={`font-bold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>נתוני תסריט:</span>
                  <span className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                    isDarkMode 
                      ? 'bg-[#31313f] border-zinc-700/50 text-zinc-200' 
                      : 'bg-zinc-100 border-zinc-300 text-zinc-700'
                  }`}>
                    {scriptMode === 'text' ? (
                      <>
                        <strong className="text-[#ffcc00] font-black">{getWordCount(scriptContent)}</strong> מילים • <strong className="text-emerald-500 font-bold">{formatReadTime(getReadTimeSeconds(getWordCount(scriptContent)))}</strong> הקראה משוערת
                      </>
                    ) : (
                      <>
                        <strong className="text-[#ffcc00] font-black">{getWordCount(scriptCards.map(c => c.text).join(' '))}</strong> מילים • <strong className="text-emerald-500 font-bold">{formatReadTime(getReadTimeSeconds(getWordCount(scriptCards.map(c => c.text).join(' '))))}</strong> הקראה משוערת
                      </>
                    )}
                  </span>
                </div>
                
                <button
                  onClick={handleExportToPDF}
                  className="w-full sm:w-auto text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold transition-all border-2 border-[#ffcc00] text-[#ffcc00] bg-transparent hover:bg-[#ffcc00]/10 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  title="ייצוא התסריט והכרטיסיות לקובץ PDF מעוצב"
                >
                  <Download className="w-4 h-4 text-[#ffcc00]" />
                  <span>ייצוא ל-PDF 📄</span>
                </button>
              </div>

            </div>
          ) : (
            /* TELEPROMPTER / READING MODE */
            scriptMode === 'cards' ? (
              /* CARD-BY-CARD READING MODE */
              <div className="flex flex-col gap-6 flex-1">
                
                {/* Controls at the top */}
                <div className={`p-4 rounded-xl flex items-center justify-between gap-4 text-sm ${
                  isDarkMode ? 'bg-[#1c1c22]' : 'bg-zinc-100'
                }`}>
                  {/* Font Size control */}
                  <div className="flex items-center gap-2">
                    <span className={isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}>גופן:</span>
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

                  {/* Helper text */}
                  <span className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    ניתן להחליף כרטיסייה על ידי גרירה או שימוש בחצים למטה
                  </span>
                </div>

                {/* The Card Stage */}
                {scriptCards.length === 0 ? (
                  <div className={`flex-1 rounded-2xl p-12 text-center border-2 border-dashed ${
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
                        {/* Tinder card stage container */}
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

                        {/* Pagination controls with Left arrow (next) and Right arrow (prev) */}
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
                            <span>הקודמת</span>
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
                            <span>הבאה</span>
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
                
                {/* Teleprompter controls */}
                <div className={`p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-sm ${
                  isDarkMode ? 'bg-[#1c1c22]' : 'bg-zinc-100'
                }`}>
                  
                  {/* Font Size control */}
                  <div className="flex items-center gap-2">
                    <span className={isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}>גופן:</span>
                    <button
                      onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-200' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                      }`}
                    >
                      A-
                    </button>
                    <span className="font-bold w-6 text-center">{fontSize}</span>
                    <button
                      onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-200' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                      }`}
                    >
                      A+
                    </button>
                  </div>

                  {/* Speech Rate Segment selector */}
                  <div className="flex items-center gap-1.5">
                    <span className={isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}>קצב דיבור:</span>
                    <div className={`flex rounded-lg p-0.5 ${isDarkMode ? 'bg-[#121216]' : 'bg-zinc-200'}`}>
                      {(['slow', 'normal', 'fast'] as const).map((rate) => {
                        const label = rate === 'slow' ? 'איטי' : rate === 'normal' ? 'רגיל' : 'מהיר';
                        const isActive = speechRate === rate;
                        return (
                          <button
                            key={rate}
                            onClick={() => setSpeechRate(rate)}
                            className={`px-3 py-1 rounded-md transition-all font-bold text-xs ${
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

                  {/* Auto Scroll Toggle */}
                  <button
                    onClick={() => setIsScrolling(!isScrolling)}
                    className={`px-5 py-2 rounded-xl font-bold transition-all ${
                      isScrolling
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                        : (isDarkMode ? 'bg-zinc-200 text-zinc-950 hover:bg-white' : 'bg-zinc-800 text-white hover:bg-zinc-900')
                    }`}
                  >
                    {isScrolling ? 'עצור גלילה' : 'הפעל גלילה'}
                  </button>

                </div>

                {/* Scrolling Text Stage */}
                <div
                  ref={scrollContainerRef}
                  className={`flex-1 rounded-2xl p-6 overflow-y-auto max-h-[380px] scroll-smooth relative ${
                    isDarkMode ? 'bg-[#18181f] border border-zinc-700/20' : 'bg-zinc-100/60'
                  }`}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {/* Visual Reading Target line marker */}
                  <div className={`absolute left-0 right-0 top-1/3 h-12 pointer-events-none ${
                    isDarkMode ? 'bg-[#ffcc00]/5' : 'bg-zinc-200/20'
                  }`} />
                  
                  <div className="leading-relaxed font-bold select-none pt-2 pb-48 px-2 text-right space-y-4" style={{ direction: 'rtl' }}>
                    {parsedWords.length === 0 || (parsedWords.length === 1 && parsedWords[0].isEmpty) ? (
                      <span className={isDarkMode ? 'text-zinc-600 italic' : 'text-zinc-400 italic'}>לא נכתב תסריט עדיין. חזור/י למצב עריכה כדי להזין טקסט.</span>
                    ) : (
                      parsedWords.map((paragraph, pIdx) => {
                        if (paragraph.isEmpty) {
                          return <div key={pIdx} className="h-4" />;
                        }
                        return (
                          <div key={pIdx} className="block text-right leading-relaxed mb-4">
                            {paragraph.lineWords.map((wordObj) => {
                              const isCurrent = wordObj.index === activeWordIndex;
                              const isPast = wordObj.index < activeWordIndex;
                              return (
                                <span
                                  key={wordObj.index}
                                  id={`word-${wordObj.index}`}
                                  onClick={() => setActiveWordIndex(wordObj.index)}
                                  className={`transition-all duration-200 rounded px-1.5 py-0.5 inline-block mx-1 cursor-pointer ${
                                    isCurrent
                                      ? (isDarkMode ? 'text-black bg-white scale-110 shadow-lg font-black' : 'text-white bg-zinc-850 scale-110 shadow font-black')
                                      : isPast
                                      ? (isDarkMode ? 'text-zinc-700 font-bold' : 'text-zinc-300 font-bold')
                                      : wordObj.isSpeakerInstruction
                                      ? (isDarkMode ? 'text-amber-400 bg-amber-500/5 italic font-medium' : 'text-amber-700/90 bg-amber-500/5 italic font-medium')
                                      : wordObj.isGeneralInstruction
                                      ? (isDarkMode ? 'text-indigo-300 bg-indigo-500/10 italic font-semibold border-b border-dashed border-indigo-500/30 text-[0.9em]' : 'text-indigo-800 bg-indigo-50 italic font-semibold border-b border-dashed border-indigo-300 text-[0.9em]')
                                      : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-800 hover:text-zinc-950')
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
                    className="hover:text-slate-300 flex items-center gap-1 text-slate-400 bg-slate-800/40 px-2.5 py-1 rounded"
                  >
                    <RotateCcw className="w-3 h-3" />
                    התחל מחדש
                  </button>
                </div>

              </div>
            )
          )}

          </div>
          )}

          {mainTab === 'tracks' && (
            <div className="flex flex-col gap-6 w-full">

              {/* Tracks List (רשימת רצועות הקול) */}
              <div className={`rounded-2xl p-6 shadow-xl flex flex-col gap-5 transition-colors duration-300 ${
                isDarkMode ? 'bg-[#2d2d37]/45 border border-zinc-700/20' : 'bg-white'
              }`}>
            
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-zinc-500" />
                <h3 className="text-lg font-bold">רשימת הרצועות בפרויקט</h3>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                isDarkMode ? 'bg-[#373743] text-zinc-300' : 'bg-zinc-200 text-zinc-800'
              }`}>
                {tracks.length} רצועות פעילות
              </span>
            </div>

            {tracks.length === 0 ? (
              <div className="py-12 px-4 border-2 border-dashed border-zinc-700/30 rounded-xl flex flex-col items-center justify-center text-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                  isDarkMode ? 'bg-[#1c1c22] text-zinc-500' : 'bg-zinc-100 text-zinc-400'
                }`}>
                  <Scissors className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className={`text-base font-bold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>אין קטעי קול בפרויקט</h4>
                <p className={`text-sm max-w-sm leading-normal mb-6 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  השתמש/י בכפתורי ההקלטה למעלה או העלה/י קבצים קיימים כדי להתחיל לערוך ולמזג את ההסכת שלך.
                </p>
                <button
                  id="add-music-empty-btn"
                  onClick={() => setIsFreesoundModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer text-xs sm:text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>➕ הוסף פתיח, מעבר או אפקט מוזיקלי</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                
                {tracks.map((track, index) => {
                  const isPlaying = playingTrackId === track.id;
                  const trimmedDuration = track.trimEnd - track.trimStart;
                  const isBeingDragged = draggedIndex === index;
                  const isHoveredOver = dragOverIndex === index && draggedIndex !== index;

                  return (
                    <motion.div
                      key={track.id}
                      layoutId={track.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverIndex !== index) {
                          setDragOverIndex(index);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(index);
                      }}
                      className={`p-5 rounded-xl transition-all flex flex-col gap-4 relative select-none ${
                        isBeingDragged
                          ? 'opacity-30 border-2 border-dashed border-zinc-500 bg-[#121216]/50 scale-[0.99]'
                          : isHoveredOver
                          ? 'bg-zinc-800/10 scale-[1.01] shadow-lg'
                          : (isDarkMode ? 'bg-[#373743] text-zinc-100 shadow-sm border border-zinc-700/20' : 'bg-zinc-100/70 text-zinc-900')
                      }`}
                    >
                      
                      {/* Drag Edge Handle / Visual Indicator */}
                      <div className={`absolute right-0 top-0 bottom-0 w-1.5 rounded-r-xl pointer-events-none ${
                        track.isEffect 
                          ? (isDarkMode ? 'bg-purple-500' : 'bg-purple-400')
                          : (isDarkMode ? 'bg-[#ffcc00]' : 'bg-zinc-400')
                      }`} />

                      {/* Track Header & Names & Move Control */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pr-2">
                        
                        {/* Track Name Input with drag handle */}
                        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
                          <div 
                            title="גרור למעלה או למטה כדי לשנות סדר" 
                            draggable
                            onDragStart={(e) => {
                              setDraggedIndex(index);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => {
                              setDraggedIndex(null);
                              setDragOverIndex(null);
                            }}
                            className={`p-2 rounded-lg text-zinc-500 cursor-grab active:cursor-grabbing transition-colors shrink-0 flex items-center justify-center ${
                              isDarkMode ? 'bg-[#2d2d37] hover:bg-[#434351]' : 'bg-zinc-200 hover:bg-zinc-300 shadow-sm'
                            }`}
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <span className={`text-sm font-bold px-3 py-1 rounded-md shrink-0 ${
                            isDarkMode ? 'bg-[#2d2d37] text-zinc-300' : 'bg-zinc-200 text-zinc-700'
                          }`}>
                            רצועה {index + 1}
                          </span>
                          <input
                            type="text"
                            value={track.name}
                            onChange={(e) => updateTrackField(track.id, 'name', e.target.value)}
                            className={`rounded-lg px-3 py-1.5 text-base font-bold focus:outline-none w-full max-w-md ${
                              isDarkMode ? 'bg-[#2d2d37] hover:bg-[#434351] text-white focus:ring-1 focus:ring-zinc-700' : 'bg-zinc-200 hover:bg-zinc-150 text-zinc-900 focus:ring-1 focus:ring-zinc-300 shadow-sm'
                            }`}
                          />
                        </div>

                        {/* Control actions: Move & Delete */}
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0">
                          
                          {/* Move up */}
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            title="הזז למעלה"
                            className={`p-2 rounded-lg transition-all ${
                              isDarkMode 
                                ? 'bg-[#2d2d37] hover:bg-[#434351] disabled:opacity-40 text-zinc-400' 
                                : 'bg-zinc-200 hover:bg-zinc-300 disabled:opacity-40 text-zinc-700 shadow-sm'
                            }`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>

                          {/* Move down */}
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === tracks.length - 1}
                            title="הזז למטה"
                            className={`p-2 rounded-lg transition-all ${
                              isDarkMode 
                                ? 'bg-[#2d2d37] hover:bg-[#434351] disabled:opacity-40 text-zinc-400' 
                                : 'bg-zinc-200 hover:bg-zinc-300 disabled:opacity-40 text-zinc-700 shadow-sm'
                            }`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {/* Individual Volume Control */}
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                            isDarkMode ? 'bg-[#2d2d37]' : 'bg-zinc-200 shadow-sm'
                          }`}>
                            <span title="ווליום">
                              {track.volume === 0 ? (
                                <VolumeX className="w-4 h-4 text-zinc-500" />
                              ) : (
                                <Volume2 className={`w-4 h-4 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`} />
                              )}
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={track.volume}
                              onChange={(e) => updateTrackField(track.id, 'volume', Number(e.target.value))}
                              className="w-16 h-1 accent-[#ffcc00] bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className={`font-bold text-xs min-w-8 text-left ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>
                              {Math.round(track.volume * 100)}%
                            </span>
                          </div>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteTrack(track.id)}
                            title="מחק רצועה"
                            className={`p-2 rounded-lg transition-all ${
                              isDarkMode 
                                ? 'bg-red-950/40 hover:bg-red-900/30 text-red-400' 
                                : 'bg-red-100 hover:bg-red-200 text-red-700'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>

                      </div>

                      {/* Timeline Wave Visual & Premium dual Trimming controls */}
                      <div className={`p-4 rounded-xl flex flex-col gap-3 ${
                        isDarkMode ? 'bg-[#1c1c22]/30' : 'bg-zinc-200/40'
                      }`}>
                        
                        {/* Premium direct manipulation TrackTimeline component */}
                        <TrackTimeline
                          track={track}
                          onTrimChange={updateTrackTrim}
                          isDarkMode={isDarkMode}
                        />

                      </div>

                        {/* Preview individual trimmed segment */}
                        <div className="flex justify-between items-center pt-3 mt-1">
                          
                          {/* Standard preview player */}
                          <div className="flex items-center gap-1.5 w-full max-w-xs">
                            <span className={`text-xs font-bold ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>נגן מלא:</span>
                            <audio src={track.audioUrl} controls className="w-full h-8 rounded bg-zinc-900 text-xs scale-90 origin-right" />
                          </div>

                          {/* Play segment button */}
                          <button
                            onClick={() => playIndividualTrackSegment(track)}
                            className={`text-sm px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                              isPlaying
                                ? (isDarkMode ? 'bg-[#434351] text-white' : 'bg-zinc-200 text-zinc-900 shadow-sm')
                                : (isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 shadow-sm')
                            }`}
                          >
                            {isPlaying ? (
                              <>
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>עצור השמעה</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>האזן לקטע החתוך</span>
                              </>
                            )}
                          </button>

                        </div>

                    </motion.div>
                  );
                })}

                {/* Migrating "+" Button as the final element in the tracks list */}
                <div className="flex justify-center mt-4 pt-2 border-t border-dashed border-zinc-700/20">
                  <button
                    id="add-music-migrating-btn"
                    onClick={() => setIsFreesoundModalOpen(true)}
                    className={`w-full py-4 px-6 rounded-xl border-2 border-dashed font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                      isDarkMode
                        ? 'border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-300 hover:border-indigo-400'
                        : 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:border-indigo-500'
                    }`}
                  >
                    <Plus className="w-5 h-5 text-indigo-500" />
                    <span>➕ הוסף פתיח, מעבר או אפקט מוזיקלי (Freesound)</span>
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Global Merging & Export (מיזוג וייצוא) */}
          <div className={`rounded-2xl p-6 shadow-xl flex flex-col gap-5 transition-colors duration-300 ${
            isDarkMode ? 'bg-[#2d2d37]/45 border border-zinc-700/20' : 'bg-white'
          }`}>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Download className="w-5 h-5 text-zinc-500" />
              מיזוג סופי וייצוא ההסכת
            </h3>

            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              לחיצה על הכפתור תחל את תהליך החיבור. המערכת תפענח, תחתוך, ותסדר את רצועות הקול שלכם ברצף כרונולוגי לפי הסדר המוצג למעלה, ותייצר קובץ שמע אחד סופי ומאוחד הניתן להורדה ישירות למחשב.
            </p>

            <button
              onClick={mergePodcastTracks}
              disabled={isMerging || tracks.length === 0 || !hasUnmergedChanges}
              className={`w-full py-4 rounded-xl font-bold transition-all shadow text-base flex items-center justify-center gap-2 cursor-pointer ${
                tracks.length === 0 || !hasUnmergedChanges
                  ? (isDarkMode ? 'bg-[#1c1c22] text-zinc-600' : 'bg-zinc-200 text-zinc-400')
                  : isMerging
                  ? (isDarkMode ? 'bg-[#2d2d37] text-zinc-400' : 'bg-zinc-300 text-zinc-600')
                  : (isDarkMode ? 'bg-zinc-200 hover:bg-white text-zinc-950' : 'bg-zinc-800 hover:bg-zinc-900 text-white')
              }`}
            >
              {isMerging ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>ממזג, חותך ומחבר את קטעי השמע...</span>
                </>
              ) : !hasUnmergedChanges ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>ההסכת מעודכן ומוזג בהצלחה</span>
                </>
              ) : (
                <>
                  <Sliders className="w-4 h-4" />
                  <span>חבר קטעי קול להסכת</span>
                </>
              )}
            </button>

            {/* Final Export Merged Player */}
            {mergedUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-5 rounded-xl ${
                  isDarkMode ? 'bg-[#18181f] border border-zinc-700/20' : 'bg-zinc-100'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  
                  <div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full mb-1.5 inline-block ${
                      isDarkMode ? 'bg-[#2d2d37] text-zinc-300' : 'bg-zinc-200 text-zinc-800'
                    }`}>
                      קובץ מוכן לייצוא!
                    </span>
                    <h4 className="text-base font-bold">הסכת מאוחד ומעובד סופית</h4>
                    <p className={`text-xs font-bold mt-1.5 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                      משך כולל: {formatTime(mergedDuration)} שניות | {tracks.length} קטעים מחוברים | קובץ WAV באיכות גבוהה
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    
                    {/* Preview merged audio */}
                    <button
                      onClick={toggleMergedAudio}
                      className={`px-4 py-2.5 text-sm rounded-xl font-bold transition-all flex items-center gap-2 ${
                        isMergedPlayerPlaying
                          ? (isDarkMode ? 'bg-[#373743] text-white' : 'bg-zinc-200 text-zinc-900 shadow-sm')
                          : (isDarkMode ? 'bg-[#2d2d37] hover:bg-[#373743] text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 shadow-sm')
                      }`}
                    >
                      {isMergedPlayerPlaying ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>עצור השמעה</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>האזן להסכת המוכן</span>
                        </>
                      )}
                    </button>

                    {/* Download Final Podcast button */}
                    <a
                      href={mergedUrl}
                      download={`podcast_studio_export_${Date.now()}.wav`}
                      className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        isDarkMode ? 'bg-zinc-200 hover:bg-white text-zinc-950' : 'bg-zinc-800 hover:bg-zinc-900 text-white shadow-sm'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      <span>הורד הסכת מוכן</span>
                    </a>

                  </div>

                </div>

              </motion.div>
            )}

          </div>

        </div>
      )}

    </section>

  </main>

      {/* Footer */}
      <footer className={`py-8 text-center text-sm transition-colors duration-300 mt-12 ${
        isDarkMode ? 'bg-zinc-950 text-zinc-500' : 'bg-zinc-100 text-zinc-600'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <p className="font-bold text-right md:text-right">
              אולפן הסכתים אקדמי לסטודנטים – נבנה עבור עריכה קלה, הקלטה ישירה ומיזוג קבצים בדפדפן.
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'} text-right md:text-right`}>
              כל הפעולות מתבצעות מקומית על המעבד בדפדפן ללא שמירה בשרת חיצוני.
            </p>
          </div>
          
          {/* Seminar HaKibbutzim Logo & Subtitle */}
          <div className="flex items-center gap-3 select-none shrink-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm tracking-tight shadow-sm shrink-0 ${
              isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'
            }`}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 4H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
            </div>
            <div className="text-right flex flex-col">
              <span className={`text-base font-bold ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>סמינר הקיבוצים</span>
              <span className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>מרכז החדשנות</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Freesound Assets Modal */}
      {isFreesoundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsFreesoundModalOpen(false)}
          />
          
          {/* Modal Container */}
          <div className={`relative w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-[#1e1e24] border-zinc-700/50 text-zinc-100' 
              : 'bg-white border-zinc-200 text-zinc-800'
          }`} style={{ direction: 'rtl' }}>
            
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
              isDarkMode ? 'border-zinc-700/40 bg-[#16161b]' : 'border-zinc-200 bg-zinc-50'
            }`}>
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-indigo-500 animate-pulse" />
                <h3 className="text-base sm:text-lg font-bold">🎵 מאגר קטעי קול ומוזיקה לפודקאסט</h3>
              </div>
              <button
                onClick={() => setIsFreesoundModalOpen(false)}
                className={`p-2 rounded-lg transition-all text-xs cursor-pointer ${
                  isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
                }`}
              >
                ✕ סגור
              </button>
            </div>

            {/* Category Tabs (Filter Buttons) */}
            <div className={`p-4 flex flex-col sm:flex-row items-center gap-4 justify-between border-b ${
              isDarkMode ? 'border-zinc-700/30' : 'border-zinc-100'
            }`}>
              <div className={`flex rounded-xl p-1 gap-1 shrink-0 ${isDarkMode ? 'bg-zinc-950/60' : 'bg-zinc-100'}`}>
                <button
                  onClick={() => {
                    setFreesoundCategory('intro');
                    setFreesoundSearchQuery('');
                  }}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    freesoundCategory === 'intro'
                      ? 'bg-indigo-600 text-white shadow'
                      : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                  }`}
                >
                  <span>🎵 אות פתיחה (Intro)</span>
                </button>
                <button
                  onClick={() => {
                    setFreesoundCategory('transition');
                    setFreesoundSearchQuery('');
                  }}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    freesoundCategory === 'transition'
                      ? 'bg-indigo-600 text-white shadow'
                      : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                  }`}
                >
                  <span>✨ מנגינת מעבר (Transition)</span>
                </button>
                <button
                  onClick={() => {
                    setFreesoundCategory('outro');
                    setFreesoundSearchQuery('');
                  }}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    freesoundCategory === 'outro'
                      ? 'bg-indigo-600 text-white shadow'
                      : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                  }`}
                >
                  <span>🎬 אות סיום (Outro)</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:max-w-xs">
                <input
                  type="text"
                  placeholder="חיפוש חופשי ב-Freesound..."
                  value={freesoundSearchQuery}
                  onChange={(e) => setFreesoundSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchFreesoundAssets(freesoundCategory, freesoundSearchQuery);
                    }
                  }}
                  className={`w-full py-2 pl-3 pr-9 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                    isDarkMode 
                      ? 'bg-zinc-900 text-zinc-100 placeholder-zinc-500 border border-zinc-700/50' 
                      : 'bg-zinc-50 text-zinc-800 placeholder-zinc-400 border border-zinc-300'
                  }`}
                />
                <button
                  onClick={() => fetchFreesoundAssets(freesoundCategory, freesoundSearchQuery)}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 cursor-pointer flex items-center justify-center"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Results Body */}
            <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
              
              {freesoundLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    טוען קבצי שמע מ-Freesound...
                  </p>
                </div>
              ) : freesoundResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className={`w-12 h-12 mb-4 ${isDarkMode ? 'text-zinc-700' : 'text-zinc-300'}`} />
                  <p className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    לא נמצאו תוצאות או שהשירות אינו זמין
                  </p>
                  <p className="text-xs text-zinc-500 max-w-sm">
                    ייתכן שלא ימצאו תוצאות. מומלץ להשתמש באפשרות "העלאת קבצים" כדי להוסיף קבצי קול משלכם.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {freesoundResults.map((hit, index) => {
                    const isPreviewPlaying = previewPlayingId === hit.id;
                    const durationText = hit.duration ? `${Math.floor(hit.duration)} שניות` : 'שמע';
                    const tagsList = (hit.tags && hit.tags.length > 0) ? hit.tags.slice(0, 3).join(', ') : 'שמע';

                    return (
                      <div
                        key={`${hit.id}-${index}`}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                          isDarkMode
                            ? 'bg-[#272733]/40 hover:bg-[#272733]/80 border-zinc-700/30'
                            : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                        }`}
                      >
                        {/* Audio Details */}
                        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                          {/* Play/Preview Button */}
                          <button
                            onClick={() => togglePreviewAudio(hit.id, hit.previews['preview-hq-mp3'] || hit.previews['preview-lq-mp3'])}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow transition-all cursor-pointer ${
                              isPreviewPlaying
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                            title={isPreviewPlaying ? "עצור השמעה" : "השמעת דוגמה"}
                          >
                            {isPreviewPlaying ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current mr-0.5" />
                            )}
                          </button>

                          <div className="flex flex-col text-right">
                            <span className="font-bold text-xs sm:text-sm line-clamp-1" title={hit.name}>
                              {hit.name || tagsList}
                            </span>
                            <span className={`text-[10px] sm:text-xs font-bold mt-0.5 ${
                              isDarkMode ? 'text-zinc-500' : 'text-zinc-500'
                            }`}>
                              ⏱️ משך: {durationText} | יוצר: {hit.username || 'Freesound'}
                            </span>
                          </div>
                        </div>

                        {/* Add to project Button */}
                        <button
                          onClick={() => handleAddFreesoundTrack(hit)}
                          className={`w-full sm:w-auto px-4 py-2 rounded-lg font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
                            isDarkMode
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>הוסף לפרויקט</span>
                        </button>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className={`p-3 text-center text-[10px] font-bold select-none border-t ${
              isDarkMode ? 'border-zinc-700/30 bg-[#16161b]' : 'border-zinc-200 bg-zinc-50'
            }`}>
              <p className={isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}>
                כל קטעי השמע במאגר מסופקים ברישיון חופשי לשימוש באדיבות Freesound API.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
