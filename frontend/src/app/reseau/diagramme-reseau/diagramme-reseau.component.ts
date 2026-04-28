import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { GisApiService } from '../../../services/gis-api.service';
import * as calcitePointSymbols from 'calcite-point-symbols';
import type { CalciteIconPath } from 'calcite-point-symbols';

type TraceDirection = 'amont' | 'aval' | 'tous';
type DiagramViewMode = 'carte' | 'partage' | 'diagramme';

interface DiagrammeTraceContextPayload {
	ref: string;
	direction: TraceDirection;
	ouvrage_ids: { slug: string; id: string }[];
	saved_at?: number;
}

/**
 * Clés d’ouvrage pour le jeu d’icônes unifilaire (`diagramme-icons`).
 * Inclut les jeux « iec-*.svg » (symboles simplifiés type CEI) et
 * `commons-autotransformateur.svg` (Wikimedia, CC0), `trafo-iec.svg` (schéma transfo).
 */
type IecSymbolKey =
	| 'source'
	| 'hta'
	| 'bt'
	| 'mtbt'
	| 'abonnes'
	| 'autres'
	| 'poteau'
	| 'poste_cabine'
	| 'disjoncteur'
	| 'sectionneur'
	| 'parafoudre'
	| 'coupure'
	| 'autotransfo';

interface UnifilarStep {
	iecKey: IecSymbolKey;
	icon: string;
	/** Texte court (nom métier si disponible) */
	label: string;
	/** Sous-titre (ex. type de couche) */
	slug: string;
}

interface UnifilarIconOption {
	id: string;
	label: string;
	path: CalciteIconPath;
	size: 13 | 17 | 21;
}

interface SvgPathPart {
	d: string;
	opacity?: string;
}

interface UnifilarGroupedItems {
	key: string;
	label: string;
	slug: string;
	items: { index: number; step: UnifilarStep }[];
}

/** Niveau de tension pour le code couleur du schéma (réf. vue métier) */
type VoltTensionKey = 'htb' | 'hta' | 'bt' | 'off';

type SldNodeStyle = 'root' | 'ac' | 'abonne' | 'coupure' | 'terminal';

/** Position d’enchaînement des nœuds sur le canevas unifilaire. */
type SldLayoutPosition = 'vertical' | 'horizontal' | 'horizontal_reversed' | 'arbre';

interface SldNodeLayout {
	/** Bord haut-gauche du pictogramme (carré englobant) */
	x: number;
	y: number;
	/** Centre du nœud (raccordement des liaisons) */
	cx: number;
	cy: number;
	/** Rayon d’apparence / branche raccordement (px) */
	r: number;
	s: UnifilarStep;
	index: number;
	volt: VoltTensionKey;
	/** Apparence type schéma « vue métier » (arbre, cercle+≈, point, etc.) */
	nodeStyle: SldNodeStyle;
	/** Titre (nom) — coordonnées selon la disposition */
	capX: number;
	capY: number;
	/** Sous-titre (slug) */
	slugX: number;
	slugY: number;
	textAnchor: 'start' | 'middle' | 'end';
}

interface SldPathLayout {
	d: string;
	volt: VoltTensionKey;
	stroke: string;
	/** '' = trait plein, sinon motif tirets (ex. 5 3) */
	dash: string;
	/** Légende de liaison (souvent identique au nom de l’ouvrage amont) */
	label: string;
	lx: number;
	ly: number;
	labelTextAnchor: 'start' | 'middle' | 'end';
}

@Component({
	selector: 'app-diagramme-reseau',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './diagramme-reseau.component.html',
	styleUrls: ['./diagramme-reseau.component.scss']
})
export class DiagrammeReseau implements OnInit, AfterViewInit, OnDestroy {
	@ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
	@ViewChild('d3DiagramHost') d3DiagramHost?: ElementRef<HTMLDivElement>;

	loading = false;
	error: string | null = null;
	info: string | null = null;
	traceTotal = 0;
	/** Compteurs du tracé : tronçons = segments linéaires reliant les points (nœuds) du réseau. */
	traceSummary = { troncons: 0, points: 0, autres: 0 };
	contextRef = '';
	direction: TraceDirection = 'tous';
	viewMode: DiagramViewMode = 'partage';
	/** Schéma unifilaire (ordre du tracé, symboles IEC) */
	unifilarItems: UnifilarStep[] = [];
	/** Mise en page canevas SVG (schéma de type SLD) */
	sldViewBox = '0 0 400 200';
	/** Dimensions de la scène (alignées sur viewBox) pour le fond hachuré */
	sldVw = 400;
	sldVh = 200;
	/** Taille d’affichage du <svg> en pixels (découplée du conteneur) pour conserver un tracé lisible */
	sldRenderW = 1000;
	sldRenderH = 600;
	/** Multiplicateur sur l’échelle de base (persisté) */
	sldZoom = 1;
	/** Jusqu’à 10 % (0,10) — vue d’ensemble ; l’ancien plancher 45 % bloquait un vrai dézoom. */
	readonly sldZoomMin = 0.1;
	readonly sldZoomMax = 3.25;
	private readonly sldZoomStep = 0.15;
	private static readonly sldZoomStorageKey = 'abun_diagram_sld_zoom';
	sldNodeLayout: SldNodeLayout[] = [];
	sldPathLayout: SldPathLayout[] = [];
	sldLiaisonCount = 0;
	/** Repères de rail de tension (mode vertical) — haut du canevas, centrés sur chaque colonne */
	sldLaneTopCaptions: { x: number; label: string }[] = [];
	/** Repères de rail (mode horizontal) — côté gauche, sur chaque ligne */
	sldLaneLeftCaptions: { y: number; label: string }[] = [];
	readonly sldVoltStrokes: Record<VoltTensionKey, string> = {
		htb: '#ea580c',
		hta: '#2563eb',
		bt: '#16a34a',
		off: '#475569'
	};
	/** Id unique pour le motif de grille (SVG) */
	readonly sldGridId = `sldgrid-${Math.random().toString(36).slice(2, 9)}`;
	readonly sldVoltLabel: Record<Exclude<VoltTensionKey, 'off'>, string> = {
		htb: 'HTB / liaison HT',
		hta: 'HTA',
		bt: 'BT'
	};
	/** Préférence de disposition (persistée) */
	sldLayoutPosition: SldLayoutPosition = 'vertical';
	readonly sldLayoutOptions: { value: SldLayoutPosition; label: string; short: string }[] = [
		{ value: 'vertical', label: 'Vertical (haut → bas)', short: 'Vertical' },
		{ value: 'arbre', label: 'Arbre (racine haut, ouverture latérale)', short: 'Arbre' },
		{ value: 'horizontal', label: 'Horizontal (gauche → droite)', short: 'H. gauche→droite' },
		{ value: 'horizontal_reversed', label: 'Horizontal inversé (droite → gauche)', short: 'H. droite→gauche' }
	];
	private static readonly sldLayoutStorageKey = 'abun_diagram_sld_layout';
	private static readonly viewModeStorageKey = 'abun_diagram_view_mode';
	/**
	 * Canevas SLD : colonnes (vertical) / lignes (horizontal) par ordre
	 * haute → moyenne → basse tension, pour lire l’infrastructure en profondeur.
	 */
	private static readonly sldHierX0 = 64;
	private static readonly sldHierW = 84;
	private static readonly sldHierY0H = 88;
	private static readonly sldHierD = 50;
	/** Réserve une zone vide à droite du canevas. */
	private static readonly sldRightBlank = 220;
	/**
	 * Mise à l’échelle écran : le viewBox reste en unités de dessin ;
	 * on multiplie pour le rendu pixel, sinon un schéma très haut devient une ligne (meet dans le conteneur).
	 */
	private static readonly sldPxPerUnit = 2.5;
	private static readonly sldLaneName: [string, string, string] = [
		'Haute (HTB / liaison)',
		'Moyenne (HTA)',
		'Basse (BT)'
	];
	/** Légende (symboles utilisables selon le type d’ouvrage) */
	readonly sldLegendChips: { key: IecSymbolKey; label: string; hint: string }[] = [
		{ key: 'source', label: 'Générateur / source', hint: 'alimentation' },
		{ key: 'hta', label: 'Tronçon HTA', hint: 'segment reliant des nœuds (3 conducteurs)' },
		{ key: 'bt', label: 'Tronçon BT', hint: 'segment reliant des nœuds, basse tension' },
		{ key: 'mtbt', label: 'Transfo 2 enr.', hint: 'MT↔BT' },
		{ key: 'autotransfo', label: 'Autotransformateur', hint: 'Wikimedia' },
		{ key: 'poste_cabine', label: 'Poste / cabine', hint: 'jeu de barres' },
		{ key: 'poteau', label: 'Support aérien', hint: 'poteau' },
		{ key: 'disjoncteur', label: 'Disjoncteur', hint: 'coupe-circuit' },
		{ key: 'sectionneur', label: 'Sectionneur', hint: 'isolement' },
		{ key: 'parafoudre', label: 'Parafoudre', hint: 'SPC' },
		{ key: 'coupure', label: 'Coupure', hint: 'ouvert' },
		{ key: 'abonnes', label: 'Point livraison', hint: 'abonné' },
		{ key: 'autres', label: 'Divers', hint: 'symbole neutre' }
	];
	selectedUnifilarIndex = 0;
	iconCatalogPage = 1;
	iconCatalogPageSize = 24;
	readonly iconCatalogPageSizeOptions = [24, 48, 96];
	iconCatalogQuery = '';
	private readonly expandedUnifilarGroupKeys = new Set<string>();
	private readonly unifilarIconOverrides = new Map<number, UnifilarIconOption>();
	private readonly iconOptionIndex = new Map<string, UnifilarIconOption>();
	readonly allCalciteIconOptions: UnifilarIconOption[] = this.buildAllCalciteIconOptions();

