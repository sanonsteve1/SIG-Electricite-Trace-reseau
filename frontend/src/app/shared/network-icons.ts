/**
 * Mapping des slugs de couche réseau vers les icônes ArcGIS Utility Network style.
 * Les icônes SVG sont stockées dans public/icons/network/.
 *
 * Usage Leaflet :
 *   const icon = getNetworkLeafletIcon(leaflet, slug, isHighlighted);
 *   L.marker(latlng, { icon }).addTo(map);
 */

export interface NetworkIconDef {
  /** Chemin vers le fichier SVG dans public/icons/network/ */
  file: string;
  /** Taille d'affichage [largeur, hauteur] en pixels */
  size: [number, number];
  /** Point d'ancrage [x, y] (centre par défaut = [size/2, size/2]) */
  anchor?: [number, number];
  /** Tooltip de légende */
  label: string;
}

/** Table de correspondance slug → icône réseau */
export const NETWORK_ICON_MAP: Record<string, NetworkIconDef> = {
  // ── Poteaux ─────────────────────────────────────────────────────────────
  'poteau-hta': {
    file: 'icons/network/poteau-hta.svg',
    size: [28, 28],
    label: 'Poteau HTA',
  },
  'poteau-bt': {
    file: 'icons/network/poteau-bt.svg',
    size: [26, 26],
    label: 'Poteau BT',
  },

  // ── Postes ──────────────────────────────────────────────────────────────
  'poste-source': {
    file: 'icons/network/poste-source.svg',
    size: [36, 36],
    label: 'Poste source',
  },
  'poste-cabine': {
    file: 'icons/network/poste-cabine.svg',
    size: [32, 32],
    label: 'Poste cabine',
  },
  'poste-sur-poteau': {
    file: 'icons/network/transfo-poteau.svg',
    size: [28, 28],
    label: 'Poste sur poteau',
  },
  'transfo-poteau': {
    file: 'icons/network/transfo-poteau.svg',
    size: [28, 28],
    label: 'Transformateur sur poteau',
  },
  'transfo-ht-bt': {
    file: 'icons/network/transfo-poteau.svg',
    size: [28, 28],
    label: 'Transformateur HT/BT',
  },

  // ── Départs ─────────────────────────────────────────────────────────────
  'depart': {
    file: 'icons/network/depart-hta.svg',
    size: [24, 24],
    label: 'Départ HTA',
  },
  'depart-hta': {
    file: 'icons/network/depart-hta.svg',
    size: [24, 24],
    label: 'Départ HTA',
  },
  'depart-bt': {
    file: 'icons/network/depart-bt.svg',
    size: [24, 24],
    label: 'Départ BT',
  },

  // ── Clients ─────────────────────────────────────────────────────────────
  'point-raccordement': {
    file: 'icons/network/point-raccordement.svg',
    size: [28, 28],
    label: 'Point de raccordement',
  },
  'abonne': {
    file: 'icons/network/abonne.svg',
    size: [26, 26],
    label: 'Abonné',
  },
  'branchement': {
    file: 'icons/network/point-raccordement.svg',
    size: [24, 24],
    label: 'Branchement',
  },

  // ── Appareillage ────────────────────────────────────────────────────────
  'coupure': {
    file: 'icons/network/coupure.svg',
    size: [26, 26],
    label: 'Coupure / Interrupteur',
  },
};

/** Résout le slug vers une définition d'icône.
 *  Supporte les slugs longs (ex. "structurejunction-electricmediumvoltagepole-poteau-hta")
 *  en cherchant la correspondance la plus longue dans NETWORK_ICON_MAP. */
export function resolveNetworkIcon(slug: string): NetworkIconDef | null {
  if (!slug) return null;
  const s = slug.toLowerCase();

  // Correspondance directe
  if (NETWORK_ICON_MAP[s]) return NETWORK_ICON_MAP[s];

  // Recherche par suffixe (slug long ArcGIS → slug court)
  const keys = Object.keys(NETWORK_ICON_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (s.includes(key)) return NETWORK_ICON_MAP[key];
  }

  return null;
}

/**
 * Crée une icône Leaflet pour un slug de couche réseau.
 * @param L      Instance Leaflet (import dynamique)
 * @param slug   Slug de la couche (ex. "poteau-hta")
 * @param size   Taille forcée (optionnel, écrase NetworkIconDef.size)
 */
export function createNetworkLeafletIcon(
  L: { icon: (opts: object) => unknown },
  slug: string,
  size?: [number, number],
): unknown | null {
  const def = resolveNetworkIcon(slug);
  if (!def) return null;
  const [w, h] = size ?? def.size;
  return L.icon({
    iconUrl: def.file,
    iconSize: [w, h],
    iconAnchor: def.anchor ?? [w / 2, h / 2],
    popupAnchor: [0, -(h / 2)],
    className: `network-icon network-icon--${slug.replace(/[^a-z0-9]/g, '-')}`,
  });
}
