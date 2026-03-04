import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { AuthService } from '../../../services/auth.service';
import { GisApiService } from '../../../services/gis-api.service';
import { environment } from '@environments/environment';
import { forkJoin, of } from 'rxjs';
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
	users = [
		{ name: 'Aucun', id: 'none' }
	];

	// Données des cartes (réseau électrique) – apiSlug = table GIS (script_bd)
	cardsRow1: StatCard[] = [
		{ label: 'Poteau HTA', value: 0, color: '#ec4899', subtitle: 'Electric Medium Voltage Pole', icon: 'fa fa-bolt', apiSlug: 'structurejunction-electricmediumvoltagepole-poteau-hta' },
		{ label: 'Poteau BT', value: 0, color: '#38bdf8', subtitle: 'Electric Low Voltage Pole', icon: 'fa fa-bolt', apiSlug: 'structurejunction-electriclowvoltagepole-poteau-bt' },
		{ label: 'Nœud HTA', value: 0, color: '#a855f7', subtitle: 'Medium Voltage Connection Point', icon: 'fa fa-crosshairs' },
		{ label: 'Point de Connection BT', value: 0, color: '#22c55e', subtitle: 'Low Voltage Connection Point', icon: 'fa fa-link', apiSlug: 'electricjunction-lowvoltageconnection-point-noeud-bt' },
		{ label: 'TUR', value: 0, color: '#a855f7', subtitle: 'Low Voltage Control Unit', icon: 'fa fa-square', apiSlug: 'electricdevice-lowvoltagecontrolunit-tur' },
		{ label: 'Connecteur', value: 0, color: '#22c55e', subtitle: 'Ground Attachment', icon: 'fa fa-anchor', apiSlug: 'electricdevice-ground-terre' },
		{ label: 'Disjoncteur DLBT', value: 0, color: '#f97316', subtitle: 'Low Voltage Network Protection', icon: 'fa fa-shield', apiSlug: 'electricdevice-lowvoltagenetworkprotection-disjoncteur' },
		{ label: 'Parafoudre HTA', value: 0, color: '#a855f7', subtitle: 'Medium Voltage Arrester', icon: 'fa fa-minus', apiSlug: 'electricdevice-mediumvoltagearrester-parafoudre' },
		{ label: 'Transformateur HTA/BT', value: 0, color: '#f97316', subtitle: 'High Voltage Transformer', icon: 'fa fa-cog', apiSlug: 'electricdevice-highvoltagetransformer-transfo-ps' },
		{ label: 'Borne Souterraine', value: 0, color: '#22c55e', subtitle: 'Underground Terminal', icon: 'fa fa-square-o' },
		{ label: 'Interrupteur HTA', value: 0, color: '#38bdf8', subtitle: 'Medium Voltage Switch', icon: 'fa fa-square', apiSlug: 'electricdevice-mediumvoltageswitch-cellule-ocr' },
		{ label: 'Transformateur BT/BT', value: 0, color: '#d97706', subtitle: 'Medium Voltage Transformer', icon: 'fa fa-cog', apiSlug: 'electricdevice-mediumvoltagetransformer-transfo-ht-bt' }
	];

	cardsRow2: StatCard[] = [
		{ label: 'Ligne de départ HTA', value: 0, color: '#f97316', subtitle: 'Medium Voltage Service', icon: 'fa fa-bolt' },
		{ label: 'Ligne BT Aérienne', value: 0, color: '#ef4444', subtitle: 'Low Voltage Overhead Conductor', icon: 'fa fa-level-up', apiSlug: 'electricline-lowvoltageoverheadconductor-ligne-bt-aerien' },
		{ label: 'Ligne BT Souterraine', value: 0, color: '#22c55e', subtitle: 'Low Voltage Underground Conductor', icon: 'fa fa-minus', apiSlug: 'electricline-lowvoltageundergroundconductor-ligne-bt-souterrain' },
		{ label: 'Ligne HTA Souterraine', value: 0, color: '#a855f7', subtitle: 'Medium Voltage Underground Conductor', icon: 'fa fa-circle-o', apiSlug: 'electricline-mediumvoltageundergroundconductor-ligne-hta-souter' },
		{ label: 'Ligne HTA Aérienne', value: 0, color: '#ef4444', subtitle: 'Medium Voltage Overhead Conductor', icon: 'fa fa-level-up', apiSlug: 'electricline-mediumvoltageoverheadconductor-ligne-hta-aerien' },
		{ label: 'Ligne de départ BT', value: 0, color: '#eab308', subtitle: 'Low Voltage Service', icon: 'fa fa-arrows-v', apiSlug: 'electricline-lowvoltageservice-ligne-branchement-bt' },
		{ label: 'Limite du poste HTA', value: 0, color: '#3b82f6', subtitle: 'Electric Substation Boundary', icon: 'fa fa-th-large', apiSlug: 'structureboundary-electricsubstationboundary-limite-poste-sourc' },
		{ label: 'Limite du poste BT', value: 0, color: '#a855f7', subtitle: 'Electric Substation Boundary', icon: 'fa fa-th', apiSlug: 'structueboundary-electricdistributionstationboundary-limite-po' },
		{ label: 'Accessoires HTA', value: 0, color: '#ef4444', subtitle: 'Medium Voltage Attachment', icon: 'fa fa-plus' },
		{ label: 'Boîte de jonction BT', value: 0, color: '#3b82f6', subtitle: 'Electric Junction Box', icon: 'fa fa-bolt', apiSlug: 'structurejunction-electricjunctionbox-coffret' },
		{ label: 'Fin de la ligne BT', value: 0, color: '#22c55e', subtitle: 'Low Voltage Line End', icon: 'fa fa-minus', apiSlug: 'electricjunction-lowvoltagelineend-findeligne' },
		{ label: 'Connecteur BT', value: 0, color: '#3b82f6', subtitle: 'Low Voltage Attachment', icon: 'fa fa-anchor' }
	];

	cardsRow3: StatCard[] = [
		{ label: 'Abonné', value: 0, color: '#eab308', subtitle: 'Subscriber', icon: 'fa fa-user', apiSlug: 'subscriberform-abonne' },
		{ label: 'Compteur', value: 0, color: '#38bdf8', subtitle: 'Meter', icon: 'fa fa-tachometer', apiSlug: 'meters-compteur' },
		{ label: 'Branchement', value: 0, color: '#eab308', subtitle: 'Distribution panel', icon: 'fa fa-home', apiSlug: 'distributionpanel-branchement' }
	];

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
	/** Légende repliée (réduite) */
	legendCollapsed = false;
	/** Totaux globaux par slug (API) pour les indicateurs sans couche visible sur la carte */
	private globalCountsBySlug = new Map<string, number>();
	/** Étendue initiale de la carte (pour le bouton « Réinitialiser ») */
	private initialMapBounds: unknown = null;
	/** Ignorer le prochain moveend (après un reset) pour ne pas réécraser les totaux globaux */
	private ignoreNextMoveend = false;

	constructor(private gisApi: GisApiService, private cdr: ChangeDetectorRef) {}

	ngOnInit(): void {
		const allCards = [...this.cardsRow1, ...this.cardsRow2, ...this.cardsRow3];
		const cardsWithSlug = allCards.filter((c) => c.apiSlug);
		// Une couleur unique par ouvrage (cartes + carte) : attribution depuis la palette
		cardsWithSlug.forEach((c, i) => {
			const color = MAP_COLORS[i % MAP_COLORS.length];
			if (c.apiSlug) this.slugToSymbology[c.apiSlug] = { label: c.label, color };
			c.color = color;
		});
		this.initNatureClientChart();
		this.loadGisCounts();
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
			id: 'ID', objectid: 'Object ID', globalid: 'Global ID',
			created_date: 'Date de création', last_edited_date: 'Dernière modification',
			created_user: 'Créé par', last_edited_user: 'Modifié par',
			username: 'Utilisateur', validator: 'Validateur',
			assetgroup: 'Groupe', assetid: 'Asset ID', assettype: 'Type d’actif',
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
				const cardCount = Object.keys(this.slugToSymbology).length;
				const unknownSlugs = tables.filter((t) => !this.slugToSymbology[t.slug]).map((t) => t.slug).sort();
				const slugToColor = new Map<string, string>();
				unknownSlugs.forEach((slug, j) => slugToColor.set(slug, MAP_COLORS[(cardCount + j) % MAP_COLORS.length]));
				const getColor = (slug: string) => this.slugToSymbology[slug]?.color ?? slugToColor.get(slug) ?? MAP_COLORS[0];
				const getLabel = (t: { slug: string; table: string }) => this.slugToSymbology[t.slug]?.label ?? this.formatOuvrageLabel(t.table || t.slug);
				const requests = tables.map((t) =>
					this.gisApi.getList(t.slug, 500, 0).pipe(
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
								pointToLayer: (_: unknown, latlng: unknown) =>
									leaflet.circleMarker(latlng, { ...style, radius: 8 }),
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
						const m = this.map as { fitBounds?: (b: unknown, opts: object) => void; invalidateSize?: () => void };
						if (m?.invalidateSize) m.invalidateSize();
						if (bounds && m?.fitBounds) {
							m.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
							this.initialMapBounds = bounds;
						}
						this.mapLegendItems = legendItems;
						this.cdr.markForCheck();
						this.mapLoading = false;
						// Par défaut on garde les totaux globaux ; mise à jour (visible) uniquement au zoom/pan
						(this.map as { on?: (ev: string, fn: () => void) => void })?.on?.('moveend', () => this.updateVisibleIndicators());
					});
			},
			error: () => {
				this.mapLoading = false;
			}
		});
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
		this.cdr.markForCheck();
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

	/** Compte les ouvrages visibles dans la zone affichée et met à jour les indicateurs (cartes) */
	private updateVisibleIndicators(): void {
		if (this.ignoreNextMoveend) {
			this.ignoreNextMoveend = false;
			return;
		}
		const map = this.map as { getBounds?: () => { contains: (l: unknown) => boolean; intersects: (b: unknown) => boolean } } | null;
		const group = this.layerGroup as { getLayers?: () => unknown[] } | null;
		if (!map?.getBounds || !group?.getLayers) return;
		const bounds = map.getBounds();
		const counts = new Map<string, number>();
		const allLayers = this.getLeafLayers(group.getLayers());
		for (const layer of allLayers) {
			const L = layer as {
				feature?: { properties?: { _layerSlug?: string } };
				getLatLng?: () => unknown;
				getBounds?: () => unknown;
			};
			const slug = L.feature?.properties?._layerSlug;
			if (!slug) continue;
			let inView = false;
			if (typeof L.getLatLng === 'function') {
				const latlng = L.getLatLng();
				inView = latlng != null && typeof bounds.contains === 'function' && bounds.contains(latlng);
			} else if (typeof L.getBounds === 'function') {
				const layerBounds = L.getBounds();
				inView = layerBounds != null && typeof bounds.intersects === 'function' && bounds.intersects(layerBounds);
			}
			if (inView) counts.set(slug, (counts.get(slug) ?? 0) + 1);
		}
		const allCards = [...this.cardsRow1, ...this.cardsRow2, ...this.cardsRow3];
		allCards.forEach((card) => {
			if (card.apiSlug == null) return;
			// Mettre à jour avec le nombre visible si on a des couches de ce type sur la carte
			if (counts.has(card.apiSlug)) {
				card.value = counts.get(card.apiSlug) ?? 0;
			} else {
				// Indicateur sans couche visible (ex. Abonnés, Compteurs) : garder le total global
				card.value = this.globalCountsBySlug.get(card.apiSlug) ?? card.value;
			}
		});
		this.cdr.markForCheck();
	}

	/** Charge les comptes depuis l'API GIS (script_bd) et met à jour les cartes */
	loadGisCounts(): void {
		const allCards = [...this.cardsRow1, ...this.cardsRow2, ...this.cardsRow3];
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
				this.loading = false;
			},
			error: (err) => {
				this.errorApi = err?.message || 'Erreur chargement API GIS';
				this.loading = false;
			}
		});
	}

	initNatureClientChart(): void {
		const prepaye = 305;
		const postpaye = 192;
		this.natureClientData = {
			labels: ['Prépayé (Prepaid)', 'Postpayé (Postpaid)'],
			datasets: [
				{
					label: 'Nombre de clients',
					backgroundColor: ['#22c55e', '#38bdf8'],
					borderColor: ['#16a34a', '#0ea5e9'],
					borderWidth: 1,
					borderRadius: 6,
					data: [prepaye, postpaye]
				}
			]
		};
		this.natureClientTotal = prepaye + postpaye;

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
					max: Math.ceil(Math.max(prepaye, postpaye) * 1.15),
					ticks: {
						stepSize: 50,
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
}
