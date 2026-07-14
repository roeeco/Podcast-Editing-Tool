export const INTRO_QUERIES = [
  "intro",
  "podcast intro",
  "jingle intro",
  "acoustic intro",
  "chime intro",
  "music intro",
  "logo intro",
  "sting intro",
  "bright intro",
  "soft intro"
];

export const OUTRO_QUERIES = [
  "outro",
  "podcast outro",
  "jingle outro",
  "closing music",
  "ending music",
  "chime outro",
  "calm outro",
  "soft outro"
];

export const TRANSITION_QUERIES = [
  "transition",
  "whoosh",
  "sfx transition",
  "sweep transition",
  "riser transition",
  "sound transition",
  "radio transition"
];

export function getRandomQuery(category: 'intro' | 'transition' | 'outro'): string {
  let pool = INTRO_QUERIES;
  if (category === 'transition') {
    pool = TRANSITION_QUERIES;
  } else if (category === 'outro') {
    pool = OUTRO_QUERIES;
  }
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

export const ALLOWED_SORTS = [
  { value: "score", label: "רלוונטיות" },
  { value: "rating_desc", label: "דירוג גבוה" },
  { value: "downloads_desc", label: "הורדות רבות" },
  { value: "created_desc", label: "חדש ביותר" },
  { value: "duration_asc", label: "קצר ביותר" }
];

