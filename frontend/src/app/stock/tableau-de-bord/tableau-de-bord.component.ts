import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { AuthService } from '../../../services/auth.service';
import { GisApiService } from '../../../services/gis-api.service';
import { environment } from '@environments/environment';
import { forkJoin, of } from 'rxjs';
import { createNetworkLeafletIcon } from '../../shared/network-icons';
import { map, catchError, switchMap } from 'rxjs/operators';

export interface StatCard {
	label: string;
	value: number;
	color: string;
	subtitle: string;
	icon: string;
	/** Slug de la table GIS (script_bd API) pour charger le count */
	apiSlug?: string;
}

/** Palette de couleurs distinctes : une couleur par ouvrage (ordre fixe) */
const MAP_COLORS = [
	'#ec4899', '#38bdf8', '#22c55e', '#a855f7', '#f97316', '#eab308', '#ef4444', '#3b82f6',
	'#d97706', '#14b8a6', '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9',
	'#10b981', '#6366f1', '#f59e0b', '#fb923c', '#4ade80', '#2dd4bf', '#c084fc', '#f472b6',
	'#60a5fa', '#34d399', '#a3e635', '#fbbf24', '#fb7185', '#818cf8', '#38bdf8', '#22d3ee',
	'#a78bfa', '#f87171', '#52b788', '#e63946', '#457b9d', '#1d3557', '#9d4edd', '#7b2cbf'
];

// Alias frontend dashboard (slug KPI) -> slug réel des couches chargées sur la carte.
const DASHBOARD_SLUG_ALIASES: Record<string, string> = {
	'structurejunction-electricmediumvoltagepole-poteau-hta': 'poteau-hta',
	'structurejunction-electriclowvoltagepole-poteau-bt': 'poteau-bt',
	'electricdevice-lowvoltagecontrolunit-tur': 'tur',
	'electricdevice-lowvoltagenetworkprotection-disjoncteur': 'tur',
	'electricjunction-lowvoltageconnection-point-noeud-bt': 'point-connecte',
	'electricdevice-ground-terre': 'point-raccordement',
	'electricdevice-mediumvoltageswitch-cellule-ocr': 'ocr',
	'electricdevice-mediumvoltagetransformer-transfo-ht-bt': 'transfo-ht-bt',
	'electricdevice-highvoltagetransformer-transfo-ps': 'transformateur-ps',
	'electricdevice-mediumvoltagearrester-parafoudre': 'parafoudre',
	'electricline-lowvoltageundergroundconductor-ligne-bt-souterrain': 'ligne-bt',
	'electricline-lowvoltageoverheadconductor-ligne-bt-aerien': 'ligne-bt',
	'electricjunction-lowvoltagelineend-findeligne': 'point-non-connecte',
	'electricline-mediumvoltageundergroundconductor-ligne-hta-souter': 'ligne-hta',
	'electricline-mediumvoltageoverheadconductor-ligne-hta-aerien': 'ligne-hta',
	'structureboundary-electricsubstationboundary-limite-poste-sourc': 'poste-source',
	'structueboundary-electricdistributionstationboundary-limite-po': 'poste-cabine',
	'structurejunction-electricjunctionbox-coffret': 'coffret',
	'subscriberform-abonne': 'abonne',
	'meters-compteur': 'compteur',
	'distributionpanel-branchement': 'branchement',
	'electricline-lowvoltageservice-ligne-branchement-bt': 'ligne-brcht'
};

const NON_SPATIAL_KPI_SLUGS = new Set([
	'subscriberform-abonne',
	'meters-compteur',
	'distributionpanel-branchement'
]);

@Component({
	selector: 'app-tableau-de-bord',
	standalone: true,
	imports: [CommonModule, FormsModule, ChartModule, DatePickerModule, Select],
	providers: [AuthService],
	templateUrl: './tableau-de-bord.component.html',
	styleUrls: ['./tableau-de-bord.component.scss']
})
export class TableauDeBord implements OnInit, AfterViewInit, OnDestroy {
	selectedDate: Date | null = null;
	selectedUser: { name: string; id: string } | null = null;
	filtersCollapsed = true;
	dateFilterOpen = true;
	userFilterOpen = false;
	users = [
		{ name: 'Aucun', id: 'none' }
	];