	private map: unknown = null;
	private traceLayerGroup: {
		addLayer: (l: unknown) => void;
		clearLayers: () => void;
		getBounds?: () => unknown;
	} | null = null;
	private traceOuvrages: { slug: string; id: string }[] = [];
	private mapReady = false;
	private mapResizeObserver: ResizeObserver | null = null;
	private readonly mapColors = ['#eab308', '#22c55e', '#0ea5e9', '#a855f7', '#f97316', '#ef4444'];
	private d3RenderQueued = false;

	constructor(
		private readonly route: ActivatedRoute,
		private readonly gisApi: GisApiService,
		private readonly cdr: ChangeDetectorRef
	) {
		for (const opt of this.allCalciteIconOptions) this.iconOptionIndex.set(opt.id, opt);
	}

	ngOnInit(): void {
		this.sldLayoutPosition = this.readStoredSldLayout();
		this.readStoredSldZoom();
		this.viewMode = this.readStoredViewMode();
		const qp = this.route.snapshot.queryParams;
		const rawRef = String(qp['ref'] ?? '').trim();
		this.direction = this.normalizeDirection(String(qp['direction'] ?? 'tous'));
		if (!rawRef) {
			this.info = 'Lancez un tracé depuis la carte réseau puis ouvrez "Diagramme du réseau".';
			return;
		}
		const parsed = this.parseRef(rawRef);
		if (!parsed.id) {
			this.error = 'Référence invalide pour générer le diagramme.';
			return;
		}
		this.contextRef = rawRef;
		this.loadFromTrace(parsed.id, parsed.slug, this.direction);
	}

	ngAfterViewInit(): void {
		this.initMap();
		this.scheduleD3Render();
	}

	ngOnDestroy(): void {
		this.mapResizeObserver?.disconnect();
		this.mapResizeObserver = null;
		if (this.map && typeof (this.map as { remove?: () => void }).remove === 'function') {
			(this.map as { remove: () => void }).remove();
			this.map = null;
		}
	}

	reload(): void {
		const parsed = this.parseRef(this.contextRef);
		if (!parsed.id) return;
		this.direction = this.normalizeDirection(String(this.route.snapshot.queryParams['direction'] ?? 'tous'));
		this.loadFromTrace(parsed.id, parsed.slug, this.direction);
	}

	setViewMode(mode: DiagramViewMode): void {
		if (mode !== 'carte' && mode !== 'partage' && mode !== 'diagramme') return;
		if (this.viewMode === mode) return;
		this.viewMode = mode;
		try {
			localStorage.setItem(DiagrammeReseau.viewModeStorageKey, mode);
		} catch {
			/* ignore */
		}
		if (mode !== 'diagramme') {
			requestAnimationFrame(() => (this.map as { invalidateSize?: () => void } | null)?.invalidateSize?.());
		}
		this.scheduleD3Render();
	}

	showMapPane(): boolean {
		return this.viewMode === 'carte' || this.viewMode === 'partage';
	}

	showDiagramPane(): boolean {
		return this.viewMode === 'diagramme' || this.viewMode === 'partage';
	}

	isDiagramOnlyMode(): boolean {
		return this.viewMode === 'diagramme';
	}

	sldRenderNodeRadius(node: SldNodeLayout): number {
		return Math.max(1.8, Math.min(3.4, node.r * 0.18));
	}

	sldRenderNodeStroke(node: SldNodeLayout): string {
		if (node.nodeStyle === 'coupure') return '#dc2626';
		return '#334155';
	}

	sldRenderNodeFill(node: SldNodeLayout): string {
		if (node.nodeStyle === 'terminal') return '#cbd5e1';
		if (node.nodeStyle === 'coupure') return '#fee2e2';
		return '#f8fafc';
	}

