// Genveje til populære apps. Hvert TV-mærke bruger sine egne app-id'er; hvis et id
// mangler eller ikke virker, slås appen op i TV'ets liste over installerede apps
// ved hjælp af navnene i `match`.
export const APP_CATALOG = [
  {
    id: 'netflix',
    name: 'Netflix',
    color: '#e50914',
    match: ['netflix'],
    ids: { samsung: ['11101200001', '3201907018807'], lg: ['netflix'], roku: ['12'] },
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#ff0033',
    match: ['youtube'],
    ids: { samsung: ['111299001912'], lg: ['youtube.leanback.v4'], roku: ['837'] },
  },
  {
    id: 'drtv',
    name: 'DR TV',
    color: '#c8102e',
    match: ['dr tv', 'drtv', 'dr.dk'],
    ids: {},
  },
  {
    id: 'tv2play',
    name: 'TV 2 Play',
    color: '#0050ff',
    match: ['tv 2 play', 'tv2 play', 'tv 2'],
    ids: {},
  },
  {
    id: 'disney',
    name: 'Disney+',
    color: '#113ccf',
    match: ['disney'],
    ids: { samsung: ['3201901017640'], lg: ['com.disney.disneyplus-prod'], roku: ['291097'] },
  },
  {
    id: 'prime',
    name: 'Prime Video',
    color: '#00a8e1',
    match: ['prime video', 'amazon'],
    ids: { samsung: ['3201910019365', '3201512006785'], lg: ['amazon'], roku: ['13'] },
  },
  {
    id: 'max',
    name: 'Max',
    color: '#002be7',
    match: ['max', 'hbo'],
    ids: {},
  },
  {
    id: 'viaplay',
    name: 'Viaplay',
    color: '#ff1e46',
    match: ['viaplay'],
    ids: {},
  },
  {
    id: 'skyshowtime',
    name: 'SkyShowtime',
    color: '#5b2be0',
    match: ['skyshowtime'],
    ids: {},
  },
  {
    id: 'spotify',
    name: 'Spotify',
    color: '#1db954',
    match: ['spotify'],
    ids: { samsung: ['3201606009684'], lg: ['spotify-beehive'], roku: ['22297'] },
  },
  {
    id: 'plex',
    name: 'Plex',
    color: '#e5a00d',
    match: ['plex'],
    ids: { roku: ['13535'] },
  },
  {
    id: 'twitch',
    name: 'Twitch',
    color: '#9146ff',
    match: ['twitch'],
    ids: {},
  },
];

export function findCatalogApp(id) {
  return APP_CATALOG.find((a) => a.id === id) || null;
}

/** Finder den installerede app der bedst matcher navnene i et katalog-opslag. */
export function matchInstalled(installed, entry) {
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  for (const m of entry.match || [norm(entry.name)]) {
    const exact = installed.find((a) => norm(a.name) === m);
    if (exact) return exact;
  }
  for (const m of entry.match || [norm(entry.name)]) {
    const partial = installed.find((a) => norm(a.name).includes(m));
    if (partial) return partial;
  }
  return null;
}