	// Données des cartes (réseau électrique) – apiSlug = table GIS (script_bd)
	cardsRow1: StatCard[] = [
		{ label: 'Poteau HTA', value: 0, color: '#ec4899', subtitle: 'Poteau moyenne tension', icon: 'fa fa-bolt', apiSlug: 'structurejunction-electricmediumvoltagepole-poteau-hta' },
		{ label: 'Poteau BT', value: 0, color: '#38bdf8', subtitle: 'Poteau basse tension', icon: 'fa fa-bolt', apiSlug: 'structurejunction-electriclowvoltagepole-poteau-bt' },
		{ label: 'Nœud HTA', value: 0, color: '#a855f7', subtitle: 'Point de connexion moyenne tension', icon: 'fa fa-crosshairs' },
		{ label: 'Point de Connection BT', value: 0, color: '#22c55e', subtitle: 'Point de connexion basse tension', icon: 'fa fa-link', apiSlug: 'electricjunction-lowvoltageconnection-point-noeud-bt' },
		{ label: 'TUR', value: 0, color: '#a855f7', subtitle: 'Unité de commande basse tension', icon: 'fa fa-square', apiSlug: 'electricdevice-lowvoltagecontrolunit-tur' },
		{ label: 'Connecteur', value: 0, color: '#22c55e', subtitle: 'Accessoire de mise à la terre', icon: 'fa fa-anchor', apiSlug: 'electricdevice-ground-terre' },
		{ label: 'Disjoncteur DLBT', value: 0, color: '#f97316', subtitle: 'Protection réseau basse tension', icon: 'fa fa-shield', apiSlug: 'electricdevice-lowvoltagenetworkprotection-disjoncteur' },
		{ label: 'Parafoudre HTA', value: 0, color: '#a855f7', subtitle: 'Parafoudre moyenne tension', icon: 'fa fa-minus', apiSlug: 'electricdevice-mediumvoltagearrester-parafoudre' },
		{ label: 'Transformateur HTA/BT', value: 0, color: '#f97316', subtitle: 'Transformateur haute/moyenne tension', icon: 'fa fa-cog', apiSlug: 'electricdevice-highvoltagetransformer-transfo-ps' },
		{ label: 'Borne Souterraine', value: 0, color: '#22c55e', subtitle: 'Borne souterraine', icon: 'fa fa-square-o' },
		{ label: 'Interrupteur HTA', value: 0, color: '#38bdf8', subtitle: 'Interrupteur moyenne tension', icon: 'fa fa-square', apiSlug: 'electricdevice-mediumvoltageswitch-cellule-ocr' },
		{ label: 'Transformateur BT/BT', value: 0, color: '#d97706', subtitle: 'Transformateur moyenne/basse tension', icon: 'fa fa-cog', apiSlug: 'electricdevice-mediumvoltagetransformer-transfo-ht-bt' }
	];

	cardsRow2: StatCard[] = [
		{ label: 'Ligne de départ HTA', value: 0, color: '#f97316', subtitle: 'Départ moyenne tension', icon: 'fa fa-bolt' },
		{ label: 'Ligne BT Aérienne', value: 0, color: '#ef4444', subtitle: 'Conducteur aérien basse tension', icon: 'fa fa-level-up', apiSlug: 'electricline-lowvoltageoverheadconductor-ligne-bt-aerien' },
		{ label: 'Ligne BT Souterraine', value: 0, color: '#22c55e', subtitle: 'Conducteur souterrain basse tension', icon: 'fa fa-minus', apiSlug: 'electricline-lowvoltageundergroundconductor-ligne-bt-souterrain' },
		{ label: 'Ligne HTA Souterraine', value: 0, color: '#a855f7', subtitle: 'Conducteur souterrain moyenne tension', icon: 'fa fa-circle-o', apiSlug: 'electricline-mediumvoltageundergroundconductor-ligne-hta-souter' },
		{ label: 'Ligne HTA Aérienne', value: 0, color: '#ef4444', subtitle: 'Conducteur aérien moyenne tension', icon: 'fa fa-level-up', apiSlug: 'electricline-mediumvoltageoverheadconductor-ligne-hta-aerien' },
		{ label: 'Ligne de départ BT', value: 0, color: '#eab308', subtitle: 'Départ basse tension', icon: 'fa fa-arrows-v', apiSlug: 'electricline-lowvoltageservice-ligne-branchement-bt' },
		{ label: 'Limite du poste HTA', value: 0, color: '#3b82f6', subtitle: 'Limite du poste source', icon: 'fa fa-th-large', apiSlug: 'structureboundary-electricsubstationboundary-limite-poste-sourc' },
		{ label: 'Limite du poste BT', value: 0, color: '#a855f7', subtitle: 'Limite du poste de distribution', icon: 'fa fa-th', apiSlug: 'structueboundary-electricdistributionstationboundary-limite-po' },
		{ label: 'Accessoires HTA', value: 0, color: '#ef4444', subtitle: 'Accessoire moyenne tension', icon: 'fa fa-plus' },
		{ label: 'Boîte de jonction BT', value: 0, color: '#3b82f6', subtitle: 'Boîte de jonction électrique', icon: 'fa fa-bolt', apiSlug: 'structurejunction-electricjunctionbox-coffret' },
		{ label: 'Fin de la ligne BT', value: 0, color: '#22c55e', subtitle: 'Extrémité de ligne basse tension', icon: 'fa fa-minus', apiSlug: 'electricjunction-lowvoltagelineend-findeligne' },
		{ label: 'Connecteur BT', value: 0, color: '#3b82f6', subtitle: 'Accessoire basse tension', icon: 'fa fa-anchor' }
	];

	cardsRow3: StatCard[] = [
		{ label: 'Abonné', value: 0, color: '#eab308', subtitle: 'Client raccordé', icon: 'fa fa-user', apiSlug: 'subscriberform-abonne' },
		{ label: 'Compteur', value: 0, color: '#38bdf8', subtitle: 'Compteur client', icon: 'fa fa-tachometer', apiSlug: 'meters-compteur' },
		{ label: 'Branchement', value: 0, color: '#eab308', subtitle: 'Tableau de distribution', icon: 'fa fa-home', apiSlug: 'distributionpanel-branchement' }
	];
	extraCards: StatCard[] = [];

	// Graphique Nature Client
	natureClientData: any;
	natureClientOptions: any;
	/** Total affiché sous le titre (somme des valeurs du graphique) */
	natureClientTotal: number | null = null;

