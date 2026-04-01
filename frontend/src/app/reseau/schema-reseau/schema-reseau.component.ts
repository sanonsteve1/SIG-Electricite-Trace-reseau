import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GisApiService, SchemaUnifilaireResponse, SchemaUnifilaireNode, SchemaUnifilaireEdge } from '../../../services/gis-api.service';

@Component({
	selector: 'app-schema-reseau',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './schema-reseau.component.html',
	styleUrls: ['./schema-reseau.component.scss']
})
export class SchemaReseau implements OnInit, AfterViewInit {
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

	readonly margin = 60;

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

	constructor(private gisApi: GisApiService) {}

	ngAfterViewInit(): void {
		// recalcul de la popup quand la vue devient disponible
		this.repositionPopup();
	}

	ngOnInit(): void {
		// Ne pas charger sans ouvrage
	}

	loadSchema(): void {
		if (!this.refId?.trim()) {
			this.error = 'Indiquez la codification (numéro de l\'ouvrage).';
			return;
		}
		this.loading = true;
		this.error = null;
		this.gisApi.getSchemaUnifilaire(this.refId.trim(), {
			type: this.typeOuvrage,
			direction: this.direction
		}).subscribe({
			next: (res) => {
				this.data = res;
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

	/** ViewBox calculé à partir des nœuds (avec marge) */
	get viewBox(): string {
		const n = this.nodes;
		if (n.length === 0) return `0 0 ${400 + this.margin * 2} ${300 + this.margin * 2}`;
		const xs = n.map((node) => node.x);
		const ys = n.map((node) => node.y);
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

	/** Coordonnées d'un nœud (pour les lignes) */
	nodeX(node: SchemaUnifilaireNode): number {
		return node.x;
	}

	nodeY(node: SchemaUnifilaireNode): number {
		return node.y;
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
		const px = ((node.x - vbX) / vbW) * svgRect.width;
		const py = ((node.y - vbY) / vbH) * svgRect.height;
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
		const slug = (node.type || slugRaw || '').trim();
		const id = rest.join(':').trim();
		if (!slug || !id) return null;
		return { slug, id };
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
}