	private initMap(): void {
		if (!this.mapContainer?.nativeElement) return;
		import('leaflet').then((LMod) => {
			const Lx = (LMod as { default: unknown }).default as {
				map: (el: HTMLElement, opts: object) => unknown;
				tileLayer: (url: string, opts: object) => { addTo: (m: unknown) => unknown };
				control: {
					zoom: (opts: object) => { addTo: (m: unknown) => unknown };
					layers?: (
						baseLayers: Record<string, unknown>,
						overlays?: Record<string, unknown>,
						opts?: object
					) => { addTo: (m: unknown) => unknown };
				};
				featureGroup: () => {
					addTo: (m: unknown) => unknown;
					addLayer: (l: unknown) => void;
					clearLayers: () => void;
					getBounds: () => unknown;
				};
				circleMarker: (latlng: unknown, opts: object) => unknown;
			};
			this.map = Lx.map(this.mapContainer.nativeElement, {
				center: [12.3715, -1.5197],
				zoom: 14,
				maxZoom: 22,
				zoomControl: false
			});
			const osm = Lx.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 22,
				attribution: '© OpenStreetMap contributors'
			});
			const googleSatellite = Lx.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
				maxZoom: 22,
				attribution: '© Google'
			});
			osm.addTo(this.map);
			Lx.control.layers?.(
				{ 'OSM Plan': osm, 'Google Satellite': googleSatellite },
				{},
				{ position: 'topleft' }
			).addTo(this.map);
			Lx.control.zoom({ position: 'topleft' }).addTo(this.map);
			this.traceLayerGroup = Lx.featureGroup().addTo(this.map) as {
				addLayer: (l: unknown) => void;
				clearLayers: () => void;
				getBounds: () => unknown;
			};
			this.mapReady = true;
			const el = this.mapContainer?.nativeElement;
			if (el) {
				this.mapResizeObserver?.disconnect();
				this.mapResizeObserver = new ResizeObserver(() => {
					(this.map as { invalidateSize?: () => void } | null)?.invalidateSize?.();
				});
				this.mapResizeObserver.observe(el);
			}
			this.renderTraceShape();
		});
	}

	private loadFromTrace(refId: string, refSlug: string | undefined, direction: TraceDirection): void {
		this.loading = true;
		this.error = null;
		this.info = null;
		this.traceTotal = 0;
		this.traceSummary = { troncons: 0, points: 0, autres: 0 };
		this.traceOuvrages = [];
		this.unifilarItems = [];
		this.rebuildSldLayout();
		this.traceLayerGroup?.clearLayers();

		const contextRef = refSlug ? `${refSlug}:${refId}` : refId;
		const contextTrace = this.getTraceFromNavigationContext(contextRef, direction);
		if (contextTrace.length) {
			this.applyTrace(contextTrace);
			return;
		}

		this.gisApi.getTrace('ouvrage', refId, direction, refSlug).pipe(
			catchError((err) => {
				const msg = err?.error?.detail || err?.error || err?.message || 'Erreur lors du chargement du diagramme.';
				this.error = String(msg);
				return of({ ouvrage_ids: [] as { slug: string; id: string }[] });
			})
		).subscribe((trace) => this.applyTrace(trace?.ouvrage_ids ?? []));
	}

	private applyTrace(ouvrageIds: { slug: string; id: string }[]): void {
		this.traceOuvrages = ouvrageIds;
		this.traceTotal = ouvrageIds.length;
		this.traceSummary = this.computeSummary(ouvrageIds);
		if (!ouvrageIds.length && !this.error) this.info = 'Aucun élément trouvé pour ce tracé.';
		/* Tant que les géométries ne sont pas chargées (getById), garder le spinner si le tracé n'est pas vide. */
		this.loading = ouvrageIds.length > 0;
		this.unifilarItems = this.buildUnifilarItems(ouvrageIds, new Map());
		this.selectedUnifilarIndex = 0;
		this.unifilarIconOverrides.clear();
		this.syncExpandedUnifilarGroups();
		this.rebuildSldLayout();
		this.renderTraceShape();
		this.cdr.markForCheck();
	}

	private renderTraceShape(): void {
		if (!this.mapReady || !this.traceLayerGroup || !this.map || this.traceOuvrages.length === 0) return;
		const uniqueItems: { slug: string; id: string }[] = [];
		const seen = new Set<string>();
		const slugOrder: string[] = [];
		const slugSeen = new Set<string>();
		for (const o of this.traceOuvrages) {
			const slug = String(o.slug || '').trim();
			const idRaw = String(o.id || '').trim();
			if (!slug || !idRaw) continue;
			const key = `${slug}\0${this.normalizeId(idRaw)}`;
			if (seen.has(key)) continue;
			seen.add(key);
			uniqueItems.push({ slug, id: idRaw });
			if (!slugSeen.has(slug)) {
				slugSeen.add(slug);
				slugOrder.push(slug);
			}
		}
		if (!uniqueItems.length) {
			this.loading = false;
			this.cdr.markForCheck();
			return;
		}
		const slugColor = new Map<string, string>();
		slugOrder.forEach((s, i) => slugColor.set(s, this.mapColors[i % this.mapColors.length]));
		this.traceLayerGroup.clearLayers();

		forkJoin(
			uniqueItems.map((item) =>
				this.gisApi.getById(item.slug, item.id).pipe(
					map((row) => ({ ...item, row })),
					catchError(() => of({ ...item, row: null as Record<string, unknown> | null }))
				)
			)
		)
			.pipe(
				finalize(() => {
					this.loading = false;
					this.cdr.markForCheck();
				})
			)
			.subscribe((rows) => {
			Promise.all([import('leaflet'), import('wellknown').then((w) => w.default ?? w)]).then(([LMod, wellknown]) => {
				const Lx = (LMod as { default: unknown }).default as {
					geoJSON: (f: object, opts: object) => { eachLayer: (fn: (layer: unknown) => void) => void };
					circleMarker: (latlng: unknown, opts: object) => unknown;
				};
				const wk = (wellknown as { parse?: (wkt: string) => unknown }).parse ?? (wellknown as { default?: { parse: (wkt: string) => unknown } }).default?.parse;
				const parseWkt = typeof wk === 'function' ? wk : ((): null => null);
				const features: Array<{ type: 'Feature'; geometry: unknown; properties: Record<string, unknown> }> = [];
				for (const pack of rows) {
					if (!pack.row) continue;
					const rowIdRaw = pack.row['id'] ?? pack.row['gid'] ?? pack.row['objectid'] ?? pack.row['assetid'];
					const rowId = this.normalizeId(String(rowIdRaw ?? pack.id));
					const wkt = String(pack.row['geom'] ?? pack.row['Geom'] ?? '').trim();
					if (!wkt) continue;
					const geom = parseWkt(wkt.replace(/^SRID=\d+;/i, ''));
					if (!geom || typeof geom !== 'object') continue;
					features.push({
						type: 'Feature',
						geometry: geom,
						properties: { _layerSlug: pack.slug, _id: rowId }
					});
				}
				if (features.length) {
					const lineStyleFor = (feat: { properties?: Record<string, unknown> }) => {
						const slug = String(feat?.properties?.['_layerSlug'] ?? '');
						const col = slugColor.get(slug) ?? this.mapColors[0];
						return { color: col, weight: 5, opacity: 0.95, fillColor: col, fillOpacity: 0.5 };
					};
					const fc = { type: 'FeatureCollection' as const, features };
					const geoLayer = Lx.geoJSON(fc, {
						style: (feat: { properties?: Record<string, unknown> }) => lineStyleFor(feat),
						pointToLayer: (feat: { properties?: Record<string, unknown> }, latlng: unknown) => {
							const s = lineStyleFor(feat);
							return Lx.circleMarker(latlng, { ...s, radius: 10 });
						}
					});
					geoLayer.eachLayer((layer: unknown) => this.traceLayerGroup?.addLayer(layer));
				}
				{
					const rowByKey = new Map<string, Record<string, unknown>>();
					for (const pack of rows) {
						if (!pack.row) continue;
						const k = `${pack.slug}\0${this.normalizeId(String(pack.id))}`;
						rowByKey.set(k, pack.row);
					}
					this.unifilarItems = this.buildUnifilarItems(this.traceOuvrages, rowByKey);
					this.selectedUnifilarIndex = Math.min(this.selectedUnifilarIndex, Math.max(0, this.unifilarItems.length - 1));
					this.syncExpandedUnifilarGroups();
					this.rebuildSldLayout();
					this.cdr.markForCheck();
				}
				this.fitMapToTraceLayer();
			});
			});
	}

	/** Cadre la vue sur les entités après que le conteneur flex ait sa taille définitive. */
	private fitMapToTraceLayer(): void {
		const m = this.map as { fitBounds?: (b: unknown, o?: object) => void; invalidateSize?: () => void };
		const fg = this.traceLayerGroup;
		const run = (): void => {
			m.invalidateSize?.();
			try {
				const bounds = fg?.getBounds?.();
				const b = bounds as { isValid?: () => boolean } | null | undefined;
				if (bounds && m.fitBounds && (!b?.isValid || b.isValid())) {
					m.fitBounds(bounds, { padding: [48, 48], maxZoom: 20, animate: false });
				}
			} catch {
				/* groupe vide ou bounds invalides */
			}
		};
		run();
		requestAnimationFrame(() => {
			requestAnimationFrame(run);
		});
		setTimeout(run, 120);
	}

	private normalizeDirection(v: string): TraceDirection {
		if (v === 'amont' || v === 'aval' || v === 'tous') return v;
		return 'tous';
	}

	private parseRef(raw: string): { id: string; slug?: string } {
		const value = raw.trim();
		const idx = value.indexOf(':');
		if (idx <= 0) return { id: value };
		const slug = value.slice(0, idx).trim();
		const id = value.slice(idx + 1).trim();
		return { id, slug: slug || undefined };
	}

	private normalizeId(value: string): string {
		return String(value || '').replace(/^\{|\}$/g, '').trim().toLowerCase();
	}

	private getTraceFromNavigationContext(ref: string, direction: TraceDirection): { slug: string; id: string }[] {
		try {
			const raw = sessionStorage.getItem('abun_diagramme_trace_context');
			if (!raw) return [];
			const payload = JSON.parse(raw) as DiagrammeTraceContextPayload;
			if (String(payload?.ref || '') !== String(ref)) return [];
			if (payload?.direction !== direction) return [];
			const list = Array.isArray(payload?.ouvrage_ids) ? payload.ouvrage_ids : [];
			return list
				.map((x) => ({ slug: String(x?.slug || '').trim(), id: String(x?.id || '').trim() }))
				.filter((x) => !!x.slug && !!x.id);
		} catch {
			return [];
		}
	}

	/** Canevas type SLD : flux selon `sldLayoutPosition` (vertical, arbre, horizontal). */
	private rebuildSldLayout(): void {
		const p = this.sldLayoutPosition;
		if (p === 'vertical') {
			this.rebuildSldLayoutVertical();
		} else if (p === 'arbre') {
			this.rebuildSldLayoutArbre();
		} else {
			this.rebuildSldLayoutHorizontal(p === 'horizontal_reversed');
		}
		this.syncSldPixelSize();
		this.scheduleD3Render();
	}

	private scheduleD3Render(): void {
		if (this.d3RenderQueued) return;
		this.d3RenderQueued = true;
		requestAnimationFrame(() => {
			this.d3RenderQueued = false;
			void this.renderDiagramWithD3();
		});
	}

	private async renderDiagramWithD3(): Promise<void> {
		const host = this.d3DiagramHost?.nativeElement;
		if (!host) return;
		host.innerHTML = '';
		const { select } = await import('d3-selection');
		const svg = select(host)
			.append('svg')
			.attr('width', '100%')
			.attr('height', '100%')
			.attr('viewBox', `0 0 ${this.sldVw} ${this.sldVh}`)
			.attr('preserveAspectRatio', 'xMidYMid meet');
		svg.append('rect').attr('x', 0).attr('y', 0).attr('width', this.sldVw).attr('height', this.sldVh).attr('fill', '#e5e7eb');
		const gPath = svg.append('g');
		for (const p of this.sldPathLayout) {
			gPath
				.append('path')
				.attr('d', p.d)
				.attr('fill', 'none')
				.attr('stroke', p.stroke)
				.attr('stroke-width', 1.1)
				.attr('stroke-linecap', 'round')
				.attr('stroke-linejoin', 'round')
				.attr('opacity', 0.95)
				.attr('stroke-dasharray', p.dash || null);
		}
		const gNode = svg.append('g');
		for (const n of this.sldNodeLayout) {
			gNode
				.append('circle')
				.attr('cx', n.cx)
				.attr('cy', n.cy)
				.attr('r', this.sldRenderNodeRadius(n))
				.attr('fill', this.sldRenderNodeFill(n))
				.attr('stroke', this.sldRenderNodeStroke(n))
				.attr('stroke-width', 0.9);
		}
	}

	/** Synchronise largeur / hauteur en px du <svg> avec sldVw / sldVh (défilement conteneur si besoin). */
	private syncSldPixelSize(): void {
		const s = DiagrammeReseau.sldPxPerUnit * this.sldZoom;
		/* Pas de plancher 300×200 : à faible zoom le schéma doit vraiment rétrécir à l’écran. */
		this.sldRenderW = Math.max(4, Math.round(this.sldVw * s));
		this.sldRenderH = Math.max(4, Math.round(this.sldVh * s));
	}

	/** Agrandit le schéma (déclenche un défilement si nécessaire). */
	sldZoomIn(): void {
		this.setSldZoomValue(this.sldZoom + this.sldZoomStep);
	}

	/** Réduit l’affichage du schéma. */
	sldZoomOut(): void {
		this.setSldZoomValue(this.sldZoom - this.sldZoomStep);
	}

	/** Revenir au zoom 100 % (recommandation initiale). */
	sldZoomReset(): void {
		this.setSldZoomValue(1);
	}

	sldZoomPercentLabel(): string {
		return `${Math.round(this.sldZoom * 100)}%`;
	}

	sldZoomOutDisabled(): boolean {
		return this.sldZoom <= this.sldZoomMin + 1e-4;
	}

	sldZoomInDisabled(): boolean {
		return this.sldZoom >= this.sldZoomMax - 1e-4;
	}

	sldZoomResetDisabled(): boolean {
		return Math.abs(this.sldZoom - 1) < 0.01;
	}

	private setSldZoomValue(z: number): void {
		const n = Math.round(Math.max(this.sldZoomMin, Math.min(this.sldZoomMax, z)) * 100) / 100;
		if (n === this.sldZoom) return;
		this.sldZoom = n;
		try {
			localStorage.setItem(DiagrammeReseau.sldZoomStorageKey, String(n));
		} catch {
			/* ignore */
		}
		this.syncSldPixelSize();
		this.cdr.markForCheck();
	}

	private readStoredSldZoom(): void {
		try {
			const raw = localStorage.getItem(DiagrammeReseau.sldZoomStorageKey);
			const v = raw != null ? Number.parseFloat(raw) : Number.NaN;
			if (Number.isFinite(v) && v >= this.sldZoomMin - 1e-6 && v <= this.sldZoomMax + 1e-6) {
				this.sldZoom = Math.round(v * 100) / 100;
			}
		} catch {
			/* ignore */
		}
	}

	setSldLayoutPosition(pos: SldLayoutPosition | string): void {
		const next: SldLayoutPosition =
			pos === 'vertical' || pos === 'arbre' || pos === 'horizontal' || pos === 'horizontal_reversed' ? pos : 'vertical';
		if (this.sldLayoutPosition === next) return;
		this.sldLayoutPosition = next;
		try {
			localStorage.setItem(DiagrammeReseau.sldLayoutStorageKey, next);
		} catch {
			/* ignore */
		}
		this.rebuildSldLayout();
		this.cdr.markForCheck();
	}

	/** Métadonnée affichée sous le titre du canevas. */
	sldLayoutMetaText(): string {
		switch (this.sldLayoutPosition) {
			case 'arbre':
				return 'Racine (amont) en haut, ouverture en côté par niveau, profondeur = ordre du tracé — tracé';
			case 'horizontal':
				return 'Gauche → droite, rails haut→bas = hiérarchie (HTA / BT) — tracé';
			case 'horizontal_reversed':
				return 'Droite → gauche, rails haut→bas = hiérarchie (HTA / BT) — tracé';
			case 'vertical':
				return 'Haut → bas, colonnes gauche→droite = niveau (HTB / HTA / BT) — tracé';
			default:
				return 'Haut → bas, colonnes gauche→droite = niveau (HTB / HTA / BT) — tracé';
		}
	}

	private readStoredSldLayout(): SldLayoutPosition {
		try {
			const v = localStorage.getItem(DiagrammeReseau.sldLayoutStorageKey);
			if (v === 'vertical' || v === 'arbre' || v === 'horizontal' || v === 'horizontal_reversed') {
				return v;
			}
		} catch {
			/* ignore */
		}
		return 'vertical';
	}

	private readStoredViewMode(): DiagramViewMode {
		try {
			const v = localStorage.getItem(DiagrammeReseau.viewModeStorageKey);
			if (v === 'carte' || v === 'partage' || v === 'diagramme') return v;
		} catch {
			/* ignore */
		}
		return 'partage';
	}

	/**
	 * 0 = haute (HTB / poste), 1 = moyenne (HTA, hors-tension côté MT), 2 = basse (BT, dérivations).
	 */
	private sldHierarchyLaneIndex(v: VoltTensionKey): 0 | 1 | 2 {
		if (v === 'htb') return 0;
		if (v === 'bt') return 2;
		return 1; /* hta, off côté infrastructure type MT / neutre */
	}

	private sldPathSegmentV(
		a: SldNodeLayout,
		b: SldNodeLayout
	): { d: string; lx: number; ly: number; labelTextAnchor: 'start' | 'middle' } {
		const y1 = a.cy + a.r;
		const y2 = b.cy - b.r;
		if (Math.abs(a.cx - b.cx) < 0.6) {
			return {
				d: `M ${a.cx} ${y1} L ${b.cx} ${y2}`,
				lx: a.cx + 14,
				ly: (y1 + y2) / 2,
				labelTextAnchor: 'start'
			};
		}
		const yM = (y1 + y2) / 2;
		return {
			d: `M ${a.cx} ${y1} L ${a.cx} ${yM} L ${b.cx} ${yM} L ${b.cx} ${y2}`,
			lx: (a.cx + b.cx) / 2,
			ly: yM - 6,
			labelTextAnchor: 'middle'
		};
	}

	/**
	 * Tronçons / câbles / lignes : ouvrages linéaires à représenter sur l’arête entre deux nœuds,
	 * pas comme symbole de nœud (évite les « cercles tronçon » entre deux points).
	 */
	private isTronconUnifilarStep(s: UnifilarStep): boolean {
		const slug = String(s.slug || '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/_/g, '-');
		if (
			s.iecKey === 'source' ||
			s.iecKey === 'abonnes' ||
			s.iecKey === 'mtbt' ||
			s.iecKey === 'poste_cabine' ||
			s.iecKey === 'poteau' ||
			s.iecKey === 'disjoncteur' ||
			s.iecKey === 'sectionneur' ||
			s.iecKey === 'parafoudre' ||
			s.iecKey === 'coupure' ||
			s.iecKey === 'autotransfo'
		) {
			return false;
		}
		if (slug.includes('poste') && !slug.includes('ligne')) return false;
		if (slug.includes('poteau') && !slug.includes('ligne')) return false;
		if (slug.includes('cellule') && !slug.includes('ligne')) return false;
		if (slug.includes('abonne') && !slug.includes('ligne') && !slug.includes('cable')) return false;
		if (
			slug.includes('ligne') ||
			slug.includes('troncon') ||
			slug.includes('cable') ||
			slug.includes('electricline') ||
			(/segment/.test(slug) && /hta|bt|ligne|cable|troncon/.test(slug))
		) {
			return true;
		}
		if (s.iecKey === 'hta' || s.iecKey === 'bt') return true;
		return false;
	}

	/**
	 * Chaîne du tracé réduite aux nœuds (points) ; tronçons regroupés sur chaque arête consécutive.
	 */
	private buildSldCollapsedFlow(items: UnifilarStep[]): {
		nodes: UnifilarStep[];
		edgeTroncons: UnifilarStep[][];
	} {
		const n = items.length;
		if (n === 0) return { nodes: [], edgeTroncons: [] };
		const nodeIndices: number[] = [];
		for (let i = 0; i < n; i++) {
			if (!this.isTronconUnifilarStep(items[i])) nodeIndices.push(i);
		}
		if (nodeIndices.length === 0) return { nodes: [], edgeTroncons: [] };
		const nodes = nodeIndices.map((i) => items[i]);
		if (nodes.length === 1) return { nodes, edgeTroncons: [] };
		const edgeTroncons: UnifilarStep[][] = [];
		for (let k = 0; k < nodeIndices.length - 1; k++) {
			const i0 = nodeIndices[k];
			const i1 = nodeIndices[k + 1];
			edgeTroncons.push(items.slice(i0 + 1, i1));
		}
		const firstNi = nodeIndices[0];
		const lastNi = nodeIndices[nodeIndices.length - 1];
		const prefix = items.slice(0, firstNi);
		const suffix = items.slice(lastNi + 1);
		if (edgeTroncons.length > 0) {
			edgeTroncons[0] = [...prefix, ...edgeTroncons[0]];
			const li = edgeTroncons.length - 1;
			edgeTroncons[li] = [...edgeTroncons[li], ...suffix];
		}
		return { nodes, edgeTroncons };
	}

	private linkTensionKeyForSegment(a: SldNodeLayout, b: SldNodeLayout, between: UnifilarStep[]): VoltTensionKey {
		const rank: Record<VoltTensionKey, number> = { off: 0, bt: 1, hta: 2, htb: 3 };
		let best: VoltTensionKey = a.volt;
		let br = rank[best];
		const consider = (v: VoltTensionKey) => {
			const r = rank[v];
			if (r > br) {
				best = v;
				br = r;
			}
		};
		consider(b.volt);
		for (const t of between) consider(this.voltKeyForStep(t.iecKey, t.slug));
		return best;
	}

	private sldPathSegmentH(
		a: SldNodeLayout,
		b: SldNodeLayout
	): { d: string; lx: number; ly: number; labelTextAnchor: 'start' | 'middle' } {
		const x1 = a.cx + a.r;
		const x2 = b.cx - b.r;
		if (Math.abs(a.cy - b.cy) < 0.5) {
			return {
				d: `M ${x1} ${a.cy} L ${x2} ${b.cy}`,
				lx: (x1 + x2) / 2,
				ly: a.cy - 12,
				labelTextAnchor: 'middle'
			};
		}
		const xM = (x1 + x2) / 2;
		return {
			d: `M ${x1} ${a.cy} L ${xM} ${a.cy} L ${xM} ${b.cy} L ${x2} ${b.cy}`,
			lx: xM,
			ly: Math.min(a.cy, b.cy) - 12,
			labelTextAnchor: 'middle'
		};
	}

	private rebuildSldLayoutVertical(): void {
		this.sldLaneTopCaptions = [];
		this.sldLaneLeftCaptions = [];
		const items = this.unifilarItems;
		if (items.length === 0) {
			this.sldVw = 200;
			this.sldVh = 100;
			this.sldViewBox = '0 0 200 100';
			this.sldNodeLayout = [];
			this.sldPathLayout = [];
			this.sldLiaisonCount = 0;
			return;
		}
		const { nodes, edgeTroncons } = this.buildSldCollapsedFlow(items);
		if (nodes.length === 0) {
			this.sldVw = 200;
			this.sldVh = 100;
			this.sldViewBox = '0 0 200 100';
			this.sldNodeLayout = [];
			this.sldPathLayout = [];
			this.sldLiaisonCount = 0;
			return;
		}
		const padT = 20;
		this.sldLaneTopCaptions = [0, 1, 2].map((lane) => ({
			x: DiagrammeReseau.sldHierX0 + lane * DiagrammeReseau.sldHierW,
			label: DiagrammeReseau.sldLaneName[lane] ?? ''
		}));
		const firstRowY = 44;
		const rowStep = 76;
		const n = nodes.length;
		const maxRowSpan = n;
		const pos: SldNodeLayout[] = [];
		for (let i = 0; i < n; i++) {
			const s = nodes[i];
			const vi = this.voltKeyForStep(s.iecKey, s.slug);
			const ns = this.sldNodeStyleFor(s.iecKey);
			const r = this.sldNodeRadiusFor(s.iecKey, ns);
			const lane = this.sldHierarchyLaneIndex(vi);
			const cy = padT + firstRowY + i * rowStep;
			const cx = DiagrammeReseau.sldHierX0 + lane * DiagrammeReseau.sldHierW;
			const x = cx - r;
			const y = cy - r;
			const capX = cx + r + 6;
			const capY = cy;
			const slugX = capX;
			const slugY = cy + 10;
			pos.push({
				x,
				y,
				cx,
				cy,
				r,
				s,
				index: i,
				volt: vi,
				nodeStyle: ns,
				capX,
				capY,
				slugX,
				slugY,
				textAnchor: 'start'
			});
		}
		const paths: SldPathLayout[] = [];
		for (let k = 0; k < pos.length - 1; k++) {
			const a = pos[k];
			const b = pos[k + 1];
			const between = edgeTroncons[k] ?? [];
			const lv = this.linkTensionKeyForSegment(a, b, between);
			const fromIec = between.length ? between[0].iecKey : a.s.iecKey;
			const toIec = between.length ? between[between.length - 1].iecKey : b.s.iecKey;
			const { stroke, dash } = this.sldLinkVisual(lv, fromIec, toIec);
			const { d, lx, ly, labelTextAnchor } = this.sldPathSegmentV(a, b);
			const lab = this.sldEdgeLabelForSegment(between, a.s);
			paths.push({ d, volt: lv, stroke, dash, label: lab, lx, ly, labelTextAnchor });
		}
		this.sldLiaisonCount = paths.length;
		this.sldPathLayout = paths;
		this.sldNodeLayout = pos;
		/* Largeur : rails répétés par bande + faible marge droite (sans étiquettes à droite). */
		const w = Math.max(
			520,
			DiagrammeReseau.sldHierX0 +
				2 * DiagrammeReseau.sldHierW +
				DiagrammeReseau.sldRightBlank
		);
		const h = Math.max(140, padT + firstRowY + (maxRowSpan - 1) * rowStep + 88);
		this.sldVw = w;
		this.sldVh = h;
		this.sldViewBox = `0 0 ${w} ${h}`;
	}

	/**
	 * Arbre (vue organigramme) : nœud racine (début du tracé) en haut, nœuds suivants en
	 * profondeur (vers l’aval) ; ouverture latérale en cloche par bande, liaisons en angles droits.
	 */
	private rebuildSldLayoutArbre(): void {
		this.sldLaneTopCaptions = [];
		this.sldLaneLeftCaptions = [];
		const items = this.unifilarItems;
		if (items.length === 0) {
			this.sldVw = 200;
			this.sldVh = 100;
			this.sldViewBox = '0 0 200 100';
			this.sldNodeLayout = [];
			this.sldPathLayout = [];
			this.sldLiaisonCount = 0;
			return;
		}
		const { nodes, edgeTroncons } = this.buildSldCollapsedFlow(items);
		if (nodes.length === 0) {
			this.sldVw = 200;
			this.sldVh = 100;
			this.sldViewBox = '0 0 200 100';
			this.sldNodeLayout = [];
			this.sldPathLayout = [];
			this.sldLiaisonCount = 0;
			return;
		}
		const padT = 20;
		const firstRowY = 44;
		const rowStep = 76;
		const n = nodes.length;
		const maxRowSpan = n;
		const trunkX0 = DiagrammeReseau.sldHierX0 + DiagrammeReseau.sldHierW;
		const amp = 58;
		const pos: SldNodeLayout[] = [];
		for (let i = 0; i < n; i++) {
			const s = nodes[i];
			const vi = this.voltKeyForStep(s.iecKey, s.slug);
			const ns = this.sldNodeStyleFor(s.iecKey);
			const r = this.sldNodeRadiusFor(s.iecKey, ns);
			const t = n <= 1 ? Math.PI / 2 : (i / (n - 1)) * Math.PI;
			const cx = trunkX0 + amp * Math.sin(t);
			const cy = padT + firstRowY + i * rowStep;
			const x = cx - r;
			const y = cy - r;
			const capX = cx + r + 6;
			const capY = cy;
			const slugX = capX;
			const slugY = cy + 10;
			pos.push({
				x,
				y,
				cx,
				cy,
				r,
				s,
				index: i,
				volt: vi,
				nodeStyle: ns,
				capX,
				capY,
				slugX,
				slugY,
				textAnchor: 'start'
			});
		}
		const paths: SldPathLayout[] = [];
		for (let k = 0; k < pos.length - 1; k++) {
			const a = pos[k];
			const b = pos[k + 1];
			const between = edgeTroncons[k] ?? [];
			const lv = this.linkTensionKeyForSegment(a, b, between);
			const fromIec = between.length ? between[0].iecKey : a.s.iecKey;
			const toIec = between.length ? between[between.length - 1].iecKey : b.s.iecKey;
			const { stroke, dash } = this.sldLinkVisual(lv, fromIec, toIec);
			const { d, lx, ly, labelTextAnchor } = this.sldPathSegmentV(a, b);
			const lab = this.sldEdgeLabelForSegment(between, a.s);
			paths.push({ d, volt: lv, stroke, dash, label: lab, lx, ly, labelTextAnchor });
		}
		this.sldLiaisonCount = paths.length;
		this.sldPathLayout = paths;
		this.sldNodeLayout = pos;
		const w = Math.max(520, trunkX0 + amp + 8 + DiagrammeReseau.sldRightBlank);
		const h = Math.max(160, padT + firstRowY + (maxRowSpan - 1) * rowStep + 100);
		this.sldVw = w;
		this.sldVh = h;
		this.sldViewBox = `0 0 ${w} ${h}`;
	}

	private rebuildSldLayoutHorizontal(reversed: boolean): void {
		this.sldLaneTopCaptions = [];
		this.sldLaneLeftCaptions = [];
		const items = this.unifilarItems;
		if (items.length === 0) {
			this.sldVw = 200;
			this.sldVh = 100;
			this.sldViewBox = '0 0 200 100';
			this.sldNodeLayout = [];
			this.sldPathLayout = [];
			this.sldLiaisonCount = 0;
			return;
		}
		const { nodes, edgeTroncons } = this.buildSldCollapsedFlow(items);
		if (nodes.length === 0) {
			this.sldVw = 200;
			this.sldVh = 100;
			this.sldViewBox = '0 0 200 100';
			this.sldNodeLayout = [];
			this.sldPathLayout = [];
			this.sldLiaisonCount = 0;
			return;
		}
		this.sldLaneLeftCaptions = [0, 1, 2].map((lane) => ({
			y: DiagrammeReseau.sldHierY0H + lane * DiagrammeReseau.sldHierD,
			label: DiagrammeReseau.sldLaneName[lane] ?? ''
		}));
		const padL = 52;
		const colStep = 90;
		const n = nodes.length;
		const pos: SldNodeLayout[] = [];
		for (let i = 0; i < n; i++) {
			const s = nodes[i];
			const vi = this.voltKeyForStep(s.iecKey, s.slug);
			const ns = this.sldNodeStyleFor(s.iecKey);
			const r = this.sldNodeRadiusFor(s.iecKey, ns);
			const j = reversed ? n - 1 - i : i;
			const cx = padL + 32 + j * colStep;
			const lane = this.sldHierarchyLaneIndex(vi);
			const cy = DiagrammeReseau.sldHierY0H + lane * DiagrammeReseau.sldHierD;
			const x = cx - r;
			const y = cy - r;
			const capX = cx;
			const capY = cy + r + 5;
			const slugX = cx;
			const slugY = cy + r + 16;
			pos.push({
				x,
				y,
				cx,
				cy,
				r,
				s,
				index: i,
				volt: vi,
				nodeStyle: ns,
				capX,
				capY,
				slugX,
				slugY,
				textAnchor: 'middle'
			});
		}
		const paths: SldPathLayout[] = [];
		for (let k = 0; k < pos.length - 1; k++) {
			const a = pos[k];
			const b = pos[k + 1];
			const between = edgeTroncons[k] ?? [];
			const lv = this.linkTensionKeyForSegment(a, b, between);
			const fromIec = between.length ? between[0].iecKey : a.s.iecKey;
			const toIec = between.length ? between[between.length - 1].iecKey : b.s.iecKey;
			const { stroke, dash } = this.sldLinkVisual(lv, fromIec, toIec);
			const { d, lx, ly, labelTextAnchor } = this.sldPathSegmentH(a, b);
			const lab = this.sldEdgeLabelForSegment(between, a.s);
			paths.push({ d, volt: lv, stroke, dash, label: lab, lx, ly, labelTextAnchor });
		}
		this.sldLiaisonCount = paths.length;
		this.sldPathLayout = paths;
		this.sldNodeLayout = pos;
		const w = Math.max(420, padL + 32 + (n - 1) * colStep + 56 + DiagrammeReseau.sldRightBlank);
		const h = DiagrammeReseau.sldHierY0H + 2 * DiagrammeReseau.sldHierD + 30 + 120;
		this.sldVw = w;
		this.sldVh = h;
		this.sldViewBox = `0 0 ${w} ${h}`;
	}

	private sldNodeStyleFor(iec: IecSymbolKey): SldNodeStyle {
		if (iec === 'source') return 'root';
		if (iec === 'abonnes') return 'abonne';
		if (iec === 'coupure') return 'coupure';
		if (iec === 'autres') return 'terminal';
		return 'ac';
	}

	private sldNodeRadiusFor(iec: IecSymbolKey, ns: SldNodeStyle): number {
		if (ns === 'abonne') return 5;
		if (ns === 'root') return 12;
		if (ns === 'coupure') return 7;
		if (ns === 'terminal') return 3;
		return 18;
	}

	/** Texte sur l’arête : tronçons intermédiaires (noms concaténés), sinon amont. */
	private sldEdgeLabelForSegment(between: UnifilarStep[], upstreamNode: UnifilarStep): string {
		if (between.length > 0) {
			const parts = between
				.map((t) => (t.label || t.slug || '').trim())
				.filter(Boolean);
			if (parts.length > 0) return this.sldShortText(parts.join(' · '), 28);
		}
		const t = (upstreamNode.label || upstreamNode.slug || '').trim();
		if (!t) return '';
		return this.sldShortText(t, 18);
	}

	/**
	 * Style des liaisons (tronçons entre nœuds) : alimentation bleu pointillé, HTA bleu pointillé,
	 * branchement / abonné orange pointillés, BT plein cyan.
	 */
	private sldLinkVisual(lv: VoltTensionKey, from: IecSymbolKey, to: IecSymbolKey): { stroke: string; dash: string } {
		if (lv === 'off') return { stroke: '#64748b', dash: '3 3' };
		if (lv === 'bt') return { stroke: '#06b6d4', dash: '' };
		if (lv === 'htb') return { stroke: '#1d4ed8', dash: '5 4' };
		if (to === 'abonnes' || from === 'abonnes') return { stroke: '#f59e0b', dash: '4 3' };
		if (to === 'bt' && from === 'hta') return { stroke: '#06b6d4', dash: '4 3' };
		return { stroke: '#1d4ed8', dash: '5 4' };
	}

	/** Tension « métier » pour bordure de nœud et légende (déductible du type + slug). */
	private voltKeyForStep(iec: IecSymbolKey, slug: string): VoltTensionKey {
		const s = String(slug || '').toLowerCase();
		if (iec === 'source') return 'htb';
		if (iec === 'coupure' || s.includes('hors-t') || s.includes('ouvert-circuit') || s.includes('de-energ')) {
			return 'off';
		}
		if (iec === 'abonnes' || iec === 'bt') return 'bt';
		if (iec === 'poteau') {
			if (s.includes('bt') && !s.includes('hta')) return 'bt';
			return 'hta';
		}
		if (iec === 'autres' && s.includes('bt') && !s.includes('hta')) return 'bt';
		if (iec === 'autres' && s.includes('hta')) return 'hta';
		if (iec === 'autres') return 'off';
		if (iec === 'parafoudre' && s.includes('bt')) return 'bt';
		return 'hta';
	}

	sldShortText(text: string, max = 18): string {
		const t = (text || '').trim();
		if (t.length <= max) return t;
		return t.slice(0, max - 1) + '…';
	}

	/** Légende : URL de l’icône (même jeu que le canevas). */
	sldIconForKey(iec: IecSymbolKey): string {
		return this.iecIconPath(iec);
	}

	/** Couches synthétiques RX (ponts topologie) : absentes du schéma unifilaire. */
	private isRxTopologyLayerSlug(slug: string): boolean {
		const s = String(slug || '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/_/g, '-')
			.trim();
		return s === 'rx-topology-nodes' || s === 'rx-topology-edges';
	}

	private buildUnifilarItems(
		ouvrages: { slug: string; id: string }[],
		rowByKey: Map<string, Record<string, unknown>>
	): UnifilarStep[] {
		const out: UnifilarStep[] = [];
		for (const o of ouvrages) {
			const slug = String(o.slug || '').trim();
			const idRaw = String(o.id || '').trim();
			if (!slug || !idRaw) continue;
			if (this.isRxTopologyLayerSlug(slug)) continue;
			const rowKey = `${slug}\0${this.normalizeId(idRaw)}`;
			const row = rowByKey.get(rowKey);
			const iecKey = this.pickIecKeyFromSlug(slug);
			out.push({
				iecKey,
				icon: this.iecIconPath(iecKey),
				label: this.pickUnifilarLabel(row, idRaw, slug),
				slug
			});
		}
		return out;
	}

	selectUnifilarItem(index: number): void {
		if (index < 0 || index >= this.unifilarItems.length) return;
		this.selectedUnifilarIndex = index;
		const step = this.unifilarItems[index];
		const key = this.unifilarGroupKey(step.slug);
		this.expandedUnifilarGroupKeys.add(key);
		this.syncIconCatalogPageForSelected();
	}

	selectedUnifilarItem(): UnifilarStep | null {
		return this.unifilarItems[this.selectedUnifilarIndex] ?? null;
	}

	unifilarItemIsSelected(index: number): boolean {
		return index === this.selectedUnifilarIndex;
	}

	unifilarOptionsForItem(step: UnifilarStep | null): UnifilarIconOption[] {
		if (!step) return [];
		return this.allCalciteIconOptions;
	}

	unifilarOverrideForItem(index: number): UnifilarIconOption | null {
		return this.unifilarIconOverrides.get(index) ?? null;
	}

	unifilarSelectedOptionId(index: number, step: UnifilarStep | null): string {
		const override = this.unifilarOverrideForItem(index);
		if (override) return override.id;
		const options = this.unifilarOptionsForItem(step);
		return options.length ? options[0].id : '';
	}

	unifilarGroupedItems(): UnifilarGroupedItems[] {
		const groups = new Map<string, UnifilarGroupedItems>();
		for (let index = 0; index < this.unifilarItems.length; index++) {
			const step = this.unifilarItems[index];
			const key = this.unifilarGroupKey(step.slug);
			let group = groups.get(key);
			if (!group) {
				group = {
					key,
					label: this.formatUnifilarSlug(step.slug),
					slug: step.slug,
					items: []
				};
				groups.set(key, group);
			}
			group.items.push({ index, step });
		}
		return Array.from(groups.values());
	}

	isUnifilarGroupExpanded(groupKey: string): boolean {
		return this.expandedUnifilarGroupKeys.has(groupKey);
	}

	toggleUnifilarGroup(groupKey: string): void {
		if (this.expandedUnifilarGroupKeys.has(groupKey)) {
			this.expandedUnifilarGroupKeys.delete(groupKey);
		} else {
			this.expandedUnifilarGroupKeys.add(groupKey);
		}
	}

	setUnifilarSymbolOverride(index: number, event: Event): void {
		const value = (event.target as HTMLSelectElement | null)?.value ?? '';
		if (!value) {
			this.unifilarIconOverrides.delete(index);
			return;
		}
		const opt = this.iconOptionIndex.get(value);
		if (!opt) return;
		this.unifilarIconOverrides.set(index, opt);
		this.syncIconCatalogPageForSelected();
	}

	setUnifilarSymbolOverrideById(index: number, optionId: string): void {
		const opt = this.iconOptionIndex.get(String(optionId || '').trim());
		if (!opt) return;
		this.unifilarIconOverrides.set(index, opt);
	}

	applyUnifilarSymbolToGroup(groupKey: string, optionId: string): void {
		const opt = this.iconOptionIndex.get(String(optionId || '').trim());
		if (!opt) return;
		for (let index = 0; index < this.unifilarItems.length; index++) {
			const step = this.unifilarItems[index];
			if (this.unifilarGroupKey(step.slug) !== groupKey) continue;
			this.unifilarIconOverrides.set(index, opt);
		}
		this.cdr.markForCheck();
	}

	selectedUnifilarGroupKey(): string {
		const step = this.selectedUnifilarItem();
		return step ? this.unifilarGroupKey(step.slug) : '';
	}

	selectedUnifilarGroupLabel(): string {
		const step = this.selectedUnifilarItem();
		return step ? this.formatUnifilarSlug(step.slug) : '';
	}

	iconCatalogPagedOptions(step: UnifilarStep | null): UnifilarIconOption[] {
		const all = this.filteredIconOptions(step);
		const page = this.iconCatalogClampedPage(step);
		const start = (page - 1) * this.iconCatalogPageSize;
		return all.slice(start, start + this.iconCatalogPageSize);
	}

	iconCatalogPageCount(step: UnifilarStep | null): number {
		const total = this.filteredIconOptions(step).length;
		return Math.max(1, Math.ceil(total / this.iconCatalogPageSize));
	}

	iconCatalogClampedPage(step: UnifilarStep | null): number {
		const totalPages = this.iconCatalogPageCount(step);
		if (this.iconCatalogPage < 1) return 1;
		if (this.iconCatalogPage > totalPages) return totalPages;
		return this.iconCatalogPage;
	}

	iconCatalogCanPrev(step: UnifilarStep | null): boolean {
		return this.iconCatalogClampedPage(step) > 1;
	}

	iconCatalogCanNext(step: UnifilarStep | null): boolean {
		return this.iconCatalogClampedPage(step) < this.iconCatalogPageCount(step);
	}

	iconCatalogPrev(step: UnifilarStep | null): void {
		this.iconCatalogSetPage(this.iconCatalogClampedPage(step) - 1, step);
	}

	iconCatalogNext(step: UnifilarStep | null): void {
		this.iconCatalogSetPage(this.iconCatalogClampedPage(step) + 1, step);
	}

	iconCatalogSetPage(page: number, step: UnifilarStep | null): void {
		const total = this.iconCatalogPageCount(step);
		this.iconCatalogPage = Math.max(1, Math.min(total, page));
	}

	iconCatalogSetPageSize(sizeRaw: string | number, step: UnifilarStep | null): void {
		const next = Number(sizeRaw);
		if (!this.iconCatalogPageSizeOptions.includes(next)) return;
		this.iconCatalogPageSize = next;
		this.syncIconCatalogPageForSelected();
		this.iconCatalogSetPage(this.iconCatalogPage, step);
	}

	iconCatalogSetQuery(queryRaw: string, step: UnifilarStep | null): void {
		this.iconCatalogQuery = String(queryRaw || '');
		this.iconCatalogPage = 1;
		this.iconCatalogSetPage(this.iconCatalogPage, step);
	}

	iconCatalogResultCount(step: UnifilarStep | null): number {
		return this.filteredIconOptions(step).length;
	}

	iconOptionIsSelectedForCurrent(optionId: string, step: UnifilarStep | null): boolean {
		return this.unifilarSelectedOptionId(this.selectedUnifilarIndex, step) === optionId;
	}

	iconPartsForOption(opt: UnifilarIconOption): SvgPathPart[] {
		if (typeof opt.path === 'string') return [{ d: opt.path }];
		return opt.path.map((part) => ({ d: part.d, opacity: part.opacity }));
	}

	unifilarSvgViewBoxFor(index: number, step: UnifilarStep): string {
		const size = this.unifilarOverrideForItem(index)?.size ?? 17;
		return `0 0 ${size} ${size}`;
	}

	unifilarSvgPathPartsFor(index: number, step: UnifilarStep): SvgPathPart[] {
		const fallback = this.unifilarOptionsForItem(step)[0];
		const iconPath = this.unifilarOverrideForItem(index)?.path ?? fallback?.path;
		if (!iconPath) return [];
		if (typeof iconPath === 'string') return [{ d: iconPath }];
		return iconPath.map((entry) => ({ d: entry.d, opacity: entry.opacity }));
	}

	private buildAllCalciteIconOptions(): UnifilarIconOption[] {
		const out: UnifilarIconOption[] = [];
		const entries = Object.entries(calcitePointSymbols) as Array<[string, unknown]>;
		for (const [name, value] of entries) {
			const match = name.match(/^(.*?)(13|17|21)$/);
			if (!match) continue;
			if (!this.isCalcitePath(value)) continue;
			const size = Number(match[2]) as 13 | 17 | 21;
			const baseName = match[1];
			out.push({
				id: name,
				label: `${this.humanizeCalciteName(baseName)} (${size})`,
				path: value,
				size
			});
		}
		out.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
		return out;
	}

	private isCalcitePath(value: unknown): value is CalciteIconPath {
		if (typeof value === 'string') return true;
		if (!Array.isArray(value)) return false;
		return value.every((item) => !!item && typeof item === 'object' && typeof (item as { d?: unknown }).d === 'string');
	}

	private humanizeCalciteName(baseName: string): string {
		const spaced = baseName
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
			.trim();
		return spaced.charAt(0).toUpperCase() + spaced.slice(1);
	}

	private syncExpandedUnifilarGroups(): void {
		const validKeys = new Set(this.unifilarItems.map((item) => this.unifilarGroupKey(item.slug)));
		for (const key of Array.from(this.expandedUnifilarGroupKeys)) {
			if (!validKeys.has(key)) this.expandedUnifilarGroupKeys.delete(key);
		}
		for (const key of validKeys) this.expandedUnifilarGroupKeys.add(key);
	}

	private syncIconCatalogPageForSelected(): void {
		const active = this.selectedUnifilarItem();
		const selectedId = this.unifilarSelectedOptionId(this.selectedUnifilarIndex, active);
		const all = this.filteredIconOptions(active);
		const idx = all.findIndex((opt) => opt.id === selectedId);
		if (idx < 0) {
			this.iconCatalogPage = 1;
			return;
		}
		this.iconCatalogPage = Math.floor(idx / this.iconCatalogPageSize) + 1;
	}

	private filteredIconOptions(step: UnifilarStep | null): UnifilarIconOption[] {
		const all = this.unifilarOptionsForItem(step);
		const q = this.normalizeForSearch(this.iconCatalogQuery);
		if (!q) return all;
		return all.filter((opt) => this.normalizeForSearch(opt.label).includes(q) || this.normalizeForSearch(opt.id).includes(q));
	}

	private normalizeForSearch(value: string): string {
		return String(value || '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.trim();
	}

	private unifilarGroupKey(slug: string): string {
		return String(slug || '').trim().toLowerCase();
	}

	private formatUnifilarSlug(slug: string): string {
		const cleaned = String(slug || '')
			.replace(/[_-]+/g, ' ')
			.trim();
		if (!cleaned) return 'Sans catégorie';
		return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
	}

	private pickIecKeyFromSlug(tableSlug: string): IecSymbolKey {
		const s = String(tableSlug || '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/_/g, '-');
		/* Alimentation / poste source */
		if (s.includes('poste') && s.includes('source') && !/(transfo|transform|cellule)/.test(s)) return 'source';
		if (/(^|\/)(source|aliment)(\/|-|$)/.test(s) && !/(transfo|transform|cellule)/.test(s)) return 'source';
		if (/(^|\/)(producteur|distributeur-sourc)/.test(s) && !/(transfo|cellule)/.test(s)) return 'source';
		/* Appareillage */
		if (/(disjonct|int-disj)/.test(s) && !/sectionneur/.test(s)) return 'disjoncteur';
		if (/(parafoudre|parafoud|eclair-foudr|foudr-paraf|paraf-)/.test(s)) return 'parafoudre';
		if (/(sectionneur|santoni|interrupteur-isolation)/.test(s) && !/parafoudre|disjonct/.test(s)) return 'sectionneur';
		if (/(coupure-resea|ouvert-coup|point-coupure|mise-hors-tens)/.test(s) || s.startsWith('coupure-')) {
			return 'coupure';
		}
		/* Lignes HTA / BT */
		if (s.includes('hta') && (s.includes('ligne') || s.includes('troncon') || s.includes('cable') || s.includes('segment'))) {
			return 'hta';
		}
		if (/(^|\/)ligne-hta|troncon-hta|cable-hta|segment-hta/.test(s) || s.includes('haute-tens')) {
			if (s.includes('ligne') || s.includes('troncon') || s.includes('cable') || s.includes('lign')) return 'hta';
		}
		if (
			(s.includes('bt') || s.includes('basse')) &&
			(s.includes('ligne') || s.includes('troncon') || s.includes('cable') || s.includes('segment')) &&
			!s.includes('hta-')
		) {
			return 'bt';
		}
		if (s.includes('poteau')) return 'poteau';
		if (s.includes('autotrans') || s.includes('auto-transf')) return 'autotransfo';
		/* Transfo, cellule */
		if (/(transfo|transform|cellule|ouvrage-mt|mt-bt|moyen.*bas)/.test(s) || s.includes('poste-transf')) {
			return 'mtbt';
		}
		/* Poste cabine (sans transfo) */
		if (s.includes('poste') && (s.includes('cabine') || s.includes('distr') || s.includes('livrais')) && !/(transfo|transform)/.test(s)) {
			return 'poste_cabine';
		}
		/* Abonné / raccordement (éviter « compteur » seul, trop large) */
		if (
			s.includes('abon') ||
			s.includes('branchem') ||
			s.includes('point-livraison') ||
			s.includes('plr-') ||
			(s.includes('compteur') && s.includes('raccord'))
		) {
			return 'abonnes';
		}
		if (/(ligne|troncon|cable|segment)/.test(s)) return 'hta';
		return 'autres';
	}

	private iecIconPath(k: IecSymbolKey): string {
		const base = '/assets/diagramme-icons';
		const f: Record<IecSymbolKey, string> = {
			source: 'iec-generateur',
			hta: 'iec-ligne-hta',
			bt: 'iec-ligne-bt',
			mtbt: 'iec-transfo-mtbt',
			abonnes: 'iec-livraison',
			autres: 'iec-divers',
			poteau: 'iec-poteau',
			poste_cabine: 'iec-poste-cabine',
			disjoncteur: 'iec-disjoncteur',
			sectionneur: 'iec-sectionneur',
			parafoudre: 'iec-parafoudre',
			coupure: 'iec-coupure',
			autotransfo: 'commons-autotransformateur'
		};
		return `${base}/${f[k]}.svg`;
	}

	private pickUnifilarLabel(
		row: Record<string, unknown> | undefined,
		id: string,
		slug: string
	): string {
		if (row) {
			for (const key of [
				'nom',
				'Nom',
				'libelle',
				'libellé',
				'Libellé',
				'name',
				'Name',
				'raison_sociale',
				'code',
				'Code',
				'reference',
				'référence',
				'ref_ouvrage',
				'id_externe'
			]) {
				const v = row[key];
				if (v != null && String(v).trim() !== '') return String(v).trim();
			}
		}
		const fromSlug = slug
			.split(/[-_]/g)
			.filter(Boolean)
			.pop();
		if (fromSlug && fromSlug.length < 40) return fromSlug;
		if (id.length > 14) return id.slice(0, 6) + '…' + id.slice(-4);
		return id;
	}

	private computeSummary(ouvrageIds: { slug: string; id: string }[]): {
		troncons: number;
		points: number;
		autres: number;
	} {
		let troncons = 0;
		let points = 0;
		let autres = 0;
		for (const o of ouvrageIds) {
			const s = this.normalizeSlugForRules(o.slug);
			/* Tronçons : ouvrages linéaires interconnectant les nœuds (même logique que les couches « ligne » côté tracé). */
			if (
				s.includes('ligne') ||
				s.includes('troncon') ||
				s.includes('cable') ||
				s.includes('electricline')
			) {
				troncons++;
			} else if (
				s.includes('poste') ||
				s.includes('poteau') ||
				s.includes('cellule') ||
				s.includes('transfo') ||
				s.includes('abonne') ||
				s.includes('raccordement') ||
				s.includes('compteur') ||
				s.includes('branchement')
			) {
				points++;
			} else autres++;
		}
		return { troncons, points, autres };
	}

	private normalizeSlugForRules(slug: string): string {
		return String(slug || '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '');
	}
}