	loading = false;
	errorApi: string | null = null;
	gisApiUrl = environment.gisApiUrl ?? 'http://localhost:8000';
	mapLoading = false;

	@ViewChild('mapLeaflet') mapContainer!: ElementRef<HTMLDivElement>;
	private map: unknown = null;
	private layerGroup: unknown = null;

	/** Symbologie par ouvrage (slug) : libellé + couleur pour la légende et les couches */
	private slugToSymbology: Record<string, { label: string; color: string }> = {};
	/** Légende de la carte : une entrée par couche affichée */
	mapLegendItems: { slug: string; label: string; color: string; isLine: boolean; visible: boolean }[] = [];
	/** Groupe Leaflet par slug (pour afficher/masquer) */
	private slugToLayerGroups = new Map<string, unknown>();
	/** Lignes brutes chargées par slug pour les calculs relationnels sans géométrie propre. */
	private rowsBySlug = new Map<string, Record<string, unknown>[]>();
	/** Légende repliée (réduite) */
	legendCollapsed = false;
	/** Totaux globaux par slug (API) pour les indicateurs sans couche visible sur la carte */
	private globalCountsBySlug = new Map<string, number>();
	/** Étendue initiale de la carte (pour le bouton « Réinitialiser ») */
	private initialMapBounds: unknown = null;
	/** Ignorer le prochain moveend (après un reset) pour ne pas réécraser les totaux globaux */
	private ignoreNextMoveend = false;
	private mapViewportListenersBound = false;
	private kpiRefreshTimer: ReturnType<typeof setInterval> | null = null;
	private readonly debugKpi = true;
	private readonly onMapViewportChanged = () => this.zone.run(() => {
		this.logDebug('event: map viewport changed');
		this.updateVisibleIndicators();
	});

	constructor(private gisApi: GisApiService, private cdr: ChangeDetectorRef, private zone: NgZone) {}

	ngOnInit(): void {
		this.initNatureClientChart();
		this.initializeDashboardCards();
	}

	private getAllCards(): StatCard[] {
		return [...this.cardsRow1, ...this.cardsRow2, ...this.cardsRow3, ...this.extraCards];
	}

	private getResolvedSlug(slug: string | undefined): string | undefined {
		if (!slug) return undefined;
		return DASHBOARD_SLUG_ALIASES[slug] ?? slug;
	}

	private applyCardSymbology(): void {
		this.slugToSymbology = {};
		const cardsWithSlug = this.getAllCards().filter((c) => c.apiSlug);
		cardsWithSlug.forEach((c, i) => {
			const color = MAP_COLORS[i % MAP_COLORS.length];
			const resolvedSlug = this.getResolvedSlug(c.apiSlug);
			if (c.apiSlug) this.slugToSymbology[c.apiSlug] = { label: c.label, color };
			if (resolvedSlug) this.slugToSymbology[resolvedSlug] = { label: c.label, color };
			c.color = color;
		});
	}

	private isDashboardOuvrageTable(slug: string, table: string): boolean {
		const s = (slug || '').toLowerCase();
		const t = (table || '').toLowerCase();
		if (!s) return false;
		if (s.startsWith('l-')) return false;
		if (['spatial-ref-sys', 'topology', 'network-rules'].includes(s)) return false;
		if (s.includes('layer-lock')) return false;
		if (t.includes('spatial_ref_sys')) return false;
		return true;
	}

	private iconForSlug(slug: string): string {
		const s = (slug || '').toLowerCase();
		if (s.includes('abonne')) return 'fa fa-user';
		if (s.includes('compteur')) return 'fa fa-tachometer';
		if (s.includes('branchement')) return 'fa fa-home';
		if (s.includes('poteau')) return 'fa fa-bolt';
		if (s.includes('ligne')) return 'fa fa-share-alt';
		if (s.includes('poste')) return 'fa fa-th-large';
		if (s.includes('transfo') || s.includes('transformateur')) return 'fa fa-cog';
		if (s.includes('coffret')) return 'fa fa-bolt';
		if (s.includes('point') || s.includes('jonction')) return 'fa fa-link';
		if (s.includes('cellule') || s.includes('ocr')) return 'fa fa-square';
		if (s.includes('parafoudre')) return 'fa fa-minus';
		return 'fa fa-circle';
	}

	private subtitleForSlug(slug: string): string {
		const s = (slug || '').toLowerCase();
		if (s.includes('ligne')) return 'Ouvrage linéaire';
		if (s.includes('poste')) return 'Ouvrage poste';
		if (s.includes('abonne') || s.includes('compteur') || s.includes('branchement')) return 'Ouvrage client';
		return 'Ouvrage réseau';
	}

	private initializeDashboardCards(): void {
		const coveredResolvedSlugs = new Set(
			[...this.cardsRow1, ...this.cardsRow2, ...this.cardsRow3]
				.map((card) => this.getResolvedSlug(card.apiSlug))
				.filter((slug): slug is string => !!slug)
		);
		this.gisApi.getTables().subscribe({
			next: (tables) => {
				this.extraCards = tables
					.filter((t) => this.isDashboardOuvrageTable(t.slug, t.table))
					.filter((t) => !coveredResolvedSlugs.has(t.slug))
					.map((t) => ({
						label: this.formatOuvrageLabel(t.table || t.slug),
						value: 0,
						color: '#64748b',
						subtitle: this.subtitleForSlug(t.slug),
						icon: this.iconForSlug(t.slug),
						apiSlug: t.slug
					}));
				this.applyCardSymbology();
				this.loadGisCounts();
			},
			error: () => {
				this.applyCardSymbology();
				this.loadGisCounts();
			}
		});
	}

