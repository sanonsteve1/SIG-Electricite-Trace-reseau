import { AfterViewChecked, AfterViewInit, Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GisApiService, SchemaUnifilaireResponse, SchemaUnifilaireNode, SchemaUnifilaireEdge } from '../../../services/gis-api.service';

@Component({
	selector: 'app-schema-reseau',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './schema-reseau.component.html',
	styleUrls: ['./schema-reseau.component.scss']
})
export class SchemaReseau implements OnInit, AfterViewInit, AfterViewChecked {
	data: SchemaUnifilaireResponse | null = null;
	loading = false;
	error: string | null = null;
	selectedNodeId: string | null = null;
	popupNode: SchemaUnifilaireNode | null = null;
	popupPosition = { left: 16, top: 16 };
	popupDetailsLoading = false;
	popupDetailsError: string | null = null;
	popupDetailsEntries: { key: string; value: string }[] = [];
	private readonly popupWidth = 300;
	@ViewChild('schemaSvg') private schemaSvgRef?: ElementRef<SVGSVGElement>;
	@ViewChild('svgWrap') private svgWrapRef?: ElementRef<HTMLDivElement>;

	/** Ouvrage pour lequel générer le schéma (obligatoire) */
	refId = '';
	/** Type d'ouvrage (comme le tracé) */
	typeOuvrage: 'poste_source' | 'poste_transformation' | 'abonne' | 'ouvrage' = 'ouvrage';
	/** Direction du tracé connecté */
	direction: 'amont' | 'aval' | 'tous' = 'tous';

	/** Afficher les flèches de flux électrique (source → consommateurs) */
	showFlux = false;

	/** Afficher les labels des tronçons / câbles sur les arêtes */
	showEdgeLabels = true;

	/** Mode de rendu : hiérarchique (arbre sans chevauchement) ou géographique (coordonnées SIG brutes) */
	layoutMode: 'hierarchical' | 'geographic' = 'hierarchical';
	/** Positions calculées par l'algorithme de disposition en arbre (Reingold-Tilford simplifié) */
	private layoutPositions = new Map<string, { x: number; y: number }>();
	/** Décalages manuels appliqués après glisser-déposer d'un nœud */
	private nodeOffsets = new Map<string, { x: number; y: number }>();
	/** Facteur d'échelle pixel/unité SVG (non utilisé en pan+zoom — gardé pour compatibilité) */
	readonly layoutScale = 1;

	/** ViewBox courant en mode hiérarchique (modifié par zoom/pan) */
	private hierVB = { x: 0, y: 0, w: 0, h: 0 };
	/** État du glisser-déposer */
	protected isPanning = false;
	private panStartNorm = { x: 0, y: 0 };
	private panStartOrigin = { x: 0, y: 0 };
	private isDraggingNode = false;
	private draggedNodeId: string | null = null;
	private dragStartSvg = { x: 0, y: 0 };
	private dragStartNodePos = { x: 0, y: 0 };
	private dragMoved = false;
	/** Listener wheel non-passif (doit être enregistré hors Angular) */
	private wheelListenerAdded = false;

	readonly margin = 60;

	/**
	 * Points du triangle directionnel.
	 * Strictement proportionnel à hierVB.w → taille visuelle constante (~8 px)
	 * quel que soit le niveau de zoom. Aucun plafond/plancher.
	 */
	get fluxArrowPointsScaled(): string {
		const s = this.hierVB.w > 0 ? this.hierVB.w / 470 : 4.8;
		return `${s},0 ${-s * 0.45},${-s * 0.45} ${-s * 0.45},${s * 0.45}`;
	}

	/**
	 * stroke-dasharray proportionnel au viewBox → tirets toujours ~20 px visuels.
	 * Aucun plafond/plancher.
	 */
	get fluxDashArrayValue(): string {
		const d = this.hierVB.w > 0 ? this.hierVB.w / 40 : 12;
		return `${d} ${d * 0.5}`;
	}

	/** Longueur d'un cycle tiret+espace (pour l'animation CSS). */
	get fluxDashCycle(): number {
		const d = this.hierVB.w > 0 ? this.hierVB.w / 40 : 12;
		return d * 1.5;
	}

	/**
	 * Couleurs symboles — palette type synoptique SCADA (contraste sur fond clair).
	 */
	readonly symbolColors: Record<string, string> = {
		'sym-poste-source': '#ea580c',
		'sym-poste-cabine': '#0284c7',
		'sym-transfo-bt': '#0ea5e9',
		'sym-depart-hta': '#0891b2',
		'sym-depart-bt': '#16a34a',
		'sym-poteau-hta': '#3b82f6',
		'sym-poteau-bt': '#22c55e',
		'sym-cellule': '#7c3aed',
		'sym-parafoudre': '#10b981',
		'sym-point-raccordement': '#f97316',
		'sym-abonne': '#c2410c',
		'sym-compteur': '#b45309',
		'sym-branchement': '#d97706',
		'sym-ouvrage': '#64748b'
	};
	readonly symbolLabels: Record<string, string> = {
		'sym-poste-source': 'Poste source',
		'sym-poste-cabine': 'Poste cabine',
		'sym-transfo-bt': 'Transformateur',
		'sym-depart-hta': 'Depart HTA',
		'sym-depart-bt': 'Depart BT',
		'sym-poteau-hta': 'Poteau HTA',
		'sym-poteau-bt': 'Poteau BT',
		'sym-cellule': 'Cellule',
		'sym-parafoudre': 'Parafoudre',
		'sym-point-raccordement': 'Raccordement',
		'sym-abonne': 'Abonne',
		'sym-compteur': 'Compteur',
		'sym-branchement': 'Branchement',
		'sym-ouvrage': 'Ouvrage'
	};

	/** Couleurs des liaisons par type de ligne (niveau de tension métier) */
	readonly lineTypeColors: Record<string, string> = {
		'ligne-hta': '#0891b2',   // Cyan HTA
		'ligne-bt': '#16a34a',    // Vert BT
		'ligne-brcht': '#f97316'  // Orange branchement
	};

	/** Légende « niveaux de tension » (affichage type poste) */
	readonly scadaVoltageLegend: { key: string; label: string; color: string; hint: string }[] = [
		{ key: 'htb', label: 'HTB / liaison HT', color: '#ea580c', hint: 'Transport / arrivée poste' },
		{ key: 'hta', label: 'HTA (ex. 20 kV)', color: '#0891b2', hint: 'Distribution moyenne tension' },
		{ key: 'bt', label: 'BT (ex. 400 V)', color: '#16a34a', hint: 'Basse tension' },
		{ key: 'off', label: 'Hors tension / ouvert', color: '#64748b', hint: 'Organes ouverts ou dé-energisé' }
	];
	/** Couleur par défaut si line_type inconnu (et pour petits traits des symboles) */
	readonly edgeColorDefault = '#475569';
	get edgeColor(): string { return this.edgeColorDefault; }

	getSymbolColor(symbol: string): string {
		return this.symbolColors[symbol ?? ''] ?? '#64748b';
	}

	getNodePrimaryLabel(node: SchemaUnifilaireNode): string {
		const raw = String(node.label ?? '').trim();
		if (raw) return raw;
		const [slug] = String(node.id ?? '').split(':');
		return slug || node.id || 'Ouvrage';
	}

