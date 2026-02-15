// lib/pexels.ts
export interface PexelsPhoto {
  id: number;
  url: string;        // URL della pagina Pexels
  photographer: string;
  src: {
    original: string;
    large2x: string;  // 940px di larghezza
    large: string;    // 640px di larghezza
    medium: string;   // 350px di larghezza
    portrait: string; // 800x1200
  };
  alt: string;
  width: number;
  height: number;
}

export interface AlternativeImage {
  id: string;
  url: string;           // URL ad alta risoluzione per Cloudinary
  thumbnailUrl: string;  // URL piccolo per preview nella galleria
  source: 'original' | 'pexels';
  label: string;
  photographer?: string;
  pexelsUrl?: string;    // Link alla pagina Pexels per attribuzione
}

// Mappatura categorie svedesi → query inglesi per risultati migliori
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Film':        ['cinema production', 'film set', 'movie scene', 'film camera'],
  'Reklam':      ['commercial shoot', 'advertising photo', 'brand campaign', 'studio photography'],
  'Teater':      ['theater stage', 'theatrical performance', 'drama stage', 'stage lights'],
  'TV':          ['tv studio', 'television production', 'broadcast studio', 'tv camera'],
  'Foto':        ['photo studio', 'photography session', 'portrait photography', 'camera portrait'],
  'Musikvideo':  ['music video', 'music production', 'concert stage', 'musician performance'],
  'Casting':     ['casting call', 'audition room', 'talent search', 'spotlight portrait'],
  'Modell':      ['fashion model', 'fashion photography', 'runway model', 'fashion portrait'],
  'Röst':        ['voice recording', 'microphone studio', 'sound studio'],
  'Dans':        ['dance performance', 'dancer spotlight', 'dance studio'],
  'Event':       ['event stage', 'live event', 'conference stage'],
  'Figurant':    ['crowd scene', 'film extras', 'background actor'],
};

/**
 * Genera query di ricerca intelligenti basate sui dati del lavoro
 */
function buildSearchQueries(
  title: string,
  category?: string | null,
  description?: string | null
): string[] {
  const queries: string[] = [];

  if (category) {
    const catKey = Object.keys(CATEGORY_KEYWORDS).find(
      (k) => k.toLowerCase() === category.toLowerCase()
    );
    if (catKey) {
      const keywords = CATEGORY_KEYWORDS[catKey];
      const shuffled = [...keywords].sort(() => 0.5 - Math.random());
      queries.push(shuffled[0]);
      if (shuffled[1]) queries.push(shuffled[1]);
    }
  }

  const titleKeywords = extractKeywords(title);
  if (titleKeywords) {
    queries.push(titleKeywords);
  }

  if (queries.length === 0) {
    queries.push('casting audition', 'film production');
  }

  queries.push('cinematic portrait dark');
  return Array.from(new Set(queries)).slice(0, 4);
}

/**
 * Estrae keyword utili dal titolo svedese e le traduce in inglese
 */
function extractKeywords(title: string): string {
  const stopWords = [
    'sökes', 'för', 'till', 'och', 'med', 'i', 'på', 'av', 'den', 'det',
    'en', 'ett', 'vi', 'vår', 'nya', 'ny', 'stor', 'liten', 'alla', 'jobb',
  ];

  const words = title
    .toLowerCase()
    .replace(/[^a-zåäöA-ZÅÄÖ\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.includes(w));

  const translations: Record<string, string> = {
    'skådespelare': 'actor',
    'skådespelerska': 'actress',
    'barn': 'children',
    'modell': 'model',
    'sångare': 'singer',
    'dansare': 'dancer',
    'reklam': 'commercial',
    'kortfilm': 'short film',
    'långfilm': 'movie',
    'fotograf': 'photographer',
  };

  const translated = words.map((w) => translations[w] || w);
  return translated.slice(0, 3).join(' ');
}

/**
 * Funzione per cercare immagini su Pexels
 */
export async function searchPexels(
  query: string,
  perPage: number = 5
): Promise<PexelsPhoto[]> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.error('❌ ERRORE CRITICO: PEXELS_API_KEY non configurata nelle variabili di ambiente');
    return [];
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait&size=large`;
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error(`❌ Errore API Pexels (${res.status}):`, errorData);
      return [];
    }

    const data = await res.json();
    return data.photos || [];
  } catch (error) {
    console.error('❌ Eccezione durante il fetch da Pexels:', error);
    return [];
  }
}

/**
 * Funzione principale per trovare immagini alternative per un lavoro
 */
export async function findAlternativeImages(
  title: string,
  category?: string | null,
  description?: string | null,
  originalImageUrl?: string | null,
  maxResults: number = 8
): Promise<AlternativeImage[]> {
  const alternatives: AlternativeImage[] = [];

  // 1. Inserisce sempre l'immagine originale come prima opzione
  if (originalImageUrl) {
    alternatives.push({
      id: 'original',
      url: originalImageUrl,
      thumbnailUrl: originalImageUrl,
      source: 'original',
      label: 'Originale (Acasting)',
    });
  }

  // Verifica se la chiave API esiste prima di eseguire la ricerca
  if (!process.env.PEXELS_API_KEY) {
    console.warn('⚠️ Ricerca Pexels saltata: Chiave API non configurata');
    return alternatives;
  }

  const queries = buildSearchQueries(title, category, description);
  const photosPerQuery = Math.ceil(maxResults / queries.length);
  const seenIds = new Set<number>();

  for (const query of queries) {
    const photos = await searchPexels(query, photosPerQuery);
    for (const photo of photos) {
      if (seenIds.has(photo.id)) continue;
      seenIds.add(photo.id);

      alternatives.push({
        id: `pexels-${photo.id}`,
        url: photo.src.original,
        thumbnailUrl: photo.src.medium,
        source: 'pexels',
        label: photo.alt || query,
        photographer: photo.photographer,
        pexelsUrl: photo.url,
      });

      if (alternatives.length >= maxResults + 1) break;
    }
    if (alternatives.length >= maxResults + 1) break;
  }

  return alternatives;
}