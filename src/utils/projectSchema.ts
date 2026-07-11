import { z } from 'zod';

const ALLOWED_MIME_TYPES = [
  'audio/wav', 'audio/wave', 'audio/x-wav', 
  'audio/mpeg', 'audio/mp3', 
  'audio/m4a', 'audio/x-m4a', 
  'audio/ogg', 'audio/webm', 
  'audio/aac', 'audio/flac', 
  'audio/mp4', 'audio/x-aac',
  'audio/3gpp', 'audio/3gpp2'
];

export const scriptCardSchema = z.object({
  id: z.string().max(100),
  type: z.enum(['intro', 'body', 'outro']),
  text: z.string().max(10000, "תוכן כרטיסיית שיחה ארוך מדי (מקסימום 10,000 תווים)")
});

export const trackMetadataSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  duration: z.number().min(0).max(3600, "אורך רצועת שמע לא יכול לעלות על 60 דקות (3600 שניות)"),
  trimStart: z.number().min(0).max(3600),
  trimEnd: z.number().min(0).max(3600),
  volume: z.number().min(0).max(5, "עוצמת השמע לא תקינה (חייבת להיות בין 0 ל-5)"),
  isEffect: z.boolean().optional().default(false),
  mimeType: z.string().optional().default('audio/wav').transform(val => val || 'audio/wav').refine(val => {
    if (!val) return true;
    const base = val.split(';')[0].trim().toLowerCase();
    return base.startsWith('audio/') || ALLOWED_MIME_TYPES.includes(base) || base.includes('/') || base === '';
  }, "סוג קובץ השמע אינו נתמך במערכת (MIME type לא תקין)"),
  fadeInDuration: z.number().min(0).max(10).optional().default(0),
  fadeOutDuration: z.number().min(0).max(10).optional().default(0),
  silenceAfter: z.number().min(0).max(10).optional().default(0),
}).refine(data => data.trimStart <= data.duration, {
  message: "זמן התחלת הקיטוע לא יכול להיות גדול מאורך הרצועה",
  path: ["trimStart"]
}).refine(data => data.trimEnd <= data.duration, {
  message: "זמן סיום הקיטוע לא יכול להיות גדול מאורך הרצועה",
  path: ["trimEnd"]
}).refine(data => data.trimStart <= data.trimEnd, {
  message: "זמן התחלת הקיטוע לא יכול להיות גדול מזמן הסיום",
  path: ["trimStart"]
});

export const projectBackupSchema = z.object({
  version: z.number().min(1).max(10, "גרסת פרויקט לא נתמכת"),
  podcastName: z.string().max(200, "שם הפודקאסט ארוך מדי (מקסימום 200 תווים)").optional().default(''),
  participants: z.string().max(300, "רשימת המשתתפים ארוכה מדי (מקסימום 300 תווים)").optional().default(''),
  scriptContent: z.string().max(100000, "תוכן התסריט ארוך מדי (מקסימום 100,000 תווים)").optional().default(''),
  scriptMode: z.enum(['text', 'cards']).optional().default('text'),
  scriptCards: z.array(scriptCardSchema).max(50, "מספר כרטיסיות השיחה המקסימלי הוא 50").optional().default([]),
  activeCardIndex: z.number().min(0).max(50).optional().default(0),
  aiStudentNotes: z.string().max(10000).optional().default(''),
  aiStructure: z.string().max(10000).optional().default(''),
  aiOutputFormat: z.string().max(10000).optional().default(''),
  aiDuration: z.string().max(1000).optional().default(''),
  aiArchetype: z.string().max(1000).optional().default(''),
  tracks: z.array(trackMetadataSchema).max(20, "לא ניתן לטעון יותר מ-20 רצועות שמע בפרויקט")
});

export type ProjectBackup = z.infer<typeof projectBackupSchema>;
