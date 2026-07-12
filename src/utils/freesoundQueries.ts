export const INTRO_QUERIES = [
  "podcast intro sting",
  "short intro jingle",
  "radio intro bumper",
  "opening logo sound",
  "soft podcast intro",
  "news intro sting",
  "educational podcast intro",
  "short music ident",
  "warm acoustic intro",
  "bright opening chime"
];

export const OUTRO_QUERIES = [
  "podcast outro sting",
  "closing jingle",
  "soft ending music",
  "radio outro bumper",
  "ending logo sound",
  "short outro chime",
  "warm closing music",
  "success ending sting",
  "gentle outro",
  "calm podcast ending"
];

export const TRANSITION_QUERIES = [
  "podcast transition",
  "short whoosh",
  "soft transition",
  "radio transition",
  "button click transition",
  "page turn sound",
  "short sweep",
  "light riser",
  "pop transition",
  "marker sound"
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