	getNodeSecondaryLabel(node: SchemaUnifilaireNode): string {
		const idPart = String(node.id ?? '').split(':').slice(1).join(':').trim() || String(node.id ?? '').trim();
		const type = (this.symbolLabels[node.symbol ?? ''] ?? this.getPanelNodeType(node)) || 'Ouvrage';
		if (!idPart) return type;
		const shortId = idPart.length > 22 ? `${idPart.slice(0, 22)}...` : idPart;
		return `${type} - ${shortId}`;
	}

	getNodeAccentFill(symbol: string): string {
		return this.hexToRgba(this.getSymbolColor(symbol), 0.12);
	}

	private hexToRgba(hex: string, alpha: number): string {
		const v = String(hex || '').trim().replace('#', '');
		const s = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
		if (!/^[0-9a-fA-F]{6}$/.test(s)) return `rgba(100, 116, 139, ${alpha})`;
		const r = parseInt(s.slice(0, 2), 16);
		const g = parseInt(s.slice(2, 4), 16);
		const b = parseInt(s.slice(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	/** Couleur d'une arête selon son type de ligne (HTA / BT / branchement) */
	getEdgeColor(edge: SchemaUnifilaireEdge): string {
		const t = (edge?.line_type ?? '').toLowerCase();
		if (this.lineTypeColors[t]) return this.lineTypeColors[t];
		return this.edgeColorDefault;
	}

	/** Épaisseur liaison type bus / câble (synoptique) */
	getEdgeStrokeWidth(edge: SchemaUnifilaireEdge): number {
		const t = (edge?.line_type ?? '').toLowerCase();
		if (t === 'ligne-hta') return 4;
		if (t === 'ligne-bt') return 3.5;
		if (t === 'ligne-brcht') return 3;
		return 2.5;
	}

	/** Détection liaison souterraine via métadonnées (slug/label/type). */
	isUndergroundEdge(edge: SchemaUnifilaireEdge): boolean {
		const text = `${edge?.line_type ?? ''} ${edge?.source_slug ?? ''} ${edge?.label ?? ''}`.toLowerCase();
		return (
			text.includes('souter') ||
			text.includes('underground') ||
			text.includes('sous-sol') ||
			text.includes('sous_sol')
		);
	}

	/** Motif de trait : souterrain pointillé, aérien plein. */
	getEdgeDashArray(edge: SchemaUnifilaireEdge): string | null {
		return this.isUndergroundEdge(edge) ? '5 4' : null;
	}

	/** Départs / organes de coupure (sym-depart) pour panneau type SCADA */
	get scadaDeparts(): SchemaUnifilaireNode[] {
		return this.nodes.filter((n) => n.symbol === 'sym-depart-hta' || n.symbol === 'sym-depart-bt');
	}

	/** Points avec mesures affichables (T°/U/I/P si présents en base) */
	get scadaMeasurePoints(): SchemaUnifilaireNode[] {
		return this.nodes.filter(
			(n) => n.tension != null || n.courant != null || n.puissance != null
		);
	}

	formatMeasureLine(n: SchemaUnifilaireNode): string {
		const parts: string[] = [];
		if (n.label) parts.push(n.label);
		const m: string[] = [];
		if (n.tension != null) m.push(`U=${n.tension}`);
		if (n.courant != null) m.push(`I=${n.courant}`);
		if (n.puissance != null) m.push(`P=${n.puissance}`);
		if (m.length) parts.push(m.join(' · '));
		return parts.join(' — ') || n.id;
	}

	isDepartOuvert(node: SchemaUnifilaireNode): boolean {
		return (node.state ?? '').toLowerCase() === 'ouvert';
	}

	/** Référence IEC 60617 pour un symbole (pour attributs data-* et accessibilité) */
	getIec60617(symbol: string): string {
		return this.legendEntries.find((e) => e.symbol === symbol)?.iec60617 ?? '';
	}

	/** Nœud logique CEI 61850 pour un symbole (pour attributs data-*) */
	getIec61850(symbol: string): string {
		return this.legendEntries.find((e) => e.symbol === symbol)?.iec61850 ?? '';
	}

	/**
	 * Légende des symboles avec références normatives.
	 * IEC 60617 : symboles graphiques pour schémas électrotechniques.
	 * CEI 61850 : nœuds logiques (Logical Nodes) pour modélisation des équipements.
	 */
	readonly legendEntries: { symbol: string; label: string; iec60617: string; iec61850?: string }[] = [
		{ symbol: 'sym-poste-source', label: 'Poste source', iec60617: '06-02-01', iec61850: 'PTTR' },
		{ symbol: 'sym-poste-cabine', label: 'Poste cabine', iec60617: '06-02-01', iec61850: 'YPTR' },
		{ symbol: 'sym-transfo-bt', label: 'Transformateur MT/BT', iec60617: '06-02-01', iec61850: 'YPTR' },
		{ symbol: 'sym-depart-hta', label: 'Départ HTA / Disjoncteur', iec60617: '07-13-02', iec61850: 'XCBR' },
		{ symbol: 'sym-depart-bt', label: 'Départ BT', iec60617: '07-13-02', iec61850: 'XCBR' },
		{ symbol: 'sym-poteau-hta', label: 'Poteau HTA', iec60617: '—', iec61850: 'XSWI' },
		{ symbol: 'sym-poteau-bt', label: 'Poteau BT', iec60617: '—', iec61850: 'XSWI' },
		{ symbol: 'sym-cellule', label: 'Cellule / OCR / TUR', iec60617: '07-13-02', iec61850: 'XCBR' },
		{ symbol: 'sym-parafoudre', label: 'Parafoudre', iec60617: '07-14-11', iec61850: 'YSPD' },
		{ symbol: 'sym-point-raccordement', label: 'Point de raccordement', iec60617: '03-02-01', iec61850: 'MMTR' },
		{ symbol: 'sym-abonne', label: 'Abonné', iec60617: '03-02-01', iec61850: 'MMTR' },
		{ symbol: 'sym-compteur', label: 'Compteur', iec60617: '03-02-01', iec61850: 'MMTR' },
		{ symbol: 'sym-branchement', label: 'Branchement', iec60617: '—' },
	];
	/** Légende des types de lignes (couleurs par tension) */
	readonly legendLineTypes: { lineType: string; label: string; color: string }[] = [
		{ lineType: 'ligne-hta', label: 'Ligne HTA', color: '#0891b2' },
		{ lineType: 'ligne-bt', label: 'Ligne BT', color: '#16a34a' },
		{ lineType: 'ligne-brcht', label: 'Ligne branchement', color: '#f97316' }
	];

	constructor(private gisApi: GisApiService, private ngZone: NgZone, private route: ActivatedRoute) {}

	ngAfterViewInit(): void {
		this.repositionPopup();
	}

	/** Enregistre le listener wheel non-passif dès que le SVG est dans le DOM */
	ngAfterViewChecked(): void {
		const svgEl = this.schemaSvgRef?.nativeElement;
		if (svgEl && !this.wheelListenerAdded) {
			this.ngZone.runOutsideAngular(() => {
				svgEl.addEventListener('wheel', (e: Event) => {
					this.ngZone.run(() => this.onSvgWheel(e as WheelEvent));
				}, { passive: false });
			});
			this.wheelListenerAdded = true;
		}
		if (!svgEl) this.wheelListenerAdded = false;
	}

	ngOnInit(): void {
		// Pré-remplir depuis les query params (?ref=slug:id&direction=aval)
		const p = this.route.snapshot.queryParams;
		if (p['ref']) {
			this.refId = String(p['ref']);
		}
		if (p['direction'] && ['amont', 'aval', 'tous'].includes(String(p['direction']))) {
			this.direction = String(p['direction']) as 'amont' | 'aval' | 'tous';
		}
		if (p['type'] && ['poste_source', 'poste_transformation', 'abonne', 'ouvrage'].includes(String(p['type']))) {
			this.typeOuvrage = String(p['type']) as 'poste_source' | 'poste_transformation' | 'abonne' | 'ouvrage';
		}
		if (this.refId?.trim()) {
			// Auto-charger si la ref est déjà renseignée
			setTimeout(() => this.loadSchema(), 0);
		}
	}

	loadSchema(): void {
		if (!this.refId?.trim()) {
			this.error = 'Indiquez la codification (numéro de l\'ouvrage).';
			return;
		}
		const parsedRef = this.parseSchemaRefInput(this.refId.trim());
		// Si la codification indique explicitement un poste source, éviter un mismatch
		// avec le select "Type" resté sur "ouvrage".
		if (
			this.typeOuvrage === 'ouvrage' &&
			parsedRef.refSlug &&
			(parsedRef.refSlug.includes('poste-source') || parsedRef.refSlug.includes('ps-poste-source'))
		) {
			this.typeOuvrage = 'poste_source';
		}
		this.loading = true;
		this.error = null;
		// Exigence métier: schéma unifilaire = source d'alimentation + tous les éléments connectés.
		const schemaDirection: 'tous' = 'tous';
		this.gisApi.getSchemaUnifilaire(parsedRef.refId, {
			type: this.typeOuvrage,
			direction: schemaDirection,
			refSlug: parsedRef.refSlug
		}).subscribe({
			next: (res) => {
				this.data = res;
				this.nodeOffsets.clear();
				this.computeLayout();
				this.selectedNodeId = res.nodes?.[0]?.id ?? null;
				this.popupNode = null;
				this.popupDetailsEntries = [];
				this.popupDetailsError = null;
				this.loading = false;
			},
			error: (err) => {
				this.error = err?.error?.detail || err?.message || 'Erreur lors du chargement du schéma.';
				this.data = null;
				this.nodeOffsets.clear();
				this.selectedNodeId = null;
				this.popupNode = null;
				this.popupDetailsEntries = [];
				this.popupDetailsError = null;
				this.loading = false;
			}
		});
	}

	get nodes(): SchemaUnifilaireNode[] {
		return this.data?.nodes ?? [];
	}

	get edges(): SchemaUnifilaireEdge[] {
		return this.data?.edges ?? [];
	}

	get panelNodes(): SchemaUnifilaireNode[] {
		return [...this.nodes].sort((a, b) => {
			const aLabel = (a.label || a.id || '').toLowerCase();
			const bLabel = (b.label || b.id || '').toLowerCase();
			return aLabel.localeCompare(bLabel, 'fr');
		});
	}

	/** ViewBox calculé à partir des positions d'affichage (avec marge) */
	get viewBox(): string {
		const n = this.nodes;
		if (n.length === 0) return `0 0 ${400 + this.margin * 2} ${300 + this.margin * 2}`;
		const xs = n.map((node) => this.nodeX(node));
		const ys = n.map((node) => this.nodeY(node));
		const minX = Math.min(...xs) - this.margin;
		const minY = Math.min(...ys) - this.margin;
		const maxX = Math.max(...xs) + this.margin;
		const maxY = Math.max(...ys) + this.margin;
		const w = Math.max(maxX - minX, 400);
		const h = Math.max(maxY - minY, 300);
		return `${minX} ${minY} ${w} ${h}`;
	}

	/** Map node id -> node pour les arêtes */
	nodeById(id: string): SchemaUnifilaireNode | undefined {
		return this.data?.nodes.find((n) => n.id === id);
	}

	/** Coordonnées d'affichage d'un nœud — layout hiérarchique ou SIG selon le mode */
	nodeX(node: SchemaUnifilaireNode): number {
		const base = this.getBaseNodePosition(node);
		const offset = this.nodeOffsets.get(node.id);
		return base.x + (offset?.x ?? 0);
	}

	nodeY(node: SchemaUnifilaireNode): number {
		const base = this.getBaseNodePosition(node);
		const offset = this.nodeOffsets.get(node.id);
		return base.y + (offset?.y ?? 0);
	}

	private getBaseNodePosition(node: SchemaUnifilaireNode): { x: number; y: number } {
		if (this.layoutMode === 'hierarchical') {
			const p = this.layoutPositions.get(node.id);
			if (p) return p;
		}
		return { x: node.x, y: node.y };
	}

	toggleLayout(): void {
		this.layoutMode = this.layoutMode === 'hierarchical' ? 'geographic' : 'hierarchical';
		if (this.layoutMode === 'hierarchical' && this.hierVB.w === 0) {
			this.initHierVB();
		}
	}

	/** Transform SVG complet d'un nœud : translation + scale en mode hiérarchique */
	getNodeTransform(node: SchemaUnifilaireNode): string {
		const t = `translate(${this.nodeX(node)},${this.nodeY(node)})`;
		if (this.layoutMode !== 'hierarchical') return t;
		const s = this.getNodeScale(node);
		return `${t} scale(${s})`;
	}

	private getNodeScale(node: SchemaUnifilaireNode): number {
		if (node.symbol === 'sym-poste-source') return 3.3;
		if (node.symbol === 'sym-poste-cabine' || node.symbol === 'sym-transfo-bt') return 3.1;
		if (node.symbol === 'sym-depart-hta' || node.symbol === 'sym-depart-bt') return 3.05;
		if (node.symbol === 'sym-abonne' && !!this.getNodeClientCount(node)) return 2;
		return 2.9;
	}

	/** ViewBox réel affiché : hierVB (zoom/pan) en mode hiérarchique, base en mode géo */
	get activeViewBox(): string {
		if (this.layoutMode === 'hierarchical' && this.hierVB.w > 0) {
			return `${this.hierVB.x} ${this.hierVB.y} ${this.hierVB.w} ${this.hierVB.h}`;
		}
		return this.viewBox;
	}

	/** Dimensions CSS explicites du SVG (plus nécessaires avec le pan+zoom, retournent null) */
	get svgNaturalWidth(): null { return null; }
	get svgNaturalHeight(): null { return null; }

	// ── Zoom / Pan ────────────────────────────────────────────────────────────

	zoomIn(): void  { this.applyZoom(1 / 1.3); }
	zoomOut(): void { this.applyZoom(1.3); }
	resetZoom(): void { this.initHierVB(); }

	private applyZoom(factor: number): void {
		const cx = this.hierVB.x + this.hierVB.w / 2;
		const cy = this.hierVB.y + this.hierVB.h / 2;
		const nw = this.hierVB.w * factor;
		const nh = this.hierVB.h * factor;
		this.hierVB = { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
	}

	private initHierVB(): void {
		const p = this.viewBox.split(' ').map(Number);
		if (p.length === 4 && !p.some(isNaN)) {
			this.hierVB = { x: p[0], y: p[1], w: p[2], h: p[3] };
		}
	}

	onSvgWheel(e: WheelEvent): void {
		if (this.layoutMode !== 'hierarchical') return;
		e.preventDefault();
		const svg = this.schemaSvgRef?.nativeElement;
		if (!svg) return;
		const rect = svg.getBoundingClientRect();
		const nx = (e.clientX - rect.left) / rect.width;
		const ny = (e.clientY - rect.top) / rect.height;
		const factor = e.deltaY < 0 ? 1 / 1.12 : 1.12;
		const mx = this.hierVB.x + nx * this.hierVB.w;
		const my = this.hierVB.y + ny * this.hierVB.h;
		const nw = this.hierVB.w * factor;
		const nh = this.hierVB.h * factor;
		this.hierVB = { x: mx - nx * nw, y: my - ny * nh, w: nw, h: nh };
	}

	onSvgMouseDown(e: MouseEvent): void {
		if (this.layoutMode !== 'hierarchical' || e.button !== 0) return;
		if (this.isDraggingNode) return;
		e.preventDefault();
		const svg = this.schemaSvgRef?.nativeElement;
		if (!svg) return;
		const rect = svg.getBoundingClientRect();
		this.isPanning = true;
		this.panStartNorm = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
		this.panStartOrigin = { x: this.hierVB.x, y: this.hierVB.y };
	}

	onPanMove(e: MouseEvent): void {
		if (this.isDraggingNode && this.draggedNodeId) {
			const node = this.nodeById(this.draggedNodeId);
			const p = this.mouseEventToSvgPoint(e);
			if (!node || !p) return;
			const nx = this.dragStartNodePos.x + (p.x - this.dragStartSvg.x);
			const ny = this.dragStartNodePos.y + (p.y - this.dragStartSvg.y);
			this.setManualNodePosition(node, nx, ny);
			if (Math.abs(p.x - this.dragStartSvg.x) > 1 || Math.abs(p.y - this.dragStartSvg.y) > 1) {
				this.dragMoved = true;
			}
			return;
		}
		if (!this.isPanning || this.layoutMode !== 'hierarchical') return;
		const svg = this.schemaSvgRef?.nativeElement;
		if (!svg) return;
		const rect = svg.getBoundingClientRect();
		const nx = (e.clientX - rect.left) / rect.width;
		const ny = (e.clientY - rect.top) / rect.height;
		this.hierVB = {
			...this.hierVB,
			x: this.panStartOrigin.x - (nx - this.panStartNorm.x) * this.hierVB.w,
			y: this.panStartOrigin.y - (ny - this.panStartNorm.y) * this.hierVB.h
		};
	}

	onPanEnd(): void {
		this.isPanning = false;
		this.isDraggingNode = false;
		this.draggedNodeId = null;
	}

	onNodeMouseDown(node: SchemaUnifilaireNode, e: MouseEvent): void {
		if (e.button !== 0) return;
		e.preventDefault();
		e.stopPropagation();
		const p = this.mouseEventToSvgPoint(e);
		if (!p) return;
		this.isDraggingNode = true;
		this.draggedNodeId = node.id;
		this.dragStartSvg = p;
		this.dragStartNodePos = { x: this.nodeX(node), y: this.nodeY(node) };
		this.dragMoved = false;
	}

	onNodeClick(node: SchemaUnifilaireNode, e: MouseEvent): void {
		if (this.dragMoved) {
			e.preventDefault();
			e.stopPropagation();
			this.dragMoved = false;
			return;
		}
		this.selectNode(node);
	}

	private mouseEventToSvgPoint(e: MouseEvent): { x: number; y: number } | null {
		const svg = this.schemaSvgRef?.nativeElement;
		if (!svg) return null;
		const vb = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
		if (vb.length !== 4 || vb.some((x) => Number.isNaN(x))) return null;
		const [vx, vy, vw, vh] = vb;
		const rect = svg.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return null;
		const nx = (e.clientX - rect.left) / rect.width;
		const ny = (e.clientY - rect.top) / rect.height;
		return { x: vx + nx * vw, y: vy + ny * vh };
	}

	private setManualNodePosition(node: SchemaUnifilaireNode, x: number, y: number): void {
		const base = this.getBaseNodePosition(node);
		this.nodeOffsets.set(node.id, { x: x - base.x, y: y - base.y });
	}

	/**
	 * Algorithme de disposition hiérarchique (Reingold-Tilford simplifié).
	 * Construit un arbre couvrant par BFS depuis le nœud source, puis :
	 *  1. Passe descendante  : calcule la largeur de chaque sous-arbre.
	 *  2. Passe ascendante   : assigne les positions x (centré sur les enfants) et y (par niveau).
	 * Garantit zéro chevauchement entre sous-arbres.
	 */
	computeLayout(): void {
		const nodes = this.data?.nodes ?? [];
		const edges = this.data?.edges ?? [];
		this.layoutPositions = new Map();
		if (nodes.length === 0) return;

		const LEAF_W = 180;
		const LEVEL_H = 200;

		// Adjacence non-orientée
		const adj = new Map<string, string[]>();
		for (const n of nodes) adj.set(n.id, []);
		for (const e of edges) {
			adj.get(e.source)?.push(e.target);
			adj.get(e.target)?.push(e.source);
		}

		// Racine : poste source en priorité, sinon nœud de plus fort degré
		const rootNode = nodes.find(n => n.symbol === 'sym-poste-source')
			?? nodes.reduce((best, n) =>
				(adj.get(n.id)?.length ?? 0) > (adj.get(best.id)?.length ?? 0) ? n : best,
				nodes[0]
			);

		// BFS pour construire l'arbre couvrant
		const visited = new Set<string>([rootNode.id]);
		const treeChildren = new Map<string, string[]>();
		for (const n of nodes) treeChildren.set(n.id, []);
		const queue: string[] = [rootNode.id];
		while (queue.length > 0) {
			const curr = queue.shift()!;
			for (const nbr of (adj.get(curr) ?? [])) {
				if (!visited.has(nbr)) {
					visited.add(nbr);
					treeChildren.get(curr)!.push(nbr);
					queue.push(nbr);
				}
			}
		}
		// Nœuds orphelins (composantes déconnectées) → rattachés à la racine
		for (const n of nodes) {
			if (!visited.has(n.id)) treeChildren.get(rootNode.id)!.push(n.id);
		}

		// Passe 1 : largeur de chaque sous-arbre (post-order)
		const subtreeW = new Map<string, number>();
		const computeW = (id: string): number => {
			const ch = treeChildren.get(id) ?? [];
			if (ch.length === 0) { subtreeW.set(id, LEAF_W); return LEAF_W; }
			const total = ch.reduce((s, c) => s + computeW(c), 0);
			subtreeW.set(id, total);
			return total;
		};
		computeW(rootNode.id);

		// Passe 2 : affectation des positions (pre-order)
		const assign = (id: string, left: number, y: number): void => {
			const ch = treeChildren.get(id) ?? [];
			const w = subtreeW.get(id) ?? LEAF_W;
			this.layoutPositions.set(id, { x: left + w / 2, y });
			let childLeft = left;
			for (const c of ch) {
				assign(c, childLeft, y + LEVEL_H);
				childLeft += subtreeW.get(c) ?? LEAF_W;
			}
		};
		assign(rootNode.id, 0, 0);
		this.initHierVB();
	}

	/**
	 * Liaison orthogonalisée (étape 3 linéarisation) : descente verticale puis horizontale,
	 * sans diagonale — cohérent avec un synoptique poste (branches verticales, rangées horizontales).
	 */
	getOrthogonalEdgePath(src: SchemaUnifilaireNode, tgt: SchemaUnifilaireNode): string {
		const x1 = this.nodeX(src);
		const y1 = this.nodeY(src);
		const x2 = this.nodeX(tgt);
		const y2 = this.nodeY(tgt);
		if (Math.abs(y2 - y1) < 1e-3) {
			return `M ${x1} ${y1} L ${x2} ${y2}`;
		}
		const yMid = (y1 + y2) / 2;
		return `M ${x1} ${y1} L ${x1} ${yMid} L ${x2} ${yMid} L ${x2} ${y2}`;
	}

	selectNode(node: SchemaUnifilaireNode): void {
		this.selectedNodeId = node.id;
		this.popupNode = node;
		this.repositionPopup(node);
		this.loadPopupDetails(node);
	}

	clearSelectedNode(): void {
		this.selectedNodeId = null;
		this.popupNode = null;
		this.popupDetailsEntries = [];
		this.popupDetailsError = null;
	}

	isNodeSelected(node: SchemaUnifilaireNode): boolean {
		return !!this.selectedNodeId && this.selectedNodeId === node.id;
	}

	isEdgeLinked(edge: SchemaUnifilaireEdge): boolean {
		if (!this.selectedNodeId) return true;
		return edge.source === this.selectedNodeId || edge.target === this.selectedNodeId;
	}

	getPanelNodeType(node: SchemaUnifilaireNode): string {
		return (node.type || '').replaceAll('-', ' ');
	}

	get popupHasMeasures(): boolean {
		const n = this.popupNode;
		if (!n) return false;
		return n.tension != null || n.courant != null || n.puissance != null;
	}

	get popupConnectedEdges(): number {
		const n = this.popupNode;
		if (!n) return 0;
		return this.edges.filter((e) => e.source === n.id || e.target === n.id).length;
	}

	closePopup(): void {
		this.popupNode = null;
		this.popupDetailsEntries = [];
		this.popupDetailsError = null;
	}

	onWrapScroll(): void {
		this.repositionPopup();
	}

	private repositionPopup(nodeArg?: SchemaUnifilaireNode): void {
		const node = nodeArg ?? this.popupNode;
		const svg = this.schemaSvgRef?.nativeElement;
		const wrap = this.svgWrapRef?.nativeElement;
		if (!node || !svg || !wrap) return;
		const vb = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
		if (vb.length !== 4 || vb.some((x) => Number.isNaN(x))) return;
		const [vbX, vbY, vbW, vbH] = vb;
		const svgRect = svg.getBoundingClientRect();
		const wrapRect = wrap.getBoundingClientRect();
		if (svgRect.width <= 0 || svgRect.height <= 0 || vbW <= 0 || vbH <= 0) return;
		const px = ((this.nodeX(node) - vbX) / vbW) * svgRect.width;
		const py = ((this.nodeY(node) - vbY) / vbH) * svgRect.height;
		const nodeLeftInWrap = (svgRect.left - wrapRect.left) + px + wrap.scrollLeft;
		const nodeTopInWrap = (svgRect.top - wrapRect.top) + py + wrap.scrollTop;
		const preferredLeft = nodeLeftInWrap + 28;
		const maxLeft = Math.max(8, wrap.scrollWidth - this.popupWidth - 8);
		const left = preferredLeft > maxLeft ? Math.max(8, nodeLeftInWrap - this.popupWidth - 28) : preferredLeft;
		const top = Math.max(8, Math.min(nodeTopInWrap - 20, Math.max(8, wrap.scrollHeight - 220)));
		this.popupPosition = { left, top };
	}

	private loadPopupDetails(node: SchemaUnifilaireNode): void {
		const parsed = this.getNodeSlugAndId(node);
		if (!parsed) {
			this.popupDetailsEntries = [];
			this.popupDetailsError = 'Identifiant de l’ouvrage invalide.';
			return;
		}
		this.popupDetailsLoading = true;
		this.popupDetailsError = null;
		this.popupDetailsEntries = [];
		this.gisApi.getById(parsed.slug, parsed.id).subscribe({
			next: (row) => {
				this.popupDetailsEntries = Object.entries(row || {}).map(([key, value]) => ({
					key,
					value: this.formatDbValue(value)
				}));
				this.popupDetailsLoading = false;
			},
			error: (err) => {
				this.popupDetailsError = err?.error?.detail || err?.message || 'Impossible de charger les informations BD.';
				this.popupDetailsLoading = false;
			}
		});
	}

	private getNodeSlugAndId(node: SchemaUnifilaireNode): { slug: string; id: string } | null {
		const raw = (node.id || '').trim();
		if (!raw || !raw.includes(':')) return null;
		const [slugRaw, ...rest] = raw.split(':');
		// Priorité au slug issu du node.id (ex. "rx-hta-express-poste-hta-bt")
		// node.type est le type topologique ("poste-cabine"), pas la table réelle.
		const slug = (slugRaw || node.type || '').trim();
		const id = rest.join(':').trim();
		if (!slug || !id) return null;
		return { slug, id };
	}

	/**
	 * Calcule la position et l'angle d'une flèche de flux au milieu d'une liaison.
	 * Suit la géométrie orthogonale (source → cible) : horizontal sur le segment horizontal,
	 * vertical sinon.
	 */
	private computeFlowArrow(src: SchemaUnifilaireNode, tgt: SchemaUnifilaireNode): { x: number; y: number; angle: number } | null {
		const x1 = this.nodeX(src), y1 = this.nodeY(src);
		const x2 = this.nodeX(tgt), y2 = this.nodeY(tgt);
		if (Math.abs(y2 - y1) < 1e-3) {
			return { x: (x1 + x2) / 2, y: y1, angle: x2 >= x1 ? 0 : 180 };
		}
		if (Math.abs(x2 - x1) < 1e-3) {
			return { x: x1, y: (y1 + y2) / 2, angle: y2 >= y1 ? 90 : 270 };
		}
		// L-shaped : placer la flèche au milieu du segment horizontal
		const yMid = (y1 + y2) / 2;
		return { x: (x1 + x2) / 2, y: yMid, angle: x2 >= x1 ? 0 : 180 };
	}

	/** Liste des flèches de flux pré-calculées (une par arête visible) */
	get flowArrows(): Array<{ id: string; x: number; y: number; angle: number; color: string }> {
		if (!this.showFlux) return [];
		const result: Array<{ id: string; x: number; y: number; angle: number; color: string }> = [];
		for (const edge of this.edges) {
			const src = this.nodeById(edge.source);
			const tgt = this.nodeById(edge.target);
			if (!src || !tgt) continue;
			const arrow = this.computeFlowArrow(src, tgt);
			if (!arrow) continue;
			result.push({ id: `${edge.source}--${edge.target}`, ...arrow, color: this.getEdgeColor(edge) });
		}
		return result;
	}

	private formatDbValue(value: unknown): string {
		if (value === null || value === undefined) return 'NULL';
		if (typeof value === 'string') return value;
		if (typeof value === 'number' || typeof value === 'boolean') return String(value);
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	private parseSchemaRefInput(raw: string): { refId: string; refSlug?: string } {
		const value = (raw || '').trim();
		const idx = value.indexOf(':');
		if (idx <= 0) return { refId: value };
		const maybeSlug = value.slice(0, idx).trim().toLowerCase();
		const maybeId = value.slice(idx + 1).trim();
		if (!maybeSlug || !maybeId) return { refId: value };

		// Accepter :
		// - slugs RX (rx-*)
		// - slugs clients BT (clients-bt-*)
		// - slugs métier "poste source / poste transfo / ouvrage" saisis manuellement
		let normalizedSlug = maybeSlug.replace(/_/g, '-');
		const slugAliases: Record<string, string> = {
			'poste_source': 'poste-source',
			'ps-poste-source': 'poste-source',
			'ps-poste-source.shp': 'poste-source',
			'ps-poste-source-layer': 'poste-source'
		};
		normalizedSlug = slugAliases[normalizedSlug] ?? normalizedSlug;
		const acceptedBusinessSlugPrefixes = [
			'poste-source',
			'poste-transformation',
			'poste-cabine',
			'poste-hta',
			'transfo',
			'ouvrage'
		];
		const isAcceptedBusinessSlug = acceptedBusinessSlugPrefixes.some((prefix) => normalizedSlug.startsWith(prefix));

		if (!maybeSlug.startsWith('rx-') && !maybeSlug.startsWith('clients-bt-') && !isAcceptedBusinessSlug) {
			return { refId: value };
		}
		return { refId: maybeId, refSlug: normalizedSlug };
	}

	/**
	 * Extrait le nombre de clients depuis le label d'un nœud résumé (ex. "220 clients R380" → "220").
	 * Retourne une chaîne vide si le nœud n'est pas un résumé.
	 */
	getNodeClientCount(node: SchemaUnifilaireNode): string {
		if (!node.id.endsWith('-summary:0')) return '';
		const m = /^(\d+)\s+clients/i.exec(node.label || '');
		if (!m) return '';
		const n = parseInt(m[1], 10);
		return n >= 1000 ? `${(Math.round(n / 100) / 10)}k` : String(n);
	}

	/** Position du label d'une arête au milieu du tracé orthogonal */
	getEdgeLabelPos(src: SchemaUnifilaireNode, tgt: SchemaUnifilaireNode): { x: number; y: number } {
		const x1 = this.nodeX(src), y1 = this.nodeY(src);
		const x2 = this.nodeX(tgt), y2 = this.nodeY(tgt);
		if (Math.abs(y2 - y1) < 1e-3) {
			return { x: (x1 + x2) / 2, y: y1 };
		}
		if (Math.abs(x2 - x1) < 1e-3) {
			return { x: x1, y: (y1 + y2) / 2 };
		}
		// L-shaped : segment horizontal au milieu
		const yMid = (y1 + y2) / 2;
		return { x: (x1 + x2) / 2, y: yMid };
	}

	private static readonly EXPORT_SVG_STYLES = `
.schema-scada-svg { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; }
.schema-scada-node-card { fill: rgba(248, 250, 252, 0.95); stroke: #e2e8f0; stroke-width: 1; }
.schema-scada-node-halo { stroke: rgba(15, 23, 42, 0.08); stroke-width: 0.6; }
.schema-reseau-edge--scada { filter: drop-shadow(0 0 1px rgba(15, 23, 42, 0.15)); }
.schema-edge-label { font-size: 9px; font-family: Inter, "Segoe UI", sans-serif; font-weight: 500; letter-spacing: 0.02em; fill: #475569; opacity: 0.85; }
.schema-edge-label--hta { fill: #0891b2; }
.schema-edge-label--bt { fill: #16a34a; }
.schema-node-inline-label-main { font-family: Inter, "Segoe UI", sans-serif; font-size: 8.5px; font-weight: 700; fill: #0f172a; }
.schema-node-inline-label-sub { font-family: Inter, "Segoe UI", sans-serif; font-size: 7px; font-weight: 500; fill: #64748b; }
.schema-reseau-edge--flux { animation: flux-march 1.4s linear infinite; }
@keyframes flux-march { to { stroke-dashoffset: calc(-1 * var(--flux-cycle, 23)); } }
.schema-flux-arrow { opacity: 0.88; }
.export-legend-panel { fill: #f8fafc; stroke: #e2e8f0; stroke-width: 1; }
.export-legend-kicker { font-family: Inter, "Segoe UI", sans-serif; font-size: 9px; font-weight: 600; fill: #64748b; letter-spacing: 0.04em; }
.export-legend-title { font-family: Inter, "Segoe UI", sans-serif; font-size: 12px; font-weight: 700; fill: #0f172a; }
.export-legend-ref { font-family: Inter, "Segoe UI", sans-serif; font-size: 9px; fill: #475569; }
.export-legend-section { font-family: Inter, "Segoe UI", sans-serif; font-size: 9px; font-weight: 700; fill: #334155; }
.export-legend-label { font-family: Inter, "Segoe UI", sans-serif; font-size: 9px; font-weight: 600; fill: #1e293b; }
.export-legend-hint { font-family: Inter, "Segoe UI", sans-serif; font-size: 7.5px; fill: #64748b; }
.export-legend-iec { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 7px; fill: #64748b; }
.export-legend-swatch { stroke: #cbd5e1; stroke-width: 0.5; }
`.trim();

	private readonly EXPORT_LEGEND_WIDTH = 268;
	private readonly EXPORT_LEGEND_GAP = 16;

	/** Télécharge le schéma affiché (vue courante, options Flux / labels / layout) en fichier SVG autonome. */
	exportSchemaDiagram(): void {
		const payload = this.buildExportSvgPayload();
		if (!payload) return;
		const blob = new Blob([payload.xml], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `schema-unifilaire-${payload.filenameBase}.svg`;
		a.click();
		URL.revokeObjectURL(url);
	}

	/** Ouvre une version imprimable du schéma pour export PDF via le dialogue navigateur. */
	exportSchemaDiagramPdf(): void {
		const payload = this.buildExportSvgPayload();
		if (!payload) return;
		const blob = new Blob([payload.xml], { type: 'image/svg+xml;charset=utf-8' });
		const blobUrl = URL.createObjectURL(blob);
		const w = window.open('', '_blank');
		if (!w) return;
		w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Schema unifilaire</title><style>@page{size:auto;margin:10mm}html,body{margin:0;padding:0;background:#fff}body{display:flex;justify-content:center;align-items:flex-start}img{max-width:100%;height:auto;display:block}</style></head><body><img id="schema-export-img" alt="Schema unifilaire" /></body></html>`);
		w.document.close();
		const img = w.document.getElementById('schema-export-img') as HTMLImageElement | null;
		if (!img) {
			URL.revokeObjectURL(blobUrl);
			return;
		}
		img.onload = () => {
			w.focus();
			w.print();
			setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
		};
		img.onerror = () => {
			URL.revokeObjectURL(blobUrl);
		};
		img.src = blobUrl;
	}

	private buildExportSvgPayload(): { xml: string; filenameBase: string } | null {
		const svg = this.schemaSvgRef?.nativeElement;
		if (!svg || this.nodes.length === 0) return null;

		const diagramClone = svg.cloneNode(true) as SVGSVGElement;
		const stripClasses = [
			'schema-reseau-edge--dimmed',
			'schema-reseau-edge--active',
			'schema-scada-node--dimmed',
			'schema-scada-node--selected'
		];
		diagramClone.querySelectorAll('*').forEach((el) => {
			for (const c of stripClasses) el.classList.remove(c);
			for (const a of [...el.attributes]) {
				const n = a.name;
				if (n.startsWith('_ng') || n.startsWith('ng-') || n.startsWith('ng-reflect-')) {
					el.removeAttribute(n);
				}
			}
		});

		const vb = this.activeViewBox;
		const parts = vb.split(/\s+/).map(Number);
		if (parts.length !== 4 || parts.some((x) => Number.isNaN(x))) return null;
		const [vx, vy, vw, vh] = parts;

		const lx = vx - this.EXPORT_LEGEND_WIDTH - this.EXPORT_LEGEND_GAP;
		const { group: legendGroup, height: legendHeight } = this.buildExportLegendGroup(lx, vy);
		const outerW = this.EXPORT_LEGEND_WIDTH + this.EXPORT_LEGEND_GAP + vw;
		const outerH = Math.max(vh, legendHeight);

		const exportRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
		const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
		styleEl.textContent = SchemaReseau.EXPORT_SVG_STYLES;
		defs.appendChild(styleEl);
		exportRoot.appendChild(defs);

		const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		bg.setAttribute('x', String(lx));
		bg.setAttribute('y', String(vy));
		bg.setAttribute('width', String(outerW));
		bg.setAttribute('height', String(outerH));
		bg.setAttribute('fill', '#ffffff');
		exportRoot.appendChild(bg);

		exportRoot.appendChild(legendGroup);

		const diagramGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		diagramGroup.setAttribute('class', 'export-diagram-root');
		while (diagramClone.firstChild) {
			diagramGroup.appendChild(diagramClone.firstChild);
		}
		exportRoot.appendChild(diagramGroup);

		exportRoot.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		exportRoot.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
		exportRoot.setAttribute('viewBox', `${lx} ${vy} ${outerW} ${outerH}`);
		exportRoot.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		exportRoot.setAttribute('width', String(outerW));
		exportRoot.setAttribute('height', String(outerH));

		let xml = new XMLSerializer().serializeToString(exportRoot);
		if (!xml.startsWith('<?xml')) {
			xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
		}

		const slug = this.sanitizeExportFilenamePart(this.refId.trim() || 'schema');
		return { xml, filenameBase: slug };
	}

	/** Panneau de légende (même contenu métier que la barre latérale) pour l’export SVG. */
	private buildExportLegendGroup(lx: number, vy: number): { group: SVGGElement; height: number } {
		const pad = 10;
		const innerX = lx + pad;
		const padY = 10;
		let y = vy + padY;

		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		g.setAttribute('class', 'export-legend');

		const addText = (x: number, yy: number, cls: string, content: string): void => {
			const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			t.setAttribute('x', String(x));
			t.setAttribute('y', String(yy));
			t.setAttribute('class', cls);
			t.textContent = content;
			g.appendChild(t);
		};

		addText(innerX, y + 10, 'export-legend-kicker', 'SYNOPTIQUE SCADA');
		y += 14;
		addText(innerX, y + 12, 'export-legend-title', 'Légende');
		y += 20;
		const refLine = (this.refId || '').trim() || '—';
		addText(innerX, y + 10, 'export-legend-ref', `Codification : ${refLine}`);
		y += 22;

		addText(innerX, y + 10, 'export-legend-section', 'Niveaux de tension');
		y += 18;
		const swatchW = 12;
		for (const v of this.scadaVoltageLegend) {
			const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			r.setAttribute('x', String(innerX));
			r.setAttribute('y', String(y));
			r.setAttribute('width', String(swatchW));
			r.setAttribute('height', String(swatchW));
			r.setAttribute('rx', '2');
			r.setAttribute('fill', v.color);
			r.setAttribute('class', 'export-legend-swatch');
			g.appendChild(r);
			addText(innerX + 18, y + 10, 'export-legend-label', v.label);
			addText(innerX + 18, y + 20, 'export-legend-hint', v.hint);
			y += 30;
		}

		y += 4;
		addText(innerX, y + 10, 'export-legend-section', 'Équipements (IEC 60617 · CEI 61850)');
		y += 18;
		const iconCx = innerX + 10;
		for (const entry of this.legendEntries) {
			this.appendExportLegendMiniSymbol(g, entry.symbol, iconCx, y + 10);
			addText(innerX + 24, y + 8, 'export-legend-label', entry.label);
			const iec = entry.iec61850
				? `IEC 60617: ${entry.iec60617} · ${entry.iec61850}`
				: `IEC 60617: ${entry.iec60617}`;
			addText(innerX + 24, y + 18, 'export-legend-iec', iec);
			y += 28;
		}

		y += 4;
		addText(innerX, y + 10, 'export-legend-section', 'Types de liaisons');
		y += 18;
		for (const lineEntry of this.legendLineTypes) {
			const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			bar.setAttribute('x', String(innerX));
			bar.setAttribute('y', String(y + 2));
			bar.setAttribute('width', String(28));
			bar.setAttribute('height', String(6));
			bar.setAttribute('rx', '2');
			bar.setAttribute('fill', lineEntry.color);
			g.appendChild(bar);
			addText(innerX + 34, y + 10, 'export-legend-label', lineEntry.label);
			y += 22;
		}

		const totalH = y - vy + padY;
		const panel = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		panel.setAttribute('x', String(lx));
		panel.setAttribute('y', String(vy));
		panel.setAttribute('width', String(this.EXPORT_LEGEND_WIDTH));
		panel.setAttribute('height', String(totalH));
		panel.setAttribute('class', 'export-legend-panel');
		g.insertBefore(panel, g.firstChild);

		return { group: g, height: totalH };
	}

	/** Icône réduite alignée sur les symboles du synoptique (lisibilité export). */
	private appendExportLegendMiniSymbol(parent: SVGGElement, symbol: string, cx: number, cy: number): void {
		const col = this.getSymbolColor(symbol);
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		g.setAttribute('transform', `translate(${cx},${cy})`);
		const ns = 'http://www.w3.org/2000/svg';
		const line = (x1: number, y1: number, x2: number, y2: number, sw = 1.4, stroke = col) => {
			const el = document.createElementNS(ns, 'line');
			el.setAttribute('x1', String(x1));
			el.setAttribute('y1', String(y1));
			el.setAttribute('x2', String(x2));
			el.setAttribute('y2', String(y2));
			el.setAttribute('stroke', stroke);
			el.setAttribute('stroke-width', String(sw));
			el.setAttribute('stroke-linecap', 'round');
			g.appendChild(el);
		};
		switch (symbol) {
			case 'sym-poste-source': {
				const r = document.createElementNS(ns, 'rect');
				r.setAttribute('x', '-7');
				r.setAttribute('y', '-8');
				r.setAttribute('width', '14');
				r.setAttribute('height', '16');
				r.setAttribute('rx', '2');
				r.setAttribute('fill', 'none');
				r.setAttribute('stroke', col);
				r.setAttribute('stroke-width', '1.3');
				g.appendChild(r);
				for (const yy of [-4, 4]) {
					const c = document.createElementNS(ns, 'circle');
					c.setAttribute('cx', '0');
					c.setAttribute('cy', String(yy));
					c.setAttribute('r', '4');
					c.setAttribute('fill', 'none');
					c.setAttribute('stroke', col);
					c.setAttribute('stroke-width', '1.3');
					g.appendChild(c);
				}
				break;
			}
			case 'sym-poste-cabine': {
				const r = document.createElementNS(ns, 'rect');
				r.setAttribute('x', '-7');
				r.setAttribute('y', '-7');
				r.setAttribute('width', '14');
				r.setAttribute('height', '14');
				r.setAttribute('rx', '2');
				r.setAttribute('fill', 'none');
				r.setAttribute('stroke', col);
				r.setAttribute('stroke-width', '1.4');
				g.appendChild(r);
				line(-9, 0, -7, 0);
				line(7, 0, 9, 0);
				break;
			}
			case 'sym-transfo-bt': {
				const c1 = document.createElementNS(ns, 'circle');
				c1.setAttribute('cx', '-3.5');
				c1.setAttribute('cy', '0');
				c1.setAttribute('r', '4.5');
				c1.setAttribute('fill', 'none');
				c1.setAttribute('stroke', col);
				c1.setAttribute('stroke-width', '1.4');
				g.appendChild(c1);
				const c2 = document.createElementNS(ns, 'circle');
				c2.setAttribute('cx', '3.5');
				c2.setAttribute('cy', '0');
				c2.setAttribute('r', '4.5');
				c2.setAttribute('fill', 'none');
				c2.setAttribute('stroke', col);
				c2.setAttribute('stroke-width', '1.4');
				g.appendChild(c2);
				line(-8, 0, -5.5, 0);
				line(5.5, 0, 8, 0);
				break;
			}
			case 'sym-depart-hta': {
				const r = document.createElementNS(ns, 'rect');
				r.setAttribute('x', '-6');
				r.setAttribute('y', '-6');
				r.setAttribute('width', '12');
				r.setAttribute('height', '12');
				r.setAttribute('rx', '1.5');
				r.setAttribute('fill', '#dcfce7');
				r.setAttribute('stroke', '#15803d');
				r.setAttribute('stroke-width', '1.5');
				g.appendChild(r);
				line(-4, 3, 4, -3, 1.8, '#14532d');
				line(-8, 0, -6, 0, 1.2);
				line(6, 0, 8, 0, 1.2);
				break;
			}
			case 'sym-depart-bt': {
				const r = document.createElementNS(ns, 'rect');
				r.setAttribute('x', '-5');
				r.setAttribute('y', '-5');
				r.setAttribute('width', '10');
				r.setAttribute('height', '10');
				r.setAttribute('rx', '1.5');
				r.setAttribute('fill', '#ecfccb');
				r.setAttribute('stroke', col);
				r.setAttribute('stroke-width', '1.5');
				g.appendChild(r);
				line(-3, 3, 3, -3, 1.5);
				break;
			}
			case 'sym-poteau-hta':
				line(0, -8, 0, 8, 1.8);
				line(-5, -5, 5, -5, 1.6);
				break;
			case 'sym-poteau-bt':
				line(0, -7, 0, 7, 1.8);
				line(-4, -4, 4, -4, 1.6);
				break;
			case 'sym-cellule': {
				const r = document.createElementNS(ns, 'rect');
				r.setAttribute('x', '-5');
				r.setAttribute('y', '-7');
				r.setAttribute('width', '10');
				r.setAttribute('height', '14');
				r.setAttribute('rx', '1.5');
				r.setAttribute('fill', 'none');
				r.setAttribute('stroke', col);
				r.setAttribute('stroke-width', '1.5');
				g.appendChild(r);
				line(0, -7, 0, 7, 1.3);
				break;
			}
			case 'sym-parafoudre': {
				const p = document.createElementNS(ns, 'path');
				p.setAttribute('d', 'M0,-9 L7,5 L-7,5 Z');
				p.setAttribute('fill', 'none');
				p.setAttribute('stroke', col);
				p.setAttribute('stroke-width', '1.4');
				p.setAttribute('stroke-linejoin', 'miter');
				g.appendChild(p);
				break;
			}
			case 'sym-point-raccordement': {
				const c = document.createElementNS(ns, 'circle');
				c.setAttribute('r', '6');
				c.setAttribute('fill', '#fff');
				c.setAttribute('stroke', col);
				c.setAttribute('stroke-width', '1.5');
				g.appendChild(c);
				const d = document.createElementNS(ns, 'circle');
				d.setAttribute('r', '2');
				d.setAttribute('fill', col);
				g.appendChild(d);
				break;
			}
			case 'sym-abonne': {
				const c = document.createElementNS(ns, 'circle');
				c.setAttribute('r', '7');
				c.setAttribute('fill', '#fff');
				c.setAttribute('stroke', col);
				c.setAttribute('stroke-width', '1.5');
				g.appendChild(c);
				const p = document.createElementNS(ns, 'path');
				p.setAttribute('d', 'M-3,1 L0,-2 L3,1 V4 H-3 Z');
				p.setAttribute('fill', 'none');
				p.setAttribute('stroke', col);
				p.setAttribute('stroke-width', '1.2');
				g.appendChild(p);
				break;
			}
			case 'sym-compteur': {
				const c = document.createElementNS(ns, 'circle');
				c.setAttribute('r', '7');
				c.setAttribute('fill', '#fff');
				c.setAttribute('stroke', col);
				c.setAttribute('stroke-width', '1.5');
				g.appendChild(c);
				const t = document.createElementNS(ns, 'text');
				t.setAttribute('x', '0');
				t.setAttribute('y', '2.5');
				t.setAttribute('text-anchor', 'middle');
				t.setAttribute('font-size', '5');
				t.setAttribute('font-weight', '700');
				t.setAttribute('fill', col);
				t.textContent = 'kWh';
				g.appendChild(t);
				break;
			}
			case 'sym-branchement': {
				const p = document.createElementNS(ns, 'polygon');
				p.setAttribute('points', '-6,0 -2.5,-5 2.5,-5 6,0 2.5,5 -2.5,5');
				p.setAttribute('fill', 'none');
				p.setAttribute('stroke', col);
				p.setAttribute('stroke-width', '1.4');
				g.appendChild(p);
				break;
			}
			default: {
				const c = document.createElementNS(ns, 'circle');
				c.setAttribute('r', '7');
				c.setAttribute('fill', 'none');
				c.setAttribute('stroke', col);
				c.setAttribute('stroke-width', '1.5');
				g.appendChild(c);
				line(-9, 0, -7, 0);
				line(7, 0, 9, 0);
			}
		}
		parent.appendChild(g);
	}

	private sanitizeExportFilenamePart(s: string): string {
		const t = s.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
		return (t || 'schema').slice(0, 80);
	}
}