	/** Libellé affiché pour un ouvrage quand il n'est pas dans les cartes */
	private formatOuvrageLabel(slugOrTable: string): string {
		return slugOrTable
			.replace(/-/g, ' ')
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	/** Contenu HTML de la popup pour un ouvrage (propriétés de l'entité) */
	buildPopupContent(props: Record<string, unknown>): string {
		if (!props || typeof props !== 'object') return '';
		const { _layerLabel, _layerSlug, geom, Geom, ...rest } = props;
		const title = _layerLabel != null ? String(_layerLabel) : '';
		const entries = Object.entries(rest)
			.filter(([, v]) => v != null && v !== '')
			.map(([k, v]) => ({
				key: this.formatPopupKey(k),
				val: typeof v === 'object' && (v as { toISOString?: () => string })?.toISOString
					? (v as { toISOString: () => string }).toISOString().slice(0, 10)
					: String(v).length > 80 ? String(v).slice(0, 77) + '…' : String(v)
			}));
		let html = '<div class="map-popup">';
		if (title) html += `<div class="map-popup-header"><i class="fa fa-info-circle map-popup-icon"></i><span>${this.escapeHtml(title)}</span></div>`;
		html += '<div class="map-popup-body">';
		entries.forEach((e, i) => {
			html += `<div class="map-popup-row ${i % 2 === 0 ? 'map-popup-row--even' : ''}"><span class="map-popup-key">${this.escapeHtml(e.key)}</span><span class="map-popup-val">${this.escapeHtml(e.val)}</span></div>`;
		});
		html += '</div></div>';
		return html;
	}

	/** Libellé lisible pour une clé (snake_case → mots, champs courants en français) */
	private formatPopupKey(key: string): string {
		const labels: Record<string, string> = {
			id: 'ID', objectid: 'Identifiant objet', globalid: 'Identifiant global',
			created_date: 'Date de création', last_edited_date: 'Dernière modification',
			created_user: 'Créé par', last_edited_user: 'Modifié par',
			username: 'Utilisateur', validator: 'Validateur',
			assetgroup: 'Groupe', assetid: 'Identifiant actif', assettype: 'Type d’actif',
			lifecyclestatus: 'Statut', notes: 'Notes',
			shape_length: 'Longueur (m)', nominalvoltage: 'Tension nominale',
			installdate: 'Date d’installation', section: 'Section'
		};
		const lower = key.toLowerCase();
		if (labels[lower]) return labels[lower];
		return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	private escapeHtml(s: string): string {
		const div = document.createElement('div');
		div.textContent = s;
		return div.innerHTML;
	}

	ngAfterViewInit(): void {
		this.initMap();
	}

	ngOnDestroy(): void {
		const m = this.map as { off?: (ev: string, fn: () => void) => void } | null;
		if (m?.off && this.mapViewportListenersBound) {
			m.off('moveend', this.onMapViewportChanged);
			m.off('zoomend', this.onMapViewportChanged);
			m.off('move', this.onMapViewportChanged);
			m.off('zoom', this.onMapViewportChanged);
			m.off('dragend', this.onMapViewportChanged);
		}
		if (this.kpiRefreshTimer) {
			clearInterval(this.kpiRefreshTimer);
			this.kpiRefreshTimer = null;
		}
		if (this.map && typeof (this.map as { remove?: () => void }).remove === 'function') {
			(this.map as { remove: () => void }).remove();
			this.map = null;
		}
	}

	private initMap(): void {
		if (!this.mapContainer?.nativeElement) return;
		// Import dynamique pour éviter les erreurs de résolution au build
		import('leaflet').then((L: { default: unknown }) => {
			const leaflet = L.default as {
				map: (el: HTMLElement, opts: object) => { addTo: (m: unknown) => unknown; invalidateSize?: () => void };
				tileLayer: (url: string, opts: object) => { addTo: (m: unknown) => unknown };
				control: { zoom: (opts: object) => { addTo: (m: unknown) => unknown } };
				layerGroup: () => { addTo: (m: unknown) => unknown };
			};
			this.map = leaflet.map(this.mapContainer.nativeElement, {
				center: [12.0, -1.7],
				zoom: 12,
				zoomControl: false
			});
			leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '© OpenStreetMap'
			}).addTo(this.map);
			leaflet.control.zoom({ position: 'bottomright' }).addTo(this.map);
			this.layerGroup = leaflet.layerGroup().addTo(this.map);
			// Laisser le temps au conteneur d'avoir ses dimensions avant de charger les géométries
			setTimeout(() => this.loadGeometries(), 150);
		});
	}

