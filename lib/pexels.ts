// lib/pexels.ts

export interface PexelsPhoto {
  id: number;
  url: string;        // Pexels page URL
  photographer: string;
  src: {
    original: string;
    large2x: string;  // 940px wide
    large: string;    // 640px wide
    medium: string;   // 350px wide
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
  pexelsUrl?: string;    // Link alla pagina Pexels (attribuzione)
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
  'Röst':        ['voice recording', 'microphone studio', 'podcast recording', 'sound studio'],
  'Dans':        ['dance performance', 'dancer spotlight', 'dance studio', 'choreography'],
  'Event':       ['event stage', 'live event', 'conference stage', 'event photography'],
  'Figurant':    ['crowd scene', 'film extras', 'movie crowd', 'background actor'],
};

/**
 * Genera query di ricerca intelligenti basate sul job
 */
function buildSearchQueries(
  title: string,
  category?: string | null,
  description?: string | null
): string[] {
  const queries: string[] = [];

  // 1. Query basata sulla categoria
  if (category) {
    const catKey = Object.keys(CATEGORY_KEYWORDS).find(
      (k) => k.toLowerCase() === category.toLowerCase()
    );
    if (catKey) {
      const keywords = CATEGORY_KEYWORDS[catKey];
      // Prendi 2 keyword casuali dalla categoria
      const shuffled = keywords.sort(() => 0.5 - Math.random());
      queries.push(shuffled[0]);
      if (shuffled[1]) queries.push(shuffled[1]);
    }
  }

  // 2. Query basata su parole chiave dal titolo
  const titleKeywords = extractKeywords(title);
  if (titleKeywords) {
    queries.push(titleKeywords);
  }

  // 3. Query generiche di fallback
  if (queries.length === 0) {
    queries.push('casting audition', 'film production', 'creative portrait');
  }

  // 4. Sempre aggiungere una query "cinematic" per varietà
  queries.push('cinematic portrait dark');

return Array.from(new Set(queries)).slice(0, 4);}

/**
 * Estrai keyword utili dal titolo (rimuovi parole svedesi comuni)
 */
function extractKeywords(title: string): string {
  const stopWords = [
    'sökes', 'för', 'till', 'och', 'med', 'i', 'på', 'av', 'den', 'det',
    'en', 'ett', 'vi', 'vår', 'nya', 'ny', 'stor', 'liten', 'alla',
    'professionella', 'foton', 'digital', 'twin', 'jobb',
  ];

  const words = title
    .toLowerCase()
    .replace(/[^a-zåäöA-ZÅÄÖ\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.includes(w));

  // Traduci alcune parole svedesi comuni
  const translations: Record<string, string> = {
    'skådespelare': 'actor',
    'skådespelerska': 'actress',
    'barn': 'children',
    'ungdomar': 'teenagers',
    'modell': 'model',
    'sångare': 'singer',
    'dansare': 'dancer',
    'komiker': 'comedian',
    'musiker': 'musician',
    'stockholm': 'stockholm city',
    'göteborg': 'gothenburg',
    'malmö': 'malmo city',
    'reklam': 'commercial',
    'reklamfilm': 'commercial film',
    'kortfilm': 'short film',
    'långfilm': 'feature film',
    'serie': 'tv series',
    'teater': 'theater',
    'musikvideo': 'music video',
    'fotograf': 'photographer',
  };

  const translated = words.map((w) => translations[w] || w);
  return translated.slice(0, 3).join(' ');
}

/**
 * Cerca immagini su Pexels
 */
export async function searchPexels(
  query: string,
  perPage: number = 5
): Promise<PexelsPhoto[]> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.error('❌ PEXELS_API_KEY not configured');
    return [];
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait&size=large`;

    const res = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    if (!res.ok) {
      console.error(`❌ Pexels API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return data.photos || [];
  } catch (error) {
    console.error('❌ Pexels search failed:', error);
    return [];
  }
}

/**
 * Funzione principale: trova alternative per un job
 */
export async function findAlternativeImages(
  title: string,
  category?: string | null,
  description?: string | null,
  originalImageUrl?: string | null,
  maxResults: number = 8
): Promise<AlternativeImage[]> {
  const alternatives: AlternativeImage[] = [];

  // 1. Aggiungi l'immagine originale come prima opzione (se esiste)
  if (originalImageUrl) {
    alternatives.push({
      id: 'original',
      url: originalImageUrl,
      thumbnailUrl: originalImageUrl,
      source: 'original',
      label: 'Originale (Acasting)',
    });
  }

  // 2. Genera query di ricerca
  const queries = buildSearchQueries(title, category, description);
  console.log('🔍 Pexels search queries:', queries);

  // 3. Cerca su Pexels con tutte le query
  const photosPerQuery = Math.ceil(maxResults / queries.length);
  const seenIds = new Set<number>();

  for (const query of queries) {
    const photos = await searchPexels(query, photosPerQuery);

    for (const photo of photos) {
      if (seenIds.has(photo.id)) continue;
      seenIds.add(photo.id);

      alternatives.push({
        id: `pexels-${photo.id}`,
        url: photo.src.original,         // HD per Cloudinary
        thumbnailUrl: photo.src.medium,   // Thumbnail per galleria
        source: 'pexels',
        label: photo.alt || query,
        photographer: photo.photographer,
        pexelsUrl: photo.url,
      });

      if (alternatives.length >= maxResults + 1) break; // +1 per l'originale
    }

    if (alternatives.length >= maxResults + 1) break;
  }

  console.log(`📸 Found ${alternatives.length} alternatives (including original)`);
  return alternatives;
}