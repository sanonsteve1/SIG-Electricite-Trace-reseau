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

	/** Mode de rendu : hiérarchique (arbre sans chevauchement) ou géographique (coordonnées SIG brutes) */
	layoutMode: 'hierarchical' | 'geographic' = 'hierarchical';
	/** Positions calculées par l'algorithme de disposition en arbre (Reingold-Tilford simplifié) */
	private layoutPositions = new Map<string, { x: number; y: number }>();
	/** Facteur d'échelle pixel/unité SVG (non utilisé en pan+zoom — gardé pour compatibilité) */
	readonly layoutScale = 1;

	/** ViewBox courant en mode hiérarchique (modifié par zoom/pan) */
	private hierVB = { x: 0, y: 0, w: 0, h: 0 };
	/** État du glisser-déposer */
	protected isPanning = false;
	private panStartNorm = { x: 0, y: 0 };
	private panStartOrigin = { x: 0, y: 0 };
	/** Listener wheel non-passif (doit être enregistré hors Angular) */
	private wheelListenerAdded = false;

	readonly margin = 60;

	/**
	 * Points du triangle directionnel.
	 * Strictement proportionnel à hierVB.w → taille visuelle constante (~8 px)
	 * quel que soit le niveau de zoom. Aucun plafond/plancher.
	 */
	get fluxArrowPointsScaled(): string {
		const s = this.hierVB.w > 0 ? this.hierVB.w / 100 : 8;
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
		this.loading = true;
		this.error = null;
		this.gisApi.getSchemaUnifilaire(parsedRef.refId, {
			type: this.typeOuvrage,
			direction: this.direction,
			refSlug: parsedRef.refSlug
		}).subscribe({
			next: (res) => {
				this.data = res;
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
		if (this.layoutMode === 'hierarchical') {
			return this.layoutPositions.get(node.id)?.x ?? node.x;
		}
		return node.x;
	}

	nodeY(node: SchemaUnifilaireNode): number {
		if (this.layoutMode === 'hierarchical') {
			return this.layoutPositions.get(node.id)?.y ?? node.y;
		}
		return node.y;
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
		return this.layoutMode === 'hierarchical' ? `${t} scale(3)` : t;
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
		e.preventDefault();
		const svg = this.schemaSvgRef?.nativeElement;
		if (!svg) return;
		const rect = svg.getBoundingClientRect();
		this.isPanning = true;
		this.panStartNorm = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
		this.panStartOrigin = { x: this.hierVB.x, y: this.hierVB.y };
	}

	onPanMove(e: MouseEvent): void {
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

	onPanEnd(): void { this.isPanning = false; }

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
		if (!maybeSlug || !maybeId || !maybeSlug.startsWith('rx-')) {
			return { refId: value };
		}
		return { refId: maybeId, refSlug: maybeSlug };
	}
}
