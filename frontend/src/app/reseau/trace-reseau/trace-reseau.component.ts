import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { GisApiService, TopologyCorrectResponse } from '../../../services/gis-api.service';
import { forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

const MAP_COLORS = [
	'#ec4899', '#38bdf8', '#22c55e', '#a855f7', '#f97316', '#eab308', '#ef4444', '#3b82f6',
	'#d97706', '#14b8a6', '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9',
	'#10b981', '#6366f1', '#f59e0b', '#fb923c', '#4ade80', '#2dd4bf', '#c084fc', '#f472b6'
];

@Component({
	selector: 'app-trace-reseau',
	standalone: true,
	imports: [CommonModule, FormsModule, Select],
	templateUrl: './trace-reseau.component.html',
	styleUrls: ['./trace-reseau.component.scss']
})
export class TraceReseau implements AfterViewInit, OnDestroy {
	@ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

	sidebarCollapsed = false;
	legendOpen = false;
	resumeOpen = false;
	layersOpen = false;
	mapLoading = false;

	/** Type de point de départ pour le tracé */
	paramTypePoint: string = 'poste_source';
	typePointOptions: { label: string; value: string }[] = [
		{ label: 'Poste source', value: 'poste_source' },
		{ label: 'Poste cabine / Transfo poteau', value: 'poste_transformation' },
		{ label: 'Point de raccordement', value: 'abonne' }
	];

	paramPosteSource: string | null = null;
	paramPosteTransfo: string | null = null;
	paramAbonne: string | null = null;

	posteSourceOptions: { label: string; value: string }[] = [];
	posteTransfoOptions: { label: string; value: string }[] = [];
	abonneOptions: { label: string; value: string }[] = [];

	/** Slug de la table utilisée pour chaque type (détecté au chargement) */
	private slugPosteSource = '';
	private slugPosteTransfo = '';
	private slugAbonne = '';

	/** Couches chargées depuis l’API (un ouvrage par table) */
	couchesReseau: { id: string; label: string; color: string; visible: boolean }[] = [];

	/** Clés (slug:id) des ouvrages du tracé courant pour surligner la carte */
	private traceOuvrageIds = new Set<string>();

	resumeLongueurKm = 0;
	resumePoteaux = 0;
	resumeOuvrages = 0;

	canUndo = false;
	canRedo = false;

	/** Correction de topologie */
	topologyTolerance = 2;
	topologyCorrecting = false;
	topologyResult: (TopologyCorrectResponse & { error?: string }) | null = null;

	private map: unknown = null;
	private layerGroup: unknown = null;
	private initialBounds: unknown = null;
	private slugToLayerGroups = new Map<string, unknown>();
	/** Pour clignoter sur la carte : (slug + ':' + id) -> layer Leaflet */
	private slugIdToLayer = new Map<string, { getBounds?: () => { getCenter?: () => unknown }; getLatLng?: () => { lat: number; lng: number } }>();
	/** Groupe Leaflet pour le cercle de clignotement */
	private highlightLayerGroup: { addLayer: (l: unknown) => void; clearLayers: () => void } | null = null;
	private blinkCircle: unknown = null;
	private blinkInterval: ReturnType<typeof setInterval> | null = null;

	constructor(
		private gisApi: GisApiService,
		private cdr: ChangeDetectorRef
	) {}

	ngOnInit(): void {
		this.loadOptionsForTrace();
	}

	ngAfterViewInit(): void {
		this.initMap();
	}

	ngOnDestroy(): void {
		this.stopBlink();
		if (this.map && typeof (this.map as { remove?: () => void }).remove === 'function') {
			(this.map as { remove: () => void }).remove();
			this.map = null;
		}
	}

	/** Charge les listes poste source, poste transfo, point de raccordement depuis les tables API. */
	private loadOptionsForTrace(): void {
		if (!this.gisApi) return;
		this.gisApi.getTables().subscribe((tables) => {
			const bySlug = new Map(tables.map((t) => [t.slug.toLowerCase(), t]));
			// Poste source : préférer poste-source, sinon limite-poste
			const posteSourceSlug = bySlug.has('poste-source') ? 'poste-source' : [...bySlug.keys()].find((s) => s.includes('poste-sourc') || s.includes('limite-poste'));
			if (posteSourceSlug && !this.slugPosteSource) {
				const t = bySlug.get(posteSourceSlug)!;
				this.slugPosteSource = t.slug;
				this.gisApi.getList(t.slug, 200, 0).subscribe((rows) => {
					this.posteSourceOptions = this.buildOptionsFromRows(rows, ['numero_poste', 'assetid', 'name', 'objectid', 'gid'], 'Poste source');
					if (this.posteSourceOptions.length > 0) this.paramPosteSource = this.posteSourceOptions[0].value;
					this.cdr.markForCheck();
				});
			}
			// Poste transformation : prioriser poste-cabine puis transfo-poteau, sinon fallback transfo-ht-bt
			const transfoSlug =
				bySlug.has('poste-cabine') ? 'poste-cabine'
					: bySlug.has('transfo-poteau') ? 'transfo-poteau'
						: bySlug.has('transfo-ht-bt') ? 'transfo-ht-bt'
							: [...bySlug.keys()].find((s) =>
								(s.includes('poste') && s.includes('cabine'))
								|| (s.includes('transfo') && s.includes('poteau'))
								|| (s.includes('transfo') && s.includes('ht') && s.includes('bt'))
							);
			if (transfoSlug && !this.slugPosteTransfo) {
				const t = bySlug.get(transfoSlug)!;
				this.slugPosteTransfo = t.slug;
				this.gisApi.getList(t.slug, 200, 0).subscribe((rows) => {
					this.posteTransfoOptions = this.buildOptionsFromRows(rows, ['numero', 'code_poste', 'code_transfo', 'distributionstationcode', 'transformercode', 'name', 'gid'], 'Poste transfo');
					if (this.posteTransfoOptions.length > 0) this.paramPosteTransfo = this.posteTransfoOptions[0].value;
					this.cdr.markForCheck();
				});
			}
			// Point de raccordement : prioriser point-raccordement, fallback ancien abonne/branchement
			const abonneSlug =
				bySlug.has('point-raccordement') ? 'point-raccordement'
					: bySlug.has('abonne') ? 'abonne'
						: bySlug.has('branchement') ? 'branchement'
							: [...bySlug.keys()].find((s) => (s.includes('point') && s.includes('raccord')) || s.includes('abonne') || s.includes('branchement'));
			if (abonneSlug && !this.slugAbonne) {
				const t = bySlug.get(abonneSlug)!;
				this.slugAbonne = t.slug;
				this.gisApi.getList(t.slug, 200, 0).subscribe((rows) => {
					this.abonneOptions = this.buildOptionsFromRows(rows, ['numero', 'numero_abonne', 'num_abonne', 'nom', 'code_client', 'subscribernumber', 'subscribername', 'meternumber', 'customercode', 'name', 'gid'], 'Point raccordement');
					if (this.abonneOptions.length > 0) this.paramAbonne = this.abonneOptions[0].value;
					this.cdr.markForCheck();
				});
			}
			this.cdr.markForCheck();
		});
	}

	private buildOptionsFromRows(
		rows: Record<string, unknown>[],
		labelFields: string[],
		fallbackPrefix: string
	): { label: string; value: string }[] {
		// Valeur = clé primaire (gid pour poste_source/transfo_ht_bt/branchement, id ou gid selon table)
		const getPkValue = (r: Record<string, unknown>): string =>
			String(r['gid'] ?? r['id'] ?? r['objectid'] ?? '').trim();
		const seen = new Set<string>();
		return (rows || [])
			.filter((r) => {
				const id = getPkValue(r);
				if (!id || seen.has(id)) return false;
				seen.add(id);
				return true;
			})
			.map((r) => {
				let label = '';
				for (const f of labelFields) {
					const v = r[f];
					if (v != null && String(v).trim() !== '') {
						label = String(v).trim();
						break;
					}
				}
				const idVal = getPkValue(r);
				if (!label || label === idVal) label = `${fallbackPrefix} ${idVal}`.trim();
				return { label, value: idVal };
			});
	}

	onTypePointChange(): void {
		this.cdr.markForCheck();
		this.onSelectionChange();
	}

	/** Sélectionne un point de départ depuis la liste des éléments utilisables pour les tracés */
	selectElement(type: 'poste_source' | 'poste_transformation' | 'abonne', value: string): void {
		this.paramTypePoint = type;
		if (type === 'poste_source') {
			this.paramPosteSource = value;
			this.paramPosteTransfo = null;
			this.paramAbonne = null;
		} else if (type === 'poste_transformation') {
			this.paramPosteTransfo = value;
			this.paramPosteSource = null;
			this.paramAbonne = null;
		} else {
			this.paramAbonne = value;
			this.paramPosteSource = null;
			this.paramPosteTransfo = null;
		}
		this.onSelectionChange();
		this.cdr.markForCheck();
	}

	/** Appelé quand l’utilisateur change le poste source, poste transfo ou abonné sélectionné → clignoter sur la carte */
	onSelectionChange(): void {
		console.log('[Trace réseau] Sélection changée', {
			type: this.paramTypePoint,
			id: this.getSelectedId(),
			slug: this.getSlugForCurrentType()
		});
		setTimeout(() => this.highlightSelectionOnMap(), 0);
	}

	private getSlugForCurrentType(): string {
		if (this.paramTypePoint === 'poste_source') return this.slugPosteSource;
		if (this.paramTypePoint === 'poste_transformation') return this.slugPosteTransfo;
		if (this.paramTypePoint === 'abonne') return this.slugAbonne;
		return '';
	}

	private getSelectedId(): string {
		if (this.paramTypePoint === 'poste_source' && this.paramPosteSource) return this.paramPosteSource;
		if (this.paramTypePoint === 'poste_transformation' && this.paramPosteTransfo) return this.paramPosteTransfo;
		if (this.paramTypePoint === 'abonne' && this.paramAbonne) return this.paramAbonne;
		return '';
	}

	private stopBlink(): void {
		if (this.blinkInterval) {
			clearInterval(this.blinkInterval);
			this.blinkInterval = null;
			console.log('[Trace réseau] Clignotement arrêté');
		}
		if (this.highlightLayerGroup && this.blinkCircle) {
			this.highlightLayerGroup.clearLayers();
			this.blinkCircle = null;
		}
	}

	/** Centre la carte sur l’élément sélectionné et fait clignoter un cercle. */
	private highlightSelectionOnMap(): void {
		const slug = this.getSlugForCurrentType();
		const id = this.getSelectedId();
		if (!slug || !id || !this.map) {
			return;
		}
		const normalizeId = (v: unknown): string => String(v ?? '').replace(/^\{|\}$/g, '').trim().toLowerCase();
		const idNorm = String(id).replace(/^\{|\}$/g, '');
		const idCanonical = normalizeId(id);
		const idNum = Number(id);
		let entry =
			this.slugIdToLayer.get(`${slug}:${id}`) ??
			this.slugIdToLayer.get(`${slug}:${idNorm}`) ??
			this.slugIdToLayer.get(`${slug}:{${idNorm}}`) ??
			this.slugIdToLayer.get(`${slug}:${idNorm.toLowerCase()}`) ??
			(!Number.isNaN(idNum) ? this.slugIdToLayer.get(`${slug}:${idNum}`) : null);
		const hasLayerGeometry = !!entry && (typeof entry.getBounds === 'function' || typeof entry.getLatLng === 'function');
		if (!hasLayerGeometry) {
			for (const [key, layer] of this.slugIdToLayer) {
				const colon = key.indexOf(':');
				if (colon < 0) continue;
				const hasGeometry = !!layer && (typeof layer.getBounds === 'function' || typeof layer.getLatLng === 'function');
				if (!hasGeometry) continue;
				const keySlug = key.slice(0, colon);
				const keyId = key.slice(colon + 1);
				if (keySlug.toLowerCase() !== slug.toLowerCase()) continue;
				const keyCanonical = normalizeId(keyId);
				if (keyCanonical === idCanonical || (keyId === String(idNum) && !Number.isNaN(idNum))) {
					entry = layer;
					break;
				}
			}
		}
		const hasEntryGeometry = !!entry && (typeof entry.getBounds === 'function' || typeof entry.getLatLng === 'function');
		if (!hasEntryGeometry) {
			return;
		}
		const b = typeof entry.getBounds === 'function' ? entry.getBounds() : null;
		const center =
			b && typeof (b as { getCenter?: () => unknown }).getCenter === 'function'
				? (b as { getCenter: () => unknown }).getCenter()
				: typeof entry.getLatLng === 'function'
					? entry.getLatLng()
					: null;
		if (!center) return;
		const latLng = Array.isArray(center) ? center : [(center as { lat: number }).lat, (center as { lng: number }).lng];
		this.stopBlink();
		import('leaflet').then((LMod) => {
			const L = (LMod as { default: unknown }).default as {
				circleMarker: (latlng: unknown, opts: object) => { addTo: (m: unknown) => unknown; setStyle: (s: object) => void; setRadius: (n: number) => void; bringToFront: () => void };
				layerGroup: () => { addTo: (m: unknown) => unknown; addLayer: (l: unknown) => void; clearLayers: () => void };
			};
			if (!this.highlightLayerGroup) return;
			const marker = L.circleMarker(latLng, {
				radius: 28,
				color: '#ea580c',
				weight: 4,
				fillColor: '#ea580c',
				fillOpacity: 0.5
			});
			this.highlightLayerGroup.addLayer(marker);
			const hlg = this.highlightLayerGroup as unknown as { bringToFront?: () => void };
			if (hlg.bringToFront) hlg.bringToFront();
			(marker as unknown as { bringToFront?: () => void }).bringToFront?.();
			this.blinkCircle = marker;
			let radius = 28;
			let growing = true;
			this.blinkInterval = setInterval(() => {
				if (!this.blinkCircle) return;
				radius = growing ? radius + 4 : radius - 4;
				if (radius >= 40) growing = false;
				if (radius <= 18) growing = true;
				(marker as { setRadius: (n: number) => void }).setRadius(radius);
				(marker as { setStyle: (s: object) => void }).setStyle({
					fillOpacity: growing ? 0.6 : 0.3,
					weight: growing ? 5 : 2
				});
			}, 150);
			setTimeout(() => {
				this.stopBlink();
			}, 4000);
			const m = this.map as {
				fitBounds?: (b: unknown, o?: object) => void;
				setView?: (center: [number, number] | unknown, zoom?: number, opts?: object) => void;
			};
			if (m?.fitBounds && b) {
				m.fitBounds(b, { padding: [80, 80], maxZoom: 18 });
			} else if (m?.setView && latLng) {
				m.setView(latLng, 18, { animate: true });
			}
		});
	}

	/** True si un point de départ est sélectionné selon le type */
	hasSelection(): boolean {
		if (this.paramTypePoint === 'poste_source') return this.paramPosteSource != null && this.paramPosteSource !== '';
		if (this.paramTypePoint === 'poste_transformation') return this.paramPosteTransfo != null && this.paramPosteTransfo !== '';
		if (this.paramTypePoint === 'abonne') return this.paramAbonne != null && this.paramAbonne !== '';
		return false;
	}

	/** Retourne l’identifiant du point sélectionné selon le type */
	private getSelectedRefId(): string {
		if (this.paramTypePoint === 'poste_source' && this.paramPosteSource) return this.paramPosteSource;
		if (this.paramTypePoint === 'poste_transformation' && this.paramPosteTransfo) return this.paramPosteTransfo;
		if (this.paramTypePoint === 'abonne' && this.paramAbonne) return this.paramAbonne;
		return '';
	}

	/** Lance la correction de topologie (snap des lignes vers les nœuds). */
	lancerCorrectionTopologie(): void {
		this.topologyResult = null;
		this.topologyCorrecting = true;
		this.cdr.markForCheck();
		this.gisApi.correctTopology(this.topologyTolerance).pipe(
			catchError((err) => {
				this.topologyCorrecting = false;
				this.topologyResult = { corrected: 0, by_table: {}, error: err?.message || 'Erreur lors de la correction.' };
				this.cdr.markForCheck();
				return of(this.topologyResult);
			})
		).subscribe((res) => {
			this.topologyCorrecting = false;
			this.topologyResult = res;
			this.cdr.markForCheck();
			if (res.corrected > 0) this.loadGeometries();
		});
	}

	getTopologyDetails(): { slug: string; updated: number }[] {
		if (!this.topologyResult?.by_table) return [];
		return Object.entries(this.topologyResult.by_table)
			.filter(([, v]) => v.updated > 0)
			.map(([slug, v]) => ({ slug, updated: v.updated }));
	}

	tracerAmont(): void {
		this.runTrace('amont');
	}

	tracerAval(): void {
		this.runTrace('aval');
	}

	/** Lance le tracé amont ou aval et affiche les ouvrages connectés */
	private runTrace(direction: 'amont' | 'aval'): void {
		const refId = this.getSelectedRefId();
		if (!refId) return;
		this.mapLoading = true;
		this.cdr.markForCheck();
		this.gisApi.getTrace(this.paramTypePoint, refId, direction).pipe(
			catchError(() => of({ ouvrage_ids: [] }))
		).subscribe({
			next: (res) => {
				this.mapLoading = false;
				this.applyTraceResult(res.ouvrage_ids || []);
				this.cdr.markForCheck();
			},
			error: () => {
				this.mapLoading = false;
				this.cdr.markForCheck();
			}
		});
	}

	/** Affiche sur la carte uniquement les ouvrages du tracé (ou tous si liste vide). */
	private applyTraceResult(ouvrageIds: { slug: string; id: string }[]): void {
		// Pour l’instant : si le backend renvoie des IDs, on pourrait masquer les couches non concernées ou surligner.
		// Ici on garde l’affichage actuel ; à étendre quand le backend renverra les géométries ou IDs.
		this.traceOuvrageIds = new Set(ouvrageIds.map((o) => `${o.slug}:${o.id}`));
		this.resumeOuvrages = ouvrageIds.length;
		this.resumePoteaux = ouvrageIds.filter((o) => this.isPointSlug(o.slug)).length;
		this.resumeLongueurKm = 0;
		this.applyTraceStyleToMap();
		this.cdr.markForCheck();
	}

	private isPointSlug(slug: string): boolean {
		const s = slug.toLowerCase();
		return /poteau|pole|transfo|poste|abonne|branchement|noeud|junction/.test(s) && !/ligne|electricline/.test(s);
	}

	private applyTraceStyleToMap(): void {
		const highlight = { opacity: 1, fillOpacity: 0.7, weight: 6 };
		const dimmed = { opacity: 0.2, fillOpacity: 0.15, weight: 2 };
		this.slugIdToLayer.forEach((layer, key) => {
			const setStyle = (layer as { setStyle?: (s: object) => void }).setStyle;
			if (setStyle) {
				setStyle.call(layer, this.traceOuvrageIds.size === 0 || this.traceOuvrageIds.has(key) ? highlight : dimmed);
			}
		});
	}

	toggleCouche(layer: { id: string; label: string; color: string; visible: boolean }): void {
		const slugs = this.getSlugsForLayerId(layer.id);
		const mainGroup = this.layerGroup as { addLayer: (l: unknown) => void; removeLayer: (l: unknown) => void } | null;
		if (!mainGroup) return;
		for (const slug of slugs) {
			const group = this.slugToLayerGroups.get(slug);
			if (!group) continue;
			if (layer.visible) {
				mainGroup.addLayer(group);
			} else {
				mainGroup.removeLayer(group);
			}
		}
		this.cdr.markForCheck();
	}

	/** Retourne les slugs API pour ce layerId (un layer = un slug = une table ouvrages). */
	private getSlugsForLayerId(layerId: string): string[] {
		return this.slugToLayerGroups.has(layerId) ? [layerId] : [];
	}

	demarrerTrace(): void {}

	/** Efface le tracé : restaure l'affichage normal et réinitialise le résumé. */
	effacerTrace(): void {
		this.traceOuvrageIds = new Set();
		this.resumeOuvrages = 0;
		this.resumePoteaux = 0;
		this.resumeLongueurKm = 0;
		this.applyTraceStyleToMap();
		this.cdr.markForCheck();
	}

	/** Exporte la liste des ouvrages du tracé courant en JSON. */
	exporterTrace(): void {
		const list = Array.from(this.traceOuvrageIds).map((key) => {
			const [slug, id] = key.split(/:(.*)/);
			return { slug, id };
		});
		const blob = new Blob([JSON.stringify({ ouvrage_ids: list }, null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `trace-reseau-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	resetMapView(): void {
		const m = this.map as { fitBounds?: (b: unknown, o?: object) => void } | null;
		if (this.initialBounds && m?.fitBounds) {
			m.fitBounds(this.initialBounds, { padding: [40, 40], maxZoom: 16 });
		}
	}

	undo(): void {}
	redo(): void {}

	buildPopupContent(props: Record<string, unknown>): string {
		if (!props || typeof props !== 'object') return '';
		const { _layerLabel, _layerSlug, geom, Geom, ...rest } = props;
		const title = _layerLabel != null ? String(_layerLabel) : '';
		const rawEntries = Object.entries(rest)
			.filter(([, v]) => v != null && v !== '')
			.map(([k, v]) => ({
				key: k,
				label: this.formatPopupKey(k),
				val: typeof v === 'object' && (v as { toISOString?: () => string })?.toISOString
					? (v as { toISOString: () => string }).toISOString().slice(0, 10)
					: String(v).length > 80 ? String(v).slice(0, 77) + '…' : String(v)
			}));
		const ordered = this.orderPopupEntries(rawEntries);
		let html = '<div class="map-popup">';
		if (title) html += `<div class="map-popup-header"><i class="fa fa-info-circle map-popup-icon"></i><span>${this.escapeHtml(title)}</span></div>`;
		html += '<div class="map-popup-body">';
		ordered.forEach((e, i) => {
			html += `<div class="map-popup-row ${i % 2 === 0 ? 'map-popup-row--even' : ''}"><span class="map-popup-key">${this.escapeHtml(e.label)}</span><span class="map-popup-val">${this.escapeHtml(e.val)}</span></div>`;
		});
		html += '</div></div>';
		return html;
	}

	/** Ordre préférentiel des champs dans la popup (identité en premier, puis technique, audit à la fin). */
	private orderPopupEntries(entries: { key: string; label: string; val: string }[]): { key: string; label: string; val: string }[] {
		const priority = [
			'nameofsubcriber', 'firstname', 'subscribername', 'subscribernumber', 'meternumber', 'customercode',
			'section', 'batch', 'plot', 'rank', 'id', 'objectid',
			'customertype', 'use', 'amperage', 'codesticker', 'customernature', 'typeofframe',
			'created_date', 'created_user', 'last_edited_date', 'last_edited_user', 'globalid', 'username'
		];
		const byKey = new Map(entries.map((e) => [e.key.toLowerCase(), e]));
		const ordered: typeof entries = [];
		for (const k of priority) {
			const e = byKey.get(k);
			if (e) {
				ordered.push(e);
				byKey.delete(k);
			}
		}
		byKey.forEach((e) => ordered.push(e));
		return ordered;
	}

	private formatOuvrageLabel(slugOrTable: string): string {
		return slugOrTable.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	private formatPopupKey(key: string): string {
		const labels: Record<string, string> = {
			id: 'ID', objectid: 'Object ID', globalid: 'Global ID',
			created_date: 'Date de création', last_edited_date: 'Dernière modification',
			created_user: 'Créé par', last_edited_user: 'Modifié par',
			username: 'Utilisateur', assetgroup: 'Groupe', shape_length: 'Longueur (m)', nominalvoltage: 'Tension nominale',
			section: 'Section', batch: 'Lot', plot: 'Îlot', rank: 'Rang',
			meternumber: 'N° compteur', subscribernumber: 'N° abonné', subscribername: 'Nom abonné', customercode: 'Code client',
			nameofsubcriber: 'Nom', firstname: 'Prénom', codesticker: 'Code pastille', amperage: 'Ampérage',
			customernature: 'Nature client', customertype: 'Type client', use: 'Usage', typeofframe: 'Type de cadre',
			exploitation: 'Exploitation', useofotherenergysource: 'Autre source d\'énergie', institutioncategory: 'Catégorie institution',
			administrationcategory: 'Catégorie administration', activities: 'Activités', secondaryueofactivity: 'Activité secondaire',
			qualityverified: 'Qualité vérifiée', transformationreport: 'Rapport transformation', connectiontype: 'Type de connexion'
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

	private initMap(): void {
		if (!this.mapContainer?.nativeElement || !this.gisApi) return;
		import('leaflet').then((L: { default: unknown }) => {
			const Lx = L.default as {
				map: (el: HTMLElement, opts: object) => { invalidateSize?: () => void; fitBounds?: (b: unknown, o?: object) => void };
				tileLayer: (url: string, opts: object) => { addTo: (m: unknown) => unknown };
				control: { zoom: (opts: object) => { addTo: (m: unknown) => unknown } };
				layerGroup: () => { addTo: (m: unknown) => unknown; addLayer: (l: unknown) => void; removeLayer: (l: unknown) => void };
			};
			this.map = Lx.map(this.mapContainer.nativeElement, {
				center: [12.3715, -1.5197],
				zoom: 13,
				zoomControl: false
			});
			Lx.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '© OpenStreetMap contributors'
			}).addTo(this.map);
			Lx.control.zoom({ position: 'topleft' }).addTo(this.map);
			this.layerGroup = Lx.layerGroup().addTo(this.map) as { addLayer: (l: unknown) => void; removeLayer: (l: unknown) => void };
			this.highlightLayerGroup = Lx.layerGroup().addTo(this.map) as { addLayer: (l: unknown) => void; clearLayers: () => void };
			setTimeout(() => this.loadGeometries(), 150);
		});
	}

	private loadGeometries(): void {
		if (!this.map || !this.layerGroup || !this.gisApi) return;
		this.mapLoading = true;
		this.gisApi.getTables().pipe(
			switchMap((tables) => {
				if (tables.length === 0) return of([]);
				return forkJoin(
					tables.map((t, i) =>
						this.gisApi.getList(t.slug, 500, 0).pipe(
							map((rows: Record<string, unknown>[]) => ({
								slug: t.slug,
								table: t.table,
								rows,
								color: MAP_COLORS[i % MAP_COLORS.length],
								label: this.formatOuvrageLabel(t.table || t.slug)
							})),
							catchError(() => of({ slug: t.slug, table: t.table, rows: [] as Record<string, unknown>[], color: MAP_COLORS[i % MAP_COLORS.length], label: this.formatOuvrageLabel(t.table || t.slug) }))
						)
					)
				);
			})
		).subscribe({
			next: (results) => {
				Promise.all([import('leaflet'), import('wellknown').then((w) => w.default ?? w)]).then(([LModule, wellknown]) => {
					const leaflet = (LModule as { default: unknown }).default as {
						geoJSON: (f: object, opts: object) => { eachLayer: (fn: (layer: unknown) => void) => void };
						circleMarker: (latlng: unknown, opts: object) => unknown;
						layerGroup: () => { addLayer: (l: unknown) => void };
					};
					const group = this.layerGroup as { addLayer: (l: unknown) => void };
					let bounds: unknown = null;
					const wk = (wellknown as { parse?: (wkt: string) => unknown }).parse ?? (wellknown as { default?: { parse: (wkt: string) => unknown } }).default?.parse;
					const parseWkt = typeof wk === 'function' ? wk : ((): null => null);
					const normalizeWkt = (wkt: string): string => {
						let s = String(wkt).replace(/^SRID=\d+;/i, '').trim();
						const hasZm = /\s+ZM\s*\(/i.test(s);
						const hasZ = /\s+Z\s*\(/i.test(s);
						s = s.replace(/\s+ZM\b/gi, '').replace(/\s+Z\b/gi, '').replace(/\s+M\b/gi, '');
						if (hasZm) s = s.replace(/(\s*-?\d+\.?\d*\s+-?\d+\.?\d*)\s+-?\d+\.?\d*\s+-?\d+\.?\d*/g, '$1');
						else if (hasZ) s = s.replace(/(\s*-?\d+\.?\d*\s+-?\d+\.?\d*)\s+-?\d+\.?\d*/g, '$1');
						return s;
					};
					const isLineTable = (s: string) => /ligne|electricline/.test(s);
					const sortedResults = [...(results as { slug: string; table: string; rows: Record<string, unknown>[]; color: string; label: string }[])].sort((a, b) =>
						isLineTable(a.slug) === isLineTable(b.slug) ? 0 : isLineTable(a.slug) ? 1 : -1
					);
					const self = this;
					self.slugIdToLayer.clear();
					const couches: { id: string; label: string; color: string; visible: boolean }[] = [];
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
								features.push({ type: 'Feature', geometry: geom, properties: { _layerLabel: label, _layerSlug: slug, ...rest } });
							} catch {
								// ignore
							}
						}
						if (features.length === 0) continue;
						const isLine = isLineTable(slug);
						const style = { color, weight: isLine ? 5 : 2, opacity: 0.9, fillColor: color, fillOpacity: 0.5 };
						const slugGroup = (leaflet as { layerGroup?: () => { addLayer: (l: unknown) => void } }).layerGroup?.();
						if (!slugGroup) continue;
						const fc = { type: 'FeatureCollection' as const, features };
						const geoJsonLayer = leaflet.geoJSON(fc, {
							style: () => style,
							pointToLayer: (_: unknown, latlng: unknown) => leaflet.circleMarker(latlng, { ...style, radius: 8 }),
							onEachFeature: (feature: { properties?: Record<string, unknown> }, layer: { bindPopup: (content: string, opts?: { maxWidth?: number }) => void; feature?: unknown }) => {
								(layer as { feature?: unknown }).feature = feature;
								const props = feature.properties ?? {};
								layer.bindPopup(self.buildPopupContent(props), { maxWidth: 400 });
							}
						});
						geoJsonLayer.eachLayer((l: unknown) => {
							(slugGroup as { addLayer: (l: unknown) => void }).addLayer(l);
							const withBounds = l as { getBounds?: () => { getCenter?: () => unknown }; getLatLng?: () => { lat: number; lng: number } };
							const withFeature = l as { feature?: { properties?: Record<string, unknown> } };
							const props = withFeature.feature?.properties ?? {};
							const id = props['id'] != null ? String(props['id']) : '';
							const gid = props['gid'] != null ? String(props['gid']) : '';
							const objectid = props['objectid'] != null ? String(props['objectid']) : '';
							const setLayerKey = (keyId: string) => {
								if (!keyId) return;
								self.slugIdToLayer.set(`${slug}:${keyId}`, withBounds);
								const norm = String(keyId).replace(/^\{|\}$/g, '');
								if (norm !== keyId) self.slugIdToLayer.set(`${slug}:${norm}`, withBounds);
								const normLower = norm.toLowerCase();
								if (normLower !== norm) self.slugIdToLayer.set(`${slug}:${normLower}`, withBounds);
								const num = Number(keyId);
								if (!Number.isNaN(num)) self.slugIdToLayer.set(`${slug}:${num}`, withBounds);
							};
							const hasLayerGeometry = typeof withBounds.getBounds === 'function' || typeof withBounds.getLatLng === 'function';
							if (hasLayerGeometry) {
								if (id) setLayerKey(id);
								if (gid) setLayerKey(gid);
								if (objectid) setLayerKey(objectid);
							}
							if (withBounds.getBounds) {
								const b = withBounds.getBounds();
								if (bounds && typeof (bounds as { extend: (x: unknown) => unknown }).extend === 'function') {
									(bounds as { extend: (x: unknown) => unknown }).extend(b);
								} else {
									bounds = b;
								}
							}
						});
						group.addLayer(slugGroup);
						this.slugToLayerGroups.set(slug, slugGroup);
						couches.push({ id: slug, label, color, visible: true });
					}
					this.couchesReseau = couches;
					this.initialBounds = bounds ?? this.initialBounds;
					const m = this.map as { fitBounds?: (b: unknown, o?: object) => void; invalidateSize?: () => void };
					if (m?.invalidateSize) m.invalidateSize();
					if (bounds && m?.fitBounds) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
					this.mapLoading = false;
					this.cdr.markForCheck();
					setTimeout(() => self.highlightSelectionOnMap(), 0);
				});
			},
			error: () => {
				this.mapLoading = false;
				this.cdr.markForCheck();
			}
		});
	}
}