	private loadGeometries(): void {
		if (!this.map || !this.layerGroup || !this.gisApi) return;
		this.mapLoading = true;
		// Récupérer toutes les tables exposées par l'API (avec colonne geom), puis charger les géométries de chacune
		this.gisApi.getTables().pipe(
			switchMap((tables) => {
				if (tables.length === 0) return of([]);
				this.logDebug('tables loaded', { count: tables.length, slugs: tables.map((t) => t.slug) });
				const cardCount = Object.keys(this.slugToSymbology).length;
				const unknownSlugs = tables.filter((t) => !this.slugToSymbology[t.slug]).map((t) => t.slug).sort();
				const slugToColor = new Map<string, string>();
				unknownSlugs.forEach((slug, j) => slugToColor.set(slug, MAP_COLORS[(cardCount + j) % MAP_COLORS.length]));
				const getColor = (slug: string) => this.slugToSymbology[slug]?.color ?? slugToColor.get(slug) ?? MAP_COLORS[0];
				const getLabel = (t: { slug: string; table: string }) => this.slugToSymbology[t.slug]?.label ?? this.formatOuvrageLabel(t.table || t.slug);
				const requests = tables.map((t) =>
					this.gisApi.getList(t.slug, 1000, 0).pipe(
						map((rows: Record<string, unknown>[]) => ({
							slug: t.slug,
							table: t.table,
							rows,
							color: getColor(t.slug),
							label: getLabel(t)
						})),
						catchError(() => of({
							slug: t.slug,
							table: t.table,
							rows: [] as Record<string, unknown>[],
							color: getColor(t.slug),
							label: getLabel(t)
						}))
					)
				);
				return forkJoin(requests);
			})
		).subscribe({
			next: (results) => {
					this.logDebug('geometries fetched', {
						layers: results.length,
						nonEmptyLayers: results.filter((r) => (r.rows?.length ?? 0) > 0).length,
						sample: results.slice(0, 10).map((r) => ({ slug: r.slug, rows: r.rows?.length ?? 0 }))
					});
					this.rowsBySlug = new Map(results.map((r) => [r.slug, r.rows ?? []]));
					Promise.all([
						import('leaflet'),
						import('wellknown').then((w) => w.default ?? w)
					]).then(([LModule, wellknown]) => {
						const leaflet = (LModule as { default: unknown }).default as {
							geoJSON: (f: object, opts: { style?: () => object; pointToLayer?: (f: unknown, latlng: unknown) => unknown; onEachFeature?: (f: { properties?: Record<string, unknown> }, layer: { bindPopup: (content: string) => void }) => void }) => { eachLayer: (fn: (layer: unknown) => void) => void };
							circleMarker: (latlng: unknown, opts: object) => unknown;
						};
						const group = this.layerGroup as { clearLayers: () => void; addLayer: (l: unknown) => void };
						group.clearLayers();
						let bounds: unknown = null;
						const wk = (wellknown as { parse?: (wkt: string) => unknown }).parse ?? (wellknown as { default?: { parse: (wkt: string) => unknown } }).default?.parse;
						const parseWkt = typeof wk === 'function' ? wk : ((): null => null);
						const normalizeWkt = (wkt: string): string => {
							let s = String(wkt).replace(/^SRID=\d+;/i, '').trim();
							// Réduire les géométries ZM/Z/M en 2D pour que wellknown puisse parser (Leaflet n'utilise que lon/lat)
							const hasZm = /\s+ZM\s*\(/i.test(s);
							const hasZ = /\s+Z\s*\(/i.test(s);
							s = s.replace(/\s+ZM\b/gi, '').replace(/\s+Z\b/gi, '').replace(/\s+M\b/gi, '');
							if (hasZm) {
								// Chaque sommet est (x y z m) -> garder (x y) ; \s* pour accepter ( ou , avant le premier nombre
								s = s.replace(/(\s*-?\d+\.?\d*\s+-?\d+\.?\d*)\s+-?\d+\.?\d*\s+-?\d+\.?\d*/g, '$1');
							} else if (hasZ) {
								// Chaque sommet est (x y z) -> garder (x y)
								s = s.replace(/(\s*-?\d+\.?\d*\s+-?\d+\.?\d*)\s+-?\d+\.?\d*/g, '$1');
							}
							return s;
						};
						const isLineTable = (s: string) => /ligne|electricline/.test(s);
						const sortedResults = [...results].sort((a, b) => (isLineTable(a.slug) === isLineTable(b.slug) ? 0 : isLineTable(a.slug) ? 1 : -1));
						const legendItems: { slug: string; label: string; color: string; isLine: boolean; visible: boolean }[] = [];
						for (const { slug, table, rows, color, label } of sortedResults) {
							const features: { type: 'Feature'; geometry: unknown; properties: object }[] = [];
							for (const row of rows || []) {
								const wktRaw = row['geom'] ?? row['Geom'];
								if (wktRaw == null || typeof wktRaw !== 'string') continue;
								const wkt = normalizeWkt(wktRaw);
								if (!wkt || /EMPTY\s*\)?\s*$/i.test(wkt)) continue;
								try {
									const geom = parseWkt(wkt);
									if (!geom || typeof geom !== 'object') continue;
									const { geom: _g, Geom: _G, ...rest } = row as Record<string, unknown>;
									const properties = { _layerLabel: label, _layerSlug: slug, ...rest };
									features.push({ type: 'Feature', geometry: geom, properties });
								} catch {
									// ignore invalid WKT
								}
							}
							if (features.length === 0) continue;
							const isLine = isLineTable(slug);
							legendItems.push({ slug, label: label ?? this.formatOuvrageLabel(table || slug), color, isLine, visible: true });
							const style = {
								color,
								weight: isLine ? 5 : 2,
								opacity: 0.9,
								fillColor: color,
								fillOpacity: 0.5
							};
							const featureCollection = { type: 'FeatureCollection' as const, features };
							const self = this;
							const slugGroup = (leaflet as { layerGroup?: () => { addLayer: (l: unknown) => void } }).layerGroup?.();
							const geoJsonLayer = leaflet.geoJSON(featureCollection, {
								style: () => style,
						pointToLayer: (_: unknown, latlng: unknown) => {
								const networkIcon = createNetworkLeafletIcon(
									(leaflet as unknown) as Parameters<typeof createNetworkLeafletIcon>[0],
									slug,
								);
								if (networkIcon) {
									return ((leaflet as unknown) as { marker: (latlng: unknown, opts: object) => unknown })
										.marker(latlng, { icon: networkIcon });
								}
								return leaflet.circleMarker(latlng, { ...style, radius: 8 });
							},
								onEachFeature: (feature: { properties?: Record<string, unknown> }, layer: { bindPopup: (content: string, opts?: { maxWidth?: number }) => void }) => {
									const props = feature.properties ?? {};
									layer.bindPopup(self.buildPopupContent(props), { maxWidth: 320 });
								}
							});
							if (slugGroup) {
								geoJsonLayer.eachLayer((l: unknown) => {
									(slugGroup as { addLayer: (l: unknown) => void }).addLayer(l);
									const withBounds = l as { getBounds?: () => unknown };
									if (withBounds.getBounds) {
										const b = withBounds.getBounds();
										if (bounds && typeof (bounds as { extend: (x: unknown) => unknown }).extend === 'function') {
											(bounds as { extend: (x: unknown) => unknown }).extend(b);
										} else {
											bounds = b;
										}
									}
								});
								(group as { addLayer: (l: unknown) => void }).addLayer(slugGroup);
								self.slugToLayerGroups.set(slug, slugGroup);
							} else {
								geoJsonLayer.eachLayer((l: unknown) => {
									group.addLayer(l);
									const withBounds = l as { getBounds?: () => unknown };
									if (withBounds.getBounds) {
										const b = withBounds.getBounds();
										if (bounds && typeof (bounds as { extend: (x: unknown) => unknown }).extend === 'function') {
											(bounds as { extend: (x: unknown) => unknown }).extend(b);
										} else {
											bounds = b;
										}
									}
								});
							}
						}
						this.logDebug('leaflet groups created', {
							groupCount: this.slugToLayerGroups.size,
							legendCount: legendItems.length,
							slugs: Array.from(this.slugToLayerGroups.keys())
						});
						const m = this.map as { fitBounds?: (b: unknown, opts: object) => void; invalidateSize?: () => void };
						if (m?.invalidateSize) m.invalidateSize();
						if (bounds && m?.fitBounds) {
							m.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
							this.initialMapBounds = bounds;
						}
						this.mapLegendItems = legendItems;
						this.cdr.markForCheck();
						this.mapLoading = false;
						// Mise à jour KPI selon l'emprise visible lors du zoom/déplacement.
						this.bindMapViewportListeners();
						this.updateVisibleIndicators();
					});
			},
			error: () => {
				this.mapLoading = false;
			}
		});
	}

	private bindMapViewportListeners(): void {
		const m = this.map as { on?: (ev: string, fn: () => void) => void; off?: (ev: string, fn: () => void) => void } | null;
		if (!m?.on) return;
		if (m.off && this.mapViewportListenersBound) {
			m.off('moveend', this.onMapViewportChanged);
			m.off('zoomend', this.onMapViewportChanged);
		}
		m.on('moveend', this.onMapViewportChanged);
		m.on('zoomend', this.onMapViewportChanged);
		m.on('move', this.onMapViewportChanged);
		m.on('zoom', this.onMapViewportChanged);
		m.on('dragend', this.onMapViewportChanged);
		this.mapViewportListenersBound = true;
		this.logDebug('listeners bound', { events: ['moveend', 'zoomend', 'move', 'zoom', 'dragend'] });
		this.startKpiRefreshLoop();
	}

	private startKpiRefreshLoop(): void {
		if (this.kpiRefreshTimer) clearInterval(this.kpiRefreshTimer);
		this.kpiRefreshTimer = setInterval(() => {
			this.zone.run(() => this.updateVisibleIndicators());
		}, 1200);
	}

	/** Affiche ou masque la couche d'un type d'ouvrage (légende) */
	toggleOuvrageVisibility(slug: string): void {
		const item = this.mapLegendItems.find((i) => i.slug === slug);
		const slugGroup = this.slugToLayerGroups.get(slug);
		const mainGroup = this.layerGroup as { addLayer: (l: unknown) => void; removeLayer: (l: unknown) => void } | null;
		if (!item || !slugGroup || !mainGroup) return;
		item.visible = !item.visible;
		if (item.visible) {
			mainGroup.addLayer(slugGroup);
		} else {
			mainGroup.removeLayer(slugGroup);
		}
		this.cdr.detectChanges();
	}

	/** Ramène la carte à l'état par défaut : étendue initiale + totaux globaux */
	resetMapToDefault(): void {
		this.ignoreNextMoveend = true; // fitBounds déclenche moveend : ne pas réécraser les totaux
		const m = this.map as { fitBounds?: (b: unknown, opts: object) => void } | null;
		if (this.initialMapBounds && m?.fitBounds) {
			m.fitBounds(this.initialMapBounds, { padding: [20, 20], maxZoom: 16 });
		}
		const allCards = [...this.cardsRow1, ...this.cardsRow2, ...this.cardsRow3];
		allCards.forEach((card) => {
			if (card.apiSlug != null) card.value = this.globalCountsBySlug.get(card.apiSlug) ?? card.value;
		});
		this.cdr.markForCheck();
	}

	toggleFiltersPanel(): void {
		this.filtersCollapsed = !this.filtersCollapsed;
		if (this.filtersCollapsed) {
			this.dateFilterOpen = false;
			this.userFilterOpen = false;
		} else {
			this.dateFilterOpen = true;
		}
	}

	toggleDateFilter(): void {
		this.dateFilterOpen = !this.dateFilterOpen;
		if (this.dateFilterOpen) this.userFilterOpen = false;
	}

	toggleUserFilter(): void {
		this.userFilterOpen = !this.userFilterOpen;
		if (this.userFilterOpen) this.dateFilterOpen = false;
	}

	/** Récupère toutes les couches « feuille » (pas les groupes) du groupe donné */
	private getLeafLayers(layers: unknown[]): unknown[] {
		const out: unknown[] = [];
		for (const layer of layers) {
			const L = layer as { getLayers?: () => unknown[] };
			if (typeof L.getLayers === 'function') {
				out.push(...this.getLeafLayers(L.getLayers()));
			} else {
				out.push(layer);
			}
		}
		return out;
	}

	private getVisibleCountForCardSlug(cardSlug: string, counts: Map<string, number>): number {
		const realSlug = DASHBOARD_SLUG_ALIASES[cardSlug];
		if (realSlug) {
			return counts.get(realSlug) ?? counts.get(cardSlug) ?? 0;
		}
		return counts.get(cardSlug) ?? 0;
	}

	private toCanonId(value: unknown): string {
		return String(value ?? '').trim().toLowerCase();
	}

	/** Compte les ouvrages visibles dans la zone affichée et met à jour les indicateurs (cartes) */
	private updateVisibleIndicators(): void {
		if (this.ignoreNextMoveend) {
			this.ignoreNextMoveend = false;
			this.logDebug('update skipped (ignoreNextMoveend)');
			return;
		}
		const map = this.map as { getBounds?: () => { contains: (l: unknown) => boolean; intersects: (b: unknown) => boolean } } | null;
		if (!map?.getBounds) {
			this.logDebug('update skipped (map bounds unavailable)');
			return;
		}
		const bounds = map.getBounds();
		const counts = new Map<string, number>();
		const visibleGidsBySlug = new Map<string, Set<string>>();

		const mainGroup = this.layerGroup as { hasLayer?: (l: unknown) => boolean } | null;

		// Comptage robuste: on parcourt les couches par slug (même si feature.properties est absent).
		for (const [slug, slugGroup] of this.slugToLayerGroups.entries()) {
			// Ne compter que les couches actuellement visibles sur la carte.
			if (mainGroup?.hasLayer && !mainGroup.hasLayer(slugGroup)) {
				counts.set(slug, 0);
				continue;
			}
			const groupLayers = this.getLeafLayers(
				((slugGroup as { getLayers?: () => unknown[] }).getLayers?.() ?? []) as unknown[]
			);
			let visibleCount = 0;
			const visibleGids = new Set<string>();
			for (const layer of groupLayers) {
				const L = layer as {
					feature?: { properties?: Record<string, unknown> };
					getLatLng?: () => unknown;
					getBounds?: () => unknown;
				};
				const gid = this.toCanonId(L.feature?.properties?.['gid']);
				if (typeof L.getLatLng === 'function') {
					const latlng = L.getLatLng();
					if (latlng != null && typeof bounds.contains === 'function' && bounds.contains(latlng)) {
						visibleCount += 1;
						if (gid) visibleGids.add(gid);
					}
				} else if (typeof L.getBounds === 'function') {
					const layerBounds = L.getBounds();
					const layerCenter = (layerBounds as { getCenter?: () => unknown })?.getCenter?.();
					if (layerCenter != null && typeof bounds.contains === 'function' && bounds.contains(layerCenter)) {
						visibleCount += 1;
						if (gid) visibleGids.add(gid);
					}
				}
			}
			counts.set(slug, visibleCount);
			visibleGidsBySlug.set(slug, visibleGids);
		}

		// KPI sans géométrie propre: remonter via les relations métier visibles à l'écran.
		const visiblePointRaccordementIds = new Set<string>([
			...(visibleGidsBySlug.get('point-raccordement') ?? new Set<string>()),
			...(visibleGidsBySlug.get('point-connecte') ?? new Set<string>())
		]);
		const branchementRows = this.rowsBySlug.get('branchement') ?? [];
		const visibleBranchementIds = new Set<string>();
		for (const row of branchementRows) {
			const gid = this.toCanonId(row['gid']);
			const pointId = this.toCanonId(row['id_point_raccordement']);
			if (!gid) continue;
			if (visiblePointRaccordementIds.has(pointId)) {
				visibleBranchementIds.add(gid);
			}
		}
		counts.set('branchement', visibleBranchementIds.size);

		const compteurRows = this.rowsBySlug.get('compteur') ?? [];
		const visibleCompteurIds = new Set<string>();
		for (const row of compteurRows) {
			const gid = this.toCanonId(row['gid']);
			const branchementId = this.toCanonId(row['id_branchement']);
			if (!gid) continue;
			if (visibleBranchementIds.has(branchementId)) {
				visibleCompteurIds.add(gid);
			}
		}
		counts.set('compteur', visibleCompteurIds.size);

		const abonneRows = this.rowsBySlug.get('abonne') ?? [];
		const visibleAbonneIds = new Set<string>();
		for (const row of abonneRows) {
			const gid = this.toCanonId(row['gid']);
			const compteurId = this.toCanonId(row['id_compteur']);
			if (!gid) continue;
			if (visibleCompteurIds.has(compteurId)) {
				visibleAbonneIds.add(gid);
			}
		}
		counts.set('abonne', visibleAbonneIds.size);

		const allCards = [...this.cardsRow1, ...this.cardsRow2, ...this.cardsRow3];
		allCards.forEach((card) => {
			if (card.apiSlug == null) return;
			if (NON_SPATIAL_KPI_SLUGS.has(card.apiSlug)) {
				card.value = this.globalCountsBySlug.get(card.apiSlug) ?? 0;
				return;
			}
			// KPI = uniquement les ouvrages visibles dans l'emprise courante,
			// avec résolution alias KPI -> slug réel de la couche carto.
			card.value = this.getVisibleCountForCardSlug(card.apiSlug, counts);
		});
		this.logDebug('kpi visible counts updated', {
			trackedSlugs: Array.from(this.slugToLayerGroups.keys()).length,
			counts: Array.from(counts.entries()).slice(0, 25),
			kpis: allCards
				.filter((c) => !!c.apiSlug)
				.slice(0, 25)
				.map((c) => ({ label: c.label, slug: c.apiSlug, value: c.value }))
		});
		this.cdr.markForCheck();
	}

	private logDebug(message: string, payload?: unknown): void {
		if (!this.debugKpi) return;
		if (payload !== undefined) {
			console.log(`[TableauDeBord] ${message}`, payload);
			return;
		}
		console.log(`[TableauDeBord] ${message}`);
	}

	/** Charge les comptes depuis l'API GIS (script_bd) et met à jour les cartes */
	loadGisCounts(): void {
		const allCards = this.getAllCards();
		const slugs = allCards.map((c) => c.apiSlug).filter((s): s is string => !!s);
		if (slugs.length === 0) return;

		this.loading = true;
		this.errorApi = null;
		this.gisApi.getCounts(slugs).subscribe({
			next: (counts) => {
				this.globalCountsBySlug = new Map(counts);
				allCards.forEach((card) => {
					if (card.apiSlug != null) {
						card.value = counts.get(card.apiSlug) ?? 0;
					}
				});
				this.updateNatureClientChartFromCounts(counts);
				this.loading = false;
			},
			error: (err) => {
				this.errorApi = err?.message || 'Erreur chargement API GIS';
				this.loading = false;
			}
		});
	}

	initNatureClientChart(): void {
		const totalAbonnes = 0;
		this.natureClientData = {
			labels: ['Abonnés'],
			datasets: [
				{
					label: 'Nombre de clients',
					backgroundColor: ['#22c55e'],
					borderColor: ['#16a34a'],
					borderWidth: 1,
					borderRadius: 6,
					data: [totalAbonnes]
				}
			]
		};
		this.natureClientTotal = totalAbonnes;

		this.natureClientOptions = {
			indexAxis: 'y',
			maintainAspectRatio: false,
			layout: { padding: { top: 8, right: 12, bottom: 8, left: 4 } },
			plugins: {
				legend: { display: false },
				tooltip: {
					backgroundColor: 'rgba(15, 23, 42, 0.95)',
					titleColor: '#facc15',
					bodyColor: '#e2e8f0',
					borderColor: 'rgba(255, 255, 255, 0.1)',
					borderWidth: 1,
					padding: 10,
					cornerRadius: 8
				}
			},
			scales: {
				x: {
					title: {
						display: true,
						text: 'Nombre de clients',
						color: '#94a3b8',
						font: { size: 11, weight: '500' }
					},
					min: 0,
					max: 10,
					ticks: {
						stepSize: 1,
						color: '#64748b',
						font: { size: 10 }
					},
					grid: { color: 'rgba(255, 255, 255, 0.06)' }
				},
				y: {
					ticks: {
						color: '#e2e8f0',
						font: { size: 11 }
					},
					grid: { display: false }
				}
			}
		};
	}

	private updateNatureClientChartFromCounts(counts: Map<string, number>): void {
		const totalAbonnes = counts.get('subscriberform-abonne') ?? 0;
		this.natureClientData = {
			labels: ['Abonnés'],
			datasets: [
				{
					label: 'Nombre de clients',
					backgroundColor: ['#22c55e'],
					borderColor: ['#16a34a'],
					borderWidth: 1,
					borderRadius: 6,
					data: [totalAbonnes]
				}
			]
		};
		this.natureClientTotal = totalAbonnes;
		const maxAxis = Math.max(10, Math.ceil(totalAbonnes * 1.15));
		this.natureClientOptions = {
			...this.natureClientOptions,
			scales: {
				...this.natureClientOptions?.scales,
				x: {
					...this.natureClientOptions?.scales?.x,
					max: maxAxis,
					ticks: {
						...this.natureClientOptions?.scales?.x?.ticks,
						stepSize: Math.max(1, Math.ceil(maxAxis / 10))
					}
				}
			}
		};
	}
}
