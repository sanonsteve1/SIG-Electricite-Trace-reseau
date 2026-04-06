import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Select } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import {
	GisApiService,
	TopologyCorrectIssueResponse,
	TopologyCorrectResponse,
	TopologyValidationIssue,
	TopologyValidationResponse
} from '../../../services/gis-api.service';
import { forkJoin, of, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

export interface CoupureCauseOption {
	label: string;
	value: string;
	explanation: string;
}

/** Causes de coupure par type d'ouvrage (expert métier). */
const COUPURE_CAUSES_BY_OUVRAGE: Record<string, CoupureCauseOption[]> = {
	poste_source: [
		{ label: 'Défaut transformateur de puissance', value: 'defaut_transfo_puissance', explanation: 'Surchauffe, défaut d\'isolement, fuite d\'huile ou foudre sur un transformateur de puissance du poste.' },
		{ label: 'Défaut disjoncteur / sectionneur', value: 'defaut_disjoncteur_sectionneur', explanation: 'Mauvaise manœuvre, défaillance du circuit de commande ou usure des contacts sur un disjoncteur ou un sectionneur.' },
		{ label: 'Défaut jeux de barres / connexions', value: 'defaut_jeux_barres', explanation: 'Court-circuit, surtension (foudre) ou vieillissement des isolateurs sur les jeux de barres ou les connexions.' },
		{ label: 'Foudre / surtension', value: 'foudre_surtension', explanation: 'Coup de foudre sur la ligne d\'arrivée HT ou sur les structures du poste ; surtension d\'origine interne (manœuvre, défaut).' },
		{ label: 'Perte alimentation amont (ligne HT)', value: 'perte_alimentation_amont', explanation: 'Ligne d\'arrivée HT coupée ou défaillante en amont du poste source.' },
		{ label: 'Défaillance auxiliaires (batteries, SCADA)', value: 'defaillance_auxiliaires', explanation: 'Panne des batteries, du chargeur ou du système SCADA / contrôle-commande empêchant les manœuvres ou la surveillance.' },
		{ label: 'Erreur de manœuvre', value: 'erreur_manoeuvre', explanation: 'Mauvaise séquence de manœuvre, non-respect des consignes ou travail sous tension ayant provoqué la coupure.' },
		{ label: 'Végétation / animal', value: 'vegetation_animal', explanation: 'Arbre ou branche sur la ligne ; animal (oiseau, rongeur) provoquant un court-circuit sur les barres ou câbles.' },
		{ label: 'Conditions météo (vent, inondation)', value: 'conditions_meteo', explanation: 'Vent fort, inondation du poste ou pollution des isolateurs (poussière, sel, industrie) entraînant un défaut.' },
		{ label: 'Autre', value: 'autre', explanation: 'Cause non listée (vol, vandalisme, etc.). À préciser dans le rapport si besoin.' }
	],
	ligne_hta: [
		{ label: 'Foudre / surtension', value: 'foudre_surtension', explanation: 'Coup de foudre sur la ligne ou sur un support ; surtension propagée.' },
		{ label: 'Perte alimentation amont', value: 'perte_alimentation_amont', explanation: 'Coupure ou défaut sur le tronçon amont de la ligne HT.' },
		{ label: 'Végétation (arbre, branche)', value: 'vegetation_animal', explanation: 'Arbre ou branche en contact avec les conducteurs ; débroussaillage insuffisant.' },
		{ label: 'Animal (oiseau, rongeur)', value: 'animal', explanation: 'Court-circuit provoqué par un animal sur les isolateurs ou les connexions.' },
		{ label: 'Défaut câble / connexion', value: 'defaut_cable_connexion', explanation: 'Câble défaillant, mauvaise connexion ou isolateurs dégradés.' },
		{ label: 'Conditions météo (vent, givre)', value: 'conditions_meteo', explanation: 'Vent fort (balançage, chute de support), givre ou pollution des isolateurs.' },
		{ label: 'Erreur de manœuvre / travaux', value: 'erreur_manoeuvre', explanation: 'Travaux sur la ligne, mauvaise manœuvre ou engin en contact.' },
		{ label: 'Autre', value: 'autre', explanation: 'Cause non listée. À préciser dans le rapport si besoin.' }
	],
	poste_cabine: [
		{ label: 'Défaut transformateur MT/BT', value: 'defaut_transfo', explanation: 'Surchauffe, défaut d\'isolement ou surcharge du transformateur de la cabine.' },
		{ label: 'Défaut disjoncteur / sectionneur', value: 'defaut_disjoncteur_sectionneur', explanation: 'Défaillance du disjoncteur ou du sectionneur MT de la cabine.' },
		{ label: 'Surcharge', value: 'surcharge', explanation: 'Surcharge prolongée ayant déclenché les protections ou endommagé un équipement.' },
		{ label: 'Foudre / surtension', value: 'foudre_surtension', explanation: 'Coup de foudre sur la cabine ou surtension propagée par la ligne.' },
		{ label: 'Défaillance auxiliaires', value: 'defaillance_auxiliaires', explanation: 'Panne des auxiliaires de la cabine (éclairage, commandes).' },
		{ label: 'Erreur de manœuvre', value: 'erreur_manoeuvre', explanation: 'Mauvaise manœuvre lors d\'un entretien ou d\'un dépannage.' },
		{ label: 'Autre', value: 'autre', explanation: 'Cause non listée. À préciser dans le rapport si besoin.' }
	],
	transformateur: [
		{ label: 'Défaut transformateur', value: 'defaut_transfo', explanation: 'Surchauffe, défaut d\'isolement, fuite d\'huile ou court-circuit interne.' },
		{ label: 'Surcharge', value: 'surcharge', explanation: 'Surcharge prolongée ayant déclenché les protections ou endommagé l\'enroulement.' },
		{ label: 'Foudre / surtension', value: 'foudre_surtension', explanation: 'Coup de foudre ou surtension ayant endommagé les enroulements ou les isolateurs.' },
		{ label: 'Vieillissement / usure', value: 'vieillissement', explanation: 'Usure normale, dégradation de l\'isolation ou des connexions.' },
		{ label: 'Autre', value: 'autre', explanation: 'Cause non listée. À préciser dans le rapport si besoin.' }
	],
	cellule: [
		{ label: 'Défaut disjoncteur / sectionneur', value: 'defaut_disjoncteur_sectionneur', explanation: 'Défaillance du circuit de commande, usure des contacts ou mauvaise isolation.' },
		{ label: 'Surcharge / court-circuit', value: 'surcharge', explanation: 'Déclenchement thermique ou magnétique suite à une surcharge ou un court-circuit.' },
		{ label: 'Foudre / surtension', value: 'foudre_surtension', explanation: 'Surtension ayant endommagé les organes de coupure ou les isolateurs.' },
		{ label: 'Erreur de manœuvre', value: 'erreur_manoeuvre', explanation: 'Manœuvre sous charge, mauvaise séquence ou travail sous tension.' },
		{ label: 'Autre', value: 'autre', explanation: 'Cause non listée. À préciser dans le rapport si besoin.' }
	],
	parafoudre: [
		{ label: 'Défaillance parafoudre', value: 'defaillance_parafoudre', explanation: 'Parafoudre en fin de vie ou endommagé après un coup de foudre ; perte de tenue.' },
		{ label: 'Foudre', value: 'foudre_surtension', explanation: 'Coup de foudre direct ou proche ayant provoqué le déclenchement ou la destruction du parafoudre.' },
		{ label: 'Vieillissement', value: 'vieillissement', explanation: 'Usure normale des éléments d\'absorption (varistances, éclateurs).' },
		{ label: 'Autre', value: 'autre', explanation: 'Cause non listée. À préciser dans le rapport si besoin.' }
	],
	arrivee_depart: [
		{ label: 'Défaut connexion / câble', value: 'defaut_connexion', explanation: 'Mauvaise connexion, câble défaillant ou isolateurs dégradés sur l\'arrivée ou le départ.' },
		{ label: 'Foudre / surtension', value: 'foudre_surtension', explanation: 'Surtension sur l\'arrivée HT ou sur le départ MT.' },
		{ label: 'Perte alimentation amont (arrivée)', value: 'perte_alimentation_amont', explanation: 'Coupure en amont de l\'arrivée HT (ligne ou poste amont).' },
		{ label: 'Surcharge (départ)', value: 'surcharge', explanation: 'Surcharge sur le départ ayant déclenché les protections.' },
		{ label: 'Erreur de manœuvre', value: 'erreur_manoeuvre', explanation: 'Mauvaise manœuvre sur les cellules d\'arrivée ou de départ.' },
		{ label: 'Autre', value: 'autre', explanation: 'Cause non listée. À préciser dans le rapport si besoin.' }
	],
	poteau: [
		{ label: 'Végétation', value: 'vegetation_animal', explanation: 'Arbre ou branche en contact avec les conducteurs ou les isolateurs.' },
		{ label: 'Animal (oiseau, rongeur)', value: 'animal', explanation: 'Court-circuit provoqué par un animal sur le support ou les connexions.' },
		{ label: 'Foudre', value: 'foudre_surtension', explanation: 'Coup de foudre sur le poteau ou sur la ligne à proximité.' },
		{ label: 'Accident (choc, chute)', value: 'accident', explanation: 'Choc véhicule, chute d\'objet ou effondrement partiel du support.' },
		{ label: 'Conditions météo (vent)', value: 'conditions_meteo', explanation: 'Vent fort ayant provoqué balançage excessif, chute de conducteur ou de support.' },
		{ label: 'Autre', value: 'autre', explanation: 'Cause non listée. À préciser dans le rapport si besoin.' }
	],
	ligne_bt: [
		{ label: 'Défaut câble / connexion', value: 'defaut_cable_connexion', explanation: 'Câble BT défaillant, mauvaise connexion au transfo ou au départ.' },
		{ label: 'Végétation / animal', value: 'vegetation_animal', explanation: 'Contact végétation ou animal avec les conducteurs BT.' },
		{ label: 'Foudre / surtension', value: 'foudre_surtension', explanation: 'Surtension propagée sur le réseau BT.' },
		{ label: 'Surcharge', value: 'surcharge', explanation: 'Surcharge ayant fait déclencher les protections ou surchauffer le câble.' },
		{ label: 'Travaux / erreur de manœuvre', value: 'erreur_manoeuvre', explanation: 'Travaux sur la ligne BT ou mauvaise manœuvre.' },
		{ label: 'Autre', value: 'autre', explanation: 'Cause non listée. À préciser dans le rapport si besoin.' }
	],
	raccordement: [
		{ label: 'Défaut branchement', value: 'defaut_branchement', explanation: 'Câble de branchement défaillant, mauvaise connexion au compteur ou au point de raccordement.' },
		{ label: 'Surcharge', value: 'surcharge', explanation: 'Surcharge ou court-circuit côté client ayant fait sauter les protections.' },
		{ label: 'Non-paiement / coupure programmée', value: 'coupure_programmee', explanation: 'Coupure administrative (non-paiement, consignation).' },
		{ label: 'Travaux / manœuvre', value: 'erreur_manoeuvre', explanation: 'Travaux sur le branchement ou manœuvre lors d\'un raccordement.' },
		{ label: 'Autre', value: 'autre', explanation: 'Cause non listée. À préciser dans le rapport si besoin.' }
	],
	default: [
		{ label: 'Défaut équipement', value: 'defaut_equipement', explanation: 'Défaillance technique de l\'ouvrage (isolation, connexion, organe).' },
		{ label: 'Foudre / surtension', value: 'foudre_surtension', explanation: 'Coup de foudre ou surtension ayant endommagé l\'ouvrage.' },
		{ label: 'Surcharge', value: 'surcharge', explanation: 'Surcharge ayant déclenché les protections ou endommagé l\'équipement.' },
		{ label: 'Erreur de manœuvre', value: 'erreur_manoeuvre', explanation: 'Mauvaise manœuvre ou travail sous tension.' },
		{ label: 'Conditions météo / environnement', value: 'conditions_meteo', explanation: 'Vent, inondation, pollution ou autre cause externe.' },
		{ label: 'Autre', value: 'autre', explanation: 'Cause non listée. À préciser dans le rapport si besoin.' }
	]
};

const MAP_COLORS = [
	'#ec4899', '#38bdf8', '#22c55e', '#a855f7', '#f97316', '#eab308', '#ef4444', '#3b82f6',
	'#d97706', '#14b8a6', '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9',
	'#10b981', '#6366f1', '#f59e0b', '#fb923c', '#4ade80', '#2dd4bf', '#c084fc', '#f472b6'
];

@Component({
	selector: 'app-trace-reseau',
	standalone: true,
	imports: [CommonModule, FormsModule, Select, DialogModule, ButtonModule],
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
	/** Lignes de secours pour la réalimentation (à la place des départs) */
	ligneSecoursHtaOptions: { label: string; value: string }[] = [];
	ligneSecoursBtOptions: { label: string; value: string }[] = [];
	ligneSecoursBrchtOptions: { label: string; value: string }[] = [];
	ligneSecoursOptions: { label: string; value: string }[] = [];
	paramLigneSecours: string | null = null;
	ligneSecoursFieldLabel = 'Ligne de secours';
	ligneSecoursNetworkLabel = '';

	/** Slug de la table utilisée pour chaque type (détecté au chargement) */
	private slugPosteSource = '';
	private slugPosteTransfo = '';
	private slugAbonne = '';
	private slugLigneHta = '';
	private slugLigneBt = '';
	private slugLigneBrcht = '';
	private slugDepartHta = '';
	private slugDepartBt = '';

	/** Couches chargées depuis l’API (un ouvrage par table) */
	couchesReseau: { id: string; label: string; color: string; visible: boolean }[] = [];

	/** Clés (slug:id) des ouvrages du tracé courant pour surligner la carte */
	private traceOuvrageIds = new Set<string>();
	private traceOuvrageIdsCanon = new Set<string>();

	resumeLongueurKm = 0;
	resumePoteaux = 0;
	resumeOuvrages = 0;
	traceInsightsOpen = false;
	lastTraceDirection: 'amont' | 'aval' | 'tous' | null = null;
	traceDetails: { slug: string; id: string; kind: 'ligne' | 'point' | 'autre'; color: string }[] = [];
	traceTypeCounts: { slug: string; count: number; color: string }[] = [];
	coupureActive = false;
	coupureStartLabel = '';
	coupureStartType = '';
	coupureImpactedAbonnes = 0;
	coupureImpactedLignes = 0;
	coupureImpactedPoints = 0;
	coupureExecutedAt = '';
	/** Modale de sélection de la cause (affichée sur la carte) */
	showCoupureCauseModal = false;
	coupureCauseSelected: string | null = null;
	coupureCauseLabel = '';
	/** Causes possibles pour l’ouvrage courant (selon type d’ouvrage, expert métier). */
	get coupureCauseOptions(): CoupureCauseOption[] {
		const slug = (this.selectedMapStart?.slug || this.getSlugForCurrentType() || '').toLowerCase();
		const category = this.getCoupureOuvrageCategory(slug);
		return COUPURE_CAUSES_BY_OUVRAGE[category] ?? COUPURE_CAUSES_BY_OUVRAGE['default'];
	}
	/** Libellé court du type d’ouvrage pour l’en-tête de la modale cause. */
	get coupureOuvrageLabel(): string {
		const slug = (this.selectedMapStart?.slug || this.getSlugForCurrentType() || '').toLowerCase();
		const category = this.getCoupureOuvrageCategory(slug);
		const labels: Record<string, string> = {
			poste_source: 'Poste source',
			ligne_hta: 'Ligne HTA',
			poste_cabine: 'Poste cabine / Transfo',
			transformateur: 'Transformateur',
			cellule: 'Cellule (disjoncteur / sectionneur)',
			parafoudre: 'Parafoudre',
			arrivee_depart: 'Arrivée / Départ',
			poteau: 'Poteau',
			ligne_bt: 'Ligne BT',
			raccordement: 'Point de raccordement',
			default: 'Ouvrage'
		};
		return labels[category] ?? labels['default'];
	}
	private _coupureCauseEnCours = '';
	reelimentationActive = false;
	reelimentationOpen = false;
	reelimentationImpacted = 0;
	reelimentationBypass = 0;
	reelimentationImpossible = 0;
	reelimentationExecutedAt = '';
	private reelimentationCutSet = new Set<string>();
	private reelimentationSupplySet = new Set<string>();
	private reelimentationCutSetCanon = new Set<string>();
	private reelimentationSupplySetCanon = new Set<string>();
	/** Lignes/ouvrages pouvant alimenter la zone coupée (tracé depuis le départ de secours sélectionné). */
	private coupureSupplyOuvrageIdsCanon = new Set<string>();

	/** Schéma unifilaire : modale et sections du flux (poste source → HT → ouvrages → BT → raccordements). */
	showUnifilaireModal = false;
	unifilaireSections: { stageLabel: string; order: number; items: { slug: string; label: string; count: number; color: string }[] }[] = [];
	/** Code PlantUML pour le schéma unifilaire d'un poste source (à utiliser dans un outil PlantUML). */
	unifilairePlantUmlCode = '';
	/** Message d'erreur ou d'info pour le schéma unifilaire (PowSyBL). */
	unifilaireDiagramError: string | null = null;
	/** SVG du schéma unifilaire (généré par backend PowSyBL). */
	unifilaireSvgContent: string | null = null;
	/** SVG sanitized pour [innerHTML] (évite le filtrage Angular). */
	get safeUnifilaireSvgContent(): SafeHtml | null {
		return this.unifilaireSvgContent != null
			? this.sanitizer.bypassSecurityTrustHtml(this.unifilaireSvgContent)
			: null;
	}

	canUndo = false;
	canRedo = false;

	/** Correction de topologie */
	topologyTolerance = 2;
	/** Rayon (m) pour rattacher une ligne à un nœud (connectivité) : BT/branchement ↔ HTA peut dépasser 100 m. */
	connectivitySearchRadiusM = 1000;
	topologyCorrecting = false;
	topologyResult: (TopologyCorrectResponse & { error?: string }) | null = null;
	topologyValidationType: 'connectivite' | 'topologie' | 'all' = 'all';
	topologyValidating = false;
	topologyValidationFloatOpen = false;
	topologyValidationResult: (TopologyValidationResponse & { error?: string }) | null = null;
	topologyAutoCorrectionInProgress = false;
	topologyAutoCorrectionIssueKey: string | null = null;
	/** Résumé lisible de la dernière correction auto (affiché dans le panneau flottant). */
	topologyCorrectionFeedback: { success: boolean; title: string; lines: string[] } | null = null;
	private topologyViolationCanon = new Set<string>();

	private map: unknown = null;
	private layerGroup: unknown = null;
	private initialBounds: unknown = null;
	private slugToLayerGroups = new Map<string, unknown>();
	private rowsBySlug = new Map<string, Record<string, unknown>[]>();
	/** Pour clignoter sur la carte : (slug + ':' + id) -> layer Leaflet */
	private slugIdToLayer = new Map<string, {
		getBounds?: () => { getCenter?: () => unknown };
		getLatLng?: () => { lat: number; lng: number };
		setStyle?: (s: object) => void;
		bringToFront?: () => void;
	}>();
	/** Groupe Leaflet pour le cercle de clignotement */
	private highlightLayerGroup: { addLayer: (l: unknown) => void; clearLayers: () => void } | null = null;
	private traceClusterLayerGroup: { addLayer: (l: unknown) => void; clearLayers: () => void } | null = null;
	private blinkCircle: unknown = null;
	private blinkInterval: ReturnType<typeof setInterval> | null = null;
	private flowAnimationInterval: ReturnType<typeof setInterval> | null = null;
	private secoursAnimationInterval: ReturnType<typeof setInterval> | null = null;
	private flowDashOffset = 0;
	private pointPulsePhase = false;
	private secoursPulsePhase = false;
	selectedTraceRowKey: string | null = null;
	private popupButtonsClickListener: ((e: Event) => void) | null = null;
	selectedMapStart: { slug: string; id: string; label: string } | null = null;
	showStartSelectors = true;

	constructor(
		private gisApi: GisApiService,
		private cdr: ChangeDetectorRef,
		private sanitizer: DomSanitizer
	) {}

	ngOnInit(): void {
		this.loadOptionsForTrace();
	}

	ngAfterViewInit(): void {
		this.initMap();
	}

	ngOnDestroy(): void {
		this.stopBlink();
		this.stopFlowAnimation();
		this.stopSecoursAnimation();
		this.clearTracePointClusters();
		if (this.popupButtonsClickListener && this.mapContainer?.nativeElement) {
			this.mapContainer.nativeElement.removeEventListener('click', this.popupButtonsClickListener);
			this.popupButtonsClickListener = null;
		}
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
					this.cdr.markForCheck();
				});
			}
			// Lignes de secours pour réalimentation (ligne HTA, ligne BT, ligne branchement).
			const ligneHtaSlug = bySlug.has('ligne-hta') ? 'ligne-hta' : [...bySlug.keys()].find((s) => s.includes('ligne') && s.includes('hta'));
			const ligneBtSlug = bySlug.has('ligne-bt') ? 'ligne-bt' : [...bySlug.keys()].find((s) => s.includes('ligne') && s.includes('bt') && !s.includes('brcht'));
			const ligneBrchtSlug = bySlug.has('ligne-brcht') ? 'ligne-brcht' : [...bySlug.keys()].find((s) => s.includes('ligne') && (s.includes('brcht') || s.includes('branchement')));
			if (ligneHtaSlug) {
				const t = bySlug.get(ligneHtaSlug)!;
				this.slugLigneHta = t.slug;
				this.gisApi.getList(t.slug, 500, 0).subscribe((rows) => {
					const opts = this.buildOptionsFromRows(rows, ['numero', 'code', 'name', 'nom', 'gid'], 'Ligne HTA');
					this.ligneSecoursHtaOptions = opts.map((o) => ({ label: `Ligne HTA - ${o.label}`, value: this.encodeSelectionValue(t.slug, o.value) }));
					this.updateLigneSecoursOptionsBySelection();
					this.cdr.markForCheck();
				});
			}
			if (ligneBtSlug) {
				const t = bySlug.get(ligneBtSlug)!;
				this.slugLigneBt = t.slug;
				this.gisApi.getList(t.slug, 500, 0).subscribe((rows) => {
					const opts = this.buildOptionsFromRows(rows, ['numero', 'code', 'name', 'nom', 'gid'], 'Ligne BT');
					this.ligneSecoursBtOptions = opts.map((o) => ({ label: `Ligne BT - ${o.label}`, value: this.encodeSelectionValue(t.slug, o.value) }));
					this.updateLigneSecoursOptionsBySelection();
					this.cdr.markForCheck();
				});
			}
			if (ligneBrchtSlug) {
				const t = bySlug.get(ligneBrchtSlug)!;
				this.slugLigneBrcht = t.slug;
				this.gisApi.getList(t.slug, 500, 0).subscribe((rows) => {
					const opts = this.buildOptionsFromRows(rows, ['numero', 'code', 'name', 'nom', 'gid'], 'Ligne branchement');
					this.ligneSecoursBrchtOptions = opts.map((o) => ({ label: `Ligne branchement - ${o.label}`, value: this.encodeSelectionValue(t.slug, o.value) }));
					this.updateLigneSecoursOptionsBySelection();
					this.cdr.markForCheck();
				});
			}
			// Poste transformation : fusionner poste-cabine + transfo-poteau (+ fallback transfo-ht-bt)
			const transfoSlugKeys: string[] = [];
			if (bySlug.has('poste-cabine')) transfoSlugKeys.push('poste-cabine');
			if (bySlug.has('transfo-poteau')) transfoSlugKeys.push('transfo-poteau');
			if (bySlug.has('transfo-ht-bt')) transfoSlugKeys.push('transfo-ht-bt');
			if (transfoSlugKeys.length === 0) {
				const fallback = [...bySlug.keys()].find((s) =>
					(s.includes('poste') && s.includes('cabine'))
					|| (s.includes('transfo') && s.includes('poteau'))
					|| (s.includes('transfo') && s.includes('ht') && s.includes('bt'))
				);
				if (fallback) transfoSlugKeys.push(fallback);
			}
			if (transfoSlugKeys.length > 0) {
				this.slugPosteTransfo = bySlug.get(transfoSlugKeys[0])!.slug;
				forkJoin(
					transfoSlugKeys.map((k) => {
						const slug = bySlug.get(k)!.slug;
						return this.gisApi.getList(slug, 200, 0).pipe(
							map((rows) => ({ slug, rows })),
							catchError(() => of({ slug, rows: [] as Record<string, unknown>[] }))
						);
					})
				).subscribe((packs) => {
					const merged: { label: string; value: string }[] = [];
					for (const pack of packs) {
						const sourceLabel =
							pack.slug.includes('poste-cabine') ? 'Poste cabine'
								: pack.slug.includes('transfo-poteau') ? 'Transfo poteau'
									: 'Transfo';
						const opts = this.buildOptionsFromRows(pack.rows, ['numero', 'code_poste', 'code_transfo', 'distributionstationcode', 'transformercode', 'name', 'gid'], sourceLabel);
						for (const o of opts) {
							merged.push({
								label: `${sourceLabel} - ${o.label}`,
								value: this.encodeSelectionValue(pack.slug, o.value)
							});
						}
					}
					const uniq = new Map<string, { label: string; value: string }>();
					for (const o of merged) {
						if (!uniq.has(o.value)) uniq.set(o.value, o);
					}
					this.posteTransfoOptions = Array.from(uniq.values());
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

	private encodeSelectionValue(slug: string, id: string): string {
		return `${slug}||${id}`;
	}

	private decodeSelectionValue(value: string | null): { slug: string; id: string } | null {
		if (!value) return null;
		const idx = value.indexOf('||');
		if (idx < 0) return null;
		const slug = value.slice(0, idx).trim();
		const id = value.slice(idx + 2).trim();
		if (!slug || !id) return null;
		return { slug, id };
	}

	onTypePointChange(): void {
		this.selectedMapStart = null;
		this.showStartSelectors = true;
		this.resetCoupureState();
		this.resetReelimentationState();
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
		if (this.paramTypePoint !== 'poste_transformation' || !this.paramPosteTransfo?.includes('||')) {
			this.selectedMapStart = null;
		}
		this.showStartSelectors = !this.hasSelection();
		this.resetCoupureState();
		this.resetReelimentationState();
		this.updateLigneSecoursOptionsBySelection();
		console.log('[Trace réseau] Sélection changée', {
			type: this.paramTypePoint,
			id: this.getSelectedId(),
			slug: this.getSlugForCurrentType()
		});
		setTimeout(() => this.highlightSelectionOnMap(), 0);
	}

	private getSlugForCurrentType(): string {
		if (this.paramTypePoint === 'poste_source') return this.slugPosteSource;
		if (this.paramTypePoint === 'poste_transformation') {
			const decoded = this.decodeSelectionValue(this.paramPosteTransfo);
			return decoded?.slug ?? this.slugPosteTransfo;
		}
		if (this.paramTypePoint === 'abonne') return this.slugAbonne;
		return '';
	}

	/** Retourne la catégorie d’ouvrage pour les causes de coupure (expert métier). */
	private getCoupureOuvrageCategory(slug: string): string {
		const s = (slug || '').toLowerCase().replace(/-/g, '_');
		if (s.includes('poste_source') || s === 'poste_source') return 'poste_source';
		if (s.includes('ligne_hta') || s === 'ligne_hta') return 'ligne_hta';
		if (s.includes('poste_cabine') || s.includes('poste_transformation')) return 'poste_cabine';
		if (s.includes('transformateur') || s.includes('transfo')) return 'transformateur';
		if (s.includes('cellule')) return 'cellule';
		if (s.includes('parafoudre')) return 'parafoudre';
		if (s.includes('arrivee') || s.includes('depart')) return 'arrivee_depart';
		if (s.includes('poteau')) return 'poteau';
		if (s.includes('ligne_bt') || s.includes('ligne_brcht')) return 'ligne_bt';
		if (s.includes('raccordement') || s.includes('abonne') || s.includes('branchement')) return 'raccordement';
		return 'default';
	}

	private getSelectedId(): string {
		if (this.selectedMapStart) return this.selectedMapStart.id;
		if (this.paramTypePoint === 'poste_source' && this.paramPosteSource) return this.paramPosteSource;
		if (this.paramTypePoint === 'poste_transformation' && this.paramPosteTransfo) {
			const decoded = this.decodeSelectionValue(this.paramPosteTransfo);
			return decoded?.id ?? this.paramPosteTransfo;
		}
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

	private stopFlowAnimation(): void {
		if (this.flowAnimationInterval) {
			clearInterval(this.flowAnimationInterval);
			this.flowAnimationInterval = null;
		}
	}

	private stopSecoursAnimation(): void {
		if (this.secoursAnimationInterval) {
			clearInterval(this.secoursAnimationInterval);
			this.secoursAnimationInterval = null;
		}
		this.secoursPulsePhase = false;
	}

	private clearTracePointClusters(): void {
		if (this.traceClusterLayerGroup) this.traceClusterLayerGroup.clearLayers();
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
				m.fitBounds(b, { padding: [70, 70], maxZoom: 22 });
			} else if (m?.setView && latLng) {
				m.setView(latLng, 20, { animate: true });
			}
		});
	}

	/** True si un point de départ est sélectionné selon le type */
	hasSelection(): boolean {
		if (this.selectedMapStart) return true;
		if (this.paramTypePoint === 'poste_source') return this.paramPosteSource != null && this.paramPosteSource !== '';
		if (this.paramTypePoint === 'poste_transformation') return this.paramPosteTransfo != null && this.paramPosteTransfo !== '';
		if (this.paramTypePoint === 'abonne') return this.paramAbonne != null && this.paramAbonne !== '';
		return false;
	}

	/** Retourne l’identifiant du point sélectionné selon le type */
	private getSelectedRefId(): string {
		if (this.selectedMapStart) return this.selectedMapStart.id;
		if (this.paramTypePoint === 'poste_source' && this.paramPosteSource) return this.paramPosteSource;
		if (this.paramTypePoint === 'poste_transformation' && this.paramPosteTransfo) {
			const decoded = this.decodeSelectionValue(this.paramPosteTransfo);
			return decoded?.id ?? this.paramPosteTransfo;
		}
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
			if (res.corrected > 0) {
				void this.loadGeometries();
			}
		});
	}

	getTopologyDetails(): { slug: string; updated: number }[] {
		if (!this.topologyResult?.by_table) return [];
		return Object.entries(this.topologyResult.by_table)
			.filter(([, v]) => v.updated > 0)
			.map(([slug, v]) => ({ slug, updated: v.updated }));
	}

	lancerValidationTopologie(): void {
		this.topologyValidating = true;
		this.topologyValidationResult = null;
		this.topologyCorrectionFeedback = null;
		this.topologyValidationFloatOpen = true;
		this.cdr.markForCheck();
		this.gisApi.validateTopology(this.topologyValidationType, 600).pipe(
			catchError((err) => {
				this.topologyValidating = false;
				this.topologyViolationCanon = new Set();
				this.topologyValidationResult = {
					check_type: this.topologyValidationType,
					total_issues: 0,
					by_rule_type: { connectivite: 0, topologie: 0 },
					by_slug: {},
					issues: [],
					error: err?.error?.detail || err?.message || 'Erreur lors de la validation.'
				};
				this.applyTraceStyleToMap();
				this.topologyValidationFloatOpen = true;
				this.cdr.markForCheck();
				return of(this.topologyValidationResult);
			})
		).subscribe((res) => {
			this.topologyValidating = false;
			this.topologyValidationResult = res;
			this.topologyValidationFloatOpen = true;
			const canon = new Set<string>();
			for (const issue of res.issues || []) {
				canon.add(this.normalizeOuvrageKey(`${issue.slug}:${issue.id}`));
			}
			this.topologyViolationCanon = canon;
			this.applyTraceStyleToMap();
			this.cdr.markForCheck();
		});
	}

	canAutoCorrectIssue(issue: TopologyValidationIssue): boolean {
		if (typeof issue.auto_correctable === 'boolean') return issue.auto_correctable;
		return issue.rule_type === 'topologie' || issue.rule_type === 'connectivite';
	}

	getAutoCorrectionLabel(issue: TopologyValidationIssue): string {
		if (this.canAutoCorrectIssue(issue)) return 'Correction disponible';
		return issue.auto_correction_reason || 'Cas non corrigeable automatiquement';
	}

	isAutoCorrectingIssue(issue: TopologyValidationIssue): boolean {
		return this.topologyAutoCorrectionIssueKey === this.getTopologyIssueKey(issue);
	}

	/** Détail lisible pour le panneau : ce qui a été modifié pour lever l’anomalie. */
	private buildCorrectionFeedback(res: TopologyCorrectIssueResponse): { success: boolean; title: string; lines: string[] } {
		const lines: string[] = [];
		const equipement = `${res.slug}, identifiant ${res.id}`;

		if (!res.success) {
			lines.push(res.message || 'Correction impossible.');
			if (res.updates?.length) {
				for (const u of res.updates) {
					if (u.ok) continue;
					if (u.reason === 'aucun_noeud_dans_le_rayon' && u.distance_m != null) {
						lines.push(
							`Champ « ${u.column} » : aucun nœud (${u.node_slug || 'réseau'}) dans le rayon — distance au plus proche : ${u.distance_m < 100 ? u.distance_m.toFixed(1) : Math.round(u.distance_m)} m.`
						);
					} else if (u.error) {
						lines.push(`Champ « ${u.column} » : ${u.error}`);
					} else if (u.reason) {
						lines.push(`Champ « ${u.column} » : ${u.reason}`);
					}
				}
			}
			return { success: false, title: 'Correction non appliquée', lines };
		}

		if (res.rule_type === 'topologie') {
			const mv = res.make_valid_updated ?? 0;
			const snap = res.snap_updated ?? 0;
			if (mv > 0) {
				lines.push('Géométrie rendue valide (ST_MakeValid), ce qui supprime les erreurs de validité / géométrie vide.');
			}
			if (snap > 0) {
				lines.push(
					`Extrémités de la ligne rapprochées vers les nœuds du réseau (snap, ${snap} mise(s) à jour) — alignement sur la règle de contiguïté / snap spatial.`
				);
			}
			if (mv === 0 && snap === 0) {
				lines.push(res.message || 'Aucune modification nécessaire : l’ouvrage est déjà conforme sur ces points.');
			}
			return {
				success: true,
				title: `Équipement mis à jour — ${equipement}`,
				lines: lines.length ? lines : [res.message || 'OK']
			};
		}

		const okUpdates = res.updates?.filter((u) => u.ok) ?? [];
		for (const u of okUpdates) {
			const dist =
				u.distance_m != null
					? ` ; distance au nœud choisi : ${u.distance_m < 100 ? u.distance_m.toFixed(1) : Math.round(u.distance_m)} m`
					: '';
			lines.push(
				`Champ « ${u.column} » renseigné avec la référence ${u.value} (table nœud « ${u.node_slug || '?'} »)${dist}. La ligne est ainsi reliée logiquement au réseau.`
			);
		}
		const failed = res.updates?.filter((u) => !u.ok) ?? [];
		for (const u of failed) {
			if (u.reason === 'aucun_noeud_dans_le_rayon' && u.distance_m != null) {
				lines.push(
					`Attention — champ « ${u.column} » non renseigné : aucun nœud dans le rayon (plus proche à ${u.distance_m < 100 ? u.distance_m.toFixed(1) : Math.round(u.distance_m)} m).`
				);
			} else if (!u.ok) {
				lines.push(`Attention — champ « ${u.column} » : ${u.error || u.reason || 'échec'}`);
			}
		}
		if (!lines.length) {
			lines.push(res.message || 'Aucun champ vide à compléter.');
		}
		return {
			success: true,
			title: `Connectivité mise à jour — ${equipement}`,
			lines
		};
	}

	corrigerIssueTopologie(issue: TopologyValidationIssue, event?: Event): void {
		event?.stopPropagation();
		if (!this.canAutoCorrectIssue(issue) || this.topologyAutoCorrectionInProgress) return;
		this.topologyAutoCorrectionInProgress = true;
		this.topologyAutoCorrectionIssueKey = this.getTopologyIssueKey(issue);
		this.topologyCorrecting = true;
		this.topologyResult = null;
		this.topologyCorrectionFeedback = null;
		this.cdr.markForCheck();
		this.gisApi
			.correctTopologyIssue({
				slug: issue.slug,
				id: issue.id,
				rule_type: issue.rule_type,
				tolerance_m: this.topologyTolerance,
				...(issue.rule_type === 'connectivite'
					? { search_radius_m: Math.max(this.connectivitySearchRadiusM, this.topologyTolerance * 3) }
					: {})
			})
			.pipe(
				switchMap((res) => {
					this.topologyCorrectionFeedback = this.buildCorrectionFeedback(res);
					if (!res.success) {
						this.topologyResult = {
							corrected: 0,
							by_table: {},
							error: res.message || 'Correction impossible.'
						};
					} else {
						const snap = res.snap_updated ?? 0;
						const mv = res.make_valid_updated ?? 0;
						const connOk = res.updates?.filter((u) => u.ok).length ?? 0;
						this.topologyResult = {
							corrected: snap + mv + connOk,
							by_table: {},
							message: res.message || 'Correction effectuée.'
						};
						if (snap > 0 || mv > 0 || connOk > 0) {
							return from(this.loadGeometries()).pipe(
								switchMap(() => this.gisApi.validateTopology(this.topologyValidationType, 600))
							);
						}
					}
					return this.gisApi.validateTopology(this.topologyValidationType, 600);
				}),
				catchError((err) => {
					const msg = err?.error?.detail || err?.message || 'Erreur lors de la correction automatique.';
					this.topologyResult = {
						corrected: 0,
						by_table: {},
						error: msg
					};
					this.topologyCorrectionFeedback = {
						success: false,
						title: 'Erreur technique',
						lines: [msg]
					};
					return of(null);
				})
			)
			.subscribe((validationRes) => {
				this.topologyCorrecting = false;
				this.topologyAutoCorrectionInProgress = false;
				this.topologyAutoCorrectionIssueKey = null;
				if (validationRes) {
					this.topologyValidationResult = validationRes;
					this.topologyValidationFloatOpen = true;
					const canon = new Set<string>();
					for (const currentIssue of validationRes.issues || []) {
						canon.add(this.normalizeOuvrageKey(`${currentIssue.slug}:${currentIssue.id}`));
					}
					this.topologyViolationCanon = canon;
					this.applyTraceStyleToMap();
				}
				this.cdr.markForCheck();
			});
	}

	effacerValidationTopologie(): void {
		this.topologyViolationCanon = new Set();
		this.topologyValidationResult = null;
		this.topologyCorrectionFeedback = null;
		this.topologyValidationFloatOpen = false;
		this.applyTraceStyleToMap();
		this.cdr.markForCheck();
	}

	tracerAmont(): void {
		this.runTrace('amont');
	}

	tracerAval(): void {
		this.runTrace('aval');
	}

	tracerTousConnectes(): void {
		this.runTrace('tous');
	}

	/** Ouvre la modale de sélection de la cause sur la carte. */
	simulerCoupure(): void {
		this.showCoupureCauseModal = true;
		this.coupureCauseSelected = null;
		this.cdr.markForCheck();
	}

	/** Ferme la modale cause sans exécuter la coupure. */
	annulerCoupureCause(): void {
		this.showCoupureCauseModal = false;
		this.coupureCauseSelected = null;
		this.cdr.markForCheck();
	}

	/** Exécute la simulation de coupure après validation de la cause dans la modale. */
	confirmerCoupureAvecCause(): void {
		if (!this.coupureCauseSelected || !this.hasSelection()) return;
		const opt = this.coupureCauseOptions.find((o) => o.value === this.coupureCauseSelected);
		this._coupureCauseEnCours = opt?.label ?? this.coupureCauseSelected;
		this.showCoupureCauseModal = false;
		this.coupureCauseSelected = null;
		this.runTrace('tous', 'coupure');
		this.cdr.markForCheck();
	}

	simulerReelimentation(): void {
		const refId = this.getSelectedRefId();
		const ligneSecoursId = this.getLigneSecoursId();
		if (!refId || !ligneSecoursId) return;
		const traceType = this.selectedMapStart ? 'ouvrage' : this.paramTypePoint;
		this.mapLoading = true;
		this.resetReelimentationState();
		this.cdr.markForCheck();
		forkJoin({
			coupure: this.gisApi.getTrace(traceType, refId, 'tous').pipe(catchError(() => of({ ouvrage_ids: [] }))),
			secours: this.gisApi.getTrace('ouvrage', ligneSecoursId, 'tous').pipe(catchError(() => of({ ouvrage_ids: [] })))
		}).subscribe({
			next: ({ coupure, secours }) => {
				this.mapLoading = false;
				const cut = (coupure.ouvrage_ids || []).map((o) => `${o.slug}:${o.id}`);
				const supply = new Set((secours.ouvrage_ids || []).map((o) => `${o.slug}:${o.id}`));
				const bypass = cut.filter((k) => supply.has(k));
				this.reelimentationCutSet = new Set(cut);
				this.reelimentationSupplySet = new Set(bypass);
				this.reelimentationCutSetCanon = new Set(cut.map((k) => this.normalizeOuvrageKey(k)));
				this.reelimentationSupplySetCanon = new Set(bypass.map((k) => this.normalizeOuvrageKey(k)));
				this.reelimentationActive = true;
				this.reelimentationImpacted = cut.length;
				this.reelimentationBypass = bypass.length;
				this.reelimentationImpossible = Math.max(0, cut.length - bypass.length);
				this.reelimentationExecutedAt = new Date().toLocaleString('fr-FR');
				// Conserver la structure d'analyse existante sur la zone coupée.
				this.applyTraceResult(coupure.ouvrage_ids || [], 'tous');
				this.stopFlowAnimation();
				this.applyTraceStyleToMap();
				this.cdr.markForCheck();
			},
			error: () => {
				this.mapLoading = false;
				this.cdr.markForCheck();
			}
		});
	}

	onLigneSecoursChange(): void {
		this.startSecoursAnimation();
		if (this.coupureActive) this.loadCoupureSupplyTrace();
		this.applyTraceStyleToMap();
		this.cdr.markForCheck();
	}

	toggleReelimentationPanel(): void {
		this.reelimentationOpen = !this.reelimentationOpen;
		if (this.reelimentationOpen) {
			this.updateLigneSecoursOptionsBySelection();
			this.startSecoursAnimation();
		} else {
			this.stopSecoursAnimation();
			this.applyTraceStyleToMap();
		}
		this.cdr.markForCheck();
	}

	/** Lance le tracé et affiche les ouvrages connectés */
	private runTrace(direction: 'amont' | 'aval' | 'tous', mode: 'trace' | 'coupure' = 'trace'): void {
		const refId = this.getSelectedRefId();
		if (!refId) return;
		const traceType = this.selectedMapStart ? 'ouvrage' : this.paramTypePoint;
		this.mapLoading = true;
		this.cdr.markForCheck();
		this.gisApi.getTrace(traceType, refId, direction).pipe(
			catchError(() => of({ ouvrage_ids: [] }))
		).subscribe({
			next: (res) => {
				this.mapLoading = false;
				this.applyTraceResult(res.ouvrage_ids || [], direction);
				if (mode === 'coupure') {
					this.applyCoupureResult(res.ouvrage_ids || []);
				}
				this.cdr.markForCheck();
			},
			error: () => {
				this.mapLoading = false;
				this.cdr.markForCheck();
			}
		});
	}

	private traceFromMapSelection(slug: string, id: string, label: string, direction: 'amont' | 'aval' | 'tous'): void {
		this.selectedMapStart = { slug, id, label: label || `${slug}:${id}` };
		this.showStartSelectors = false;
		this.updateLigneSecoursOptionsBySelection();
		this.runTrace(direction);
	}

	private simulateCoupureFromMapSelection(slug: string, id: string, label: string): void {
		this.selectedMapStart = { slug, id, label: label || `${slug}:${id}` };
		this.showStartSelectors = false;
		this.updateLigneSecoursOptionsBySelection();
		this.showCoupureCauseModal = true;
		this.coupureCauseSelected = null;
		this.cdr.markForCheck();
	}

	showSelectionDropdowns(): void {
		this.showStartSelectors = true;
		this.cdr.markForCheck();
	}

	clearCurrentSelection(): void {
		this.selectedMapStart = null;
		this.paramPosteSource = null;
		this.paramPosteTransfo = null;
		this.paramAbonne = null;
		this.showStartSelectors = true;
		this.resetCoupureState();
		this.resetReelimentationState();
		this.updateLigneSecoursOptionsBySelection();
		this.cdr.markForCheck();
	}

	private detectCurrentCutNetwork(): 'hta' | 'bt' | null {
		const slug = (this.selectedMapStart?.slug || this.getSlugForCurrentType() || '').toLowerCase();
		if (slug) {
			if (slug.includes('hta')) return 'hta';
			if (
				slug.includes('bt') ||
				slug.includes('raccord') ||
				slug.includes('brcht') ||
				slug.includes('abonne') ||
				slug.includes('branchement')
			) return 'bt';
			if (slug.includes('depart-bt')) return 'bt';
			if (slug === 'depart' || slug.includes('depart')) return 'hta';
		}
		// Fallback selon le type de point de départ UI.
		if (this.paramTypePoint === 'poste_source') return 'hta';
		if (this.paramTypePoint === 'poste_transformation' || this.paramTypePoint === 'abonne') return 'bt';
		return null;
	}

	private updateLigneSecoursOptionsBySelection(): void {
		const network = this.detectCurrentCutNetwork();
		let options: { label: string; value: string }[] = [];
		if (network === 'bt') {
			options = [...this.ligneSecoursBtOptions, ...this.ligneSecoursBrchtOptions];
			this.ligneSecoursFieldLabel = 'Ligne de secours (BT)';
			this.ligneSecoursNetworkLabel = 'Réseau détecté: BT';
		} else if (network === 'hta') {
			options = [...this.ligneSecoursHtaOptions, ...this.ligneSecoursBrchtOptions];
			this.ligneSecoursFieldLabel = 'Ligne de secours (HTA)';
			this.ligneSecoursNetworkLabel = 'Réseau détecté: HTA';
		} else {
			options = [...this.ligneSecoursHtaOptions, ...this.ligneSecoursBtOptions, ...this.ligneSecoursBrchtOptions];
			this.ligneSecoursFieldLabel = 'Ligne de secours';
			this.ligneSecoursNetworkLabel = '';
		}
		this.ligneSecoursOptions = options;
		if (this.ligneSecoursOptions.length === 0) {
			this.paramLigneSecours = null;
			this.stopSecoursAnimation();
			return;
		}
		const suggested = this.ligneSecoursOptions[0]?.value ?? null;
		if (suggested && (!this.paramLigneSecours || !this.ligneSecoursOptions.some((o) => o.value === this.paramLigneSecours))) {
			this.paramLigneSecours = suggested;
		}
		this.startSecoursAnimation();
	}

	/** Retourne l'id (gid) de la ligne de secours sélectionnée pour les appels API getTrace. */
	private getLigneSecoursId(): string | null {
		const decoded = this.decodeSelectionValue(this.paramLigneSecours);
		return (decoded?.id ?? (this.paramLigneSecours || '').trim()) || null;
	}

	private getLigneSecoursSelectionInfo(): { slug: string; id: string } | null {
		const decoded = this.decodeSelectionValue(this.paramLigneSecours);
		if (!decoded?.slug || !decoded?.id) return null;
		return { slug: decoded.slug, id: decoded.id };
	}

	private getPotentialLigneSecoursCanonSet(): Set<string> {
		const out = new Set<string>();
		if (!this.reelimentationOpen && !this.reelimentationActive && !this.coupureActive) return out;
		for (const o of this.ligneSecoursOptions) {
			const decoded = this.decodeSelectionValue(o.value);
			if (decoded?.slug && decoded?.id) out.add(this.normalizeOuvrageKey(`${decoded.slug}:${decoded.id}`));
		}
		return out;
	}

	/** Retourne le gid (canon) du départ qui alimente l'ouvrage sélectionné (celui qu'on coupe). */
	private getCutDepartureCanon(network: 'hta' | 'bt' | null): string | null {
		if (!network) return null;
		const selectedId = this.getSelectedRefId();
		if (!selectedId) return null;
		const selectedSlug = (this.selectedMapStart?.slug || this.getSlugForCurrentType() || '').toLowerCase();
		const selectedCanon = this.normalizeId(selectedId);
		const row = this.getRowBySlugAndId(selectedSlug, selectedId);

		if (network === 'hta') {
			const dep = this.valueToCanon(row?.['id_depart_hta']);
			if (dep) return dep;
			const fromLine = this.findDepartCanonFromLinePoteau('id_poteau_hta', 'id_depart_hta', 'ligne-hta', selectedCanon);
			if (fromLine) return fromLine;
			if (this.slugDepartHta && selectedSlug === this.slugDepartHta.toLowerCase()) return selectedCanon;
			return this.findDepartByColumnMatch(this.slugDepartHta, ['id_poste_source'], selectedCanon);
		}
		const dep = this.valueToCanon(row?.['id_depart_bt']);
		if (dep) return dep;
		const lineId = this.valueToCanon(row?.['id_ligne_brcht']);
		if (lineId) {
			const lineSlug = this.findFirstSlugByPart('ligne-brcht') ?? this.findFirstSlugByPart('ligne_brcht') ?? this.findFirstSlugByPart('ligne-branchement');
			const lineRow = lineSlug ? this.getRowBySlugAndCanonicalId(lineSlug, lineId) : null;
			const depViaLine = this.valueToCanon(lineRow?.['id_depart_bt']);
			if (depViaLine) return depViaLine;
		}
		const fromLineBt = this.findDepartCanonFromLinePoteau('id_poteau_bt', 'id_depart_bt', 'ligne-bt', selectedCanon);
		if (fromLineBt) return fromLineBt;
		if (this.slugDepartBt && selectedSlug === this.slugDepartBt.toLowerCase()) return selectedCanon;
		return this.findDepartByColumnMatch(
			this.slugDepartBt,
			['id_poste_cabine', 'id_poste_sur_poteau', 'id_transfo_poteau', 'id_transfo_ht_bt'],
			selectedCanon
		);
	}

	/** Trouve un départ à partir d'une table de lignes où un poteau (poteauCanon) est référencé. */
	private findDepartCanonFromLinePoteau(poteauCol: string, departCol: string, lineSlugPart: string, poteauCanon: string): string | null {
		const lineSlug = this.findFirstSlugByPart(lineSlugPart);
		if (!lineSlug) return null;
		const rows = this.rowsBySlug.get(lineSlug) || [];
		for (const r of rows) {
			if (this.valueToCanon(r[poteauCol]) !== poteauCanon) continue;
			const d = this.valueToCanon(r[departCol]);
			if (d) return d;
		}
		return null;
	}

	/** Pour un départ donné, retourne les gid (canon) des autres départs de la même source (même poste/transfo). */
	private getSameSourceDepartureCanons(departCanon: string, network: 'hta' | 'bt'): string[] {
		const slug = network === 'hta' ? this.slugDepartHta : this.slugDepartBt;
		if (!slug) return [];
		const rows = this.rowsBySlug.get(slug) || [];
		const refCols = network === 'hta' ? ['id_poste_source'] : ['id_poste_cabine', 'id_poste_sur_poteau', 'id_transfo_poteau', 'id_transfo_ht_bt'];
		let sourceCanon: string | null = null;
		for (const r of rows) {
			const gid = this.normalizeId(this.extractRowId(r));
			if (gid !== departCanon) continue;
			for (const c of refCols) {
				const v = this.valueToCanon(r[c]);
				if (v) {
					sourceCanon = v;
					break;
				}
			}
			if (sourceCanon) break;
		}
		if (!sourceCanon) return [];
		const same: string[] = [];
		for (const r of rows) {
			for (const c of refCols) {
				if (this.valueToCanon(r[c]) === sourceCanon) {
					const gid = this.normalizeId(this.extractRowId(r));
					if (gid && !same.includes(gid)) same.push(gid);
					break;
				}
			}
		}
		return same;
	}

	/** Plus utilisé : la ligne de secours est choisie manuellement (première de la liste par défaut). */
	private resolveAutoDepartSecoursValue(_network: 'hta' | 'bt' | null): string | null {
		return null;
	}

	private valueToCanon(v: unknown): string {
		if (v == null) return '';
		const s = String(v).trim();
		if (!s) return '';
		return this.normalizeId(s);
	}

	private findOptionValueByCanonicalId(options: { label: string; value: string }[], canonId: string): string | null {
		if (!canonId) return null;
		const found = options.find((o) => this.normalizeId(o.value) === canonId);
		return found?.value ?? null;
	}

	private findFirstSlugByPart(part: string): string | null {
		const p = (part || '').toLowerCase();
		for (const slug of this.rowsBySlug.keys()) {
			if (slug.toLowerCase().includes(p)) return slug;
		}
		return null;
	}

	private extractRowId(row: Record<string, unknown> | null): string {
		if (!row) return '';
		const id = row['gid'] ?? row['id'] ?? row['objectid'] ?? '';
		return String(id ?? '').trim();
	}

	private getRowBySlugAndId(slug: string, id: string): Record<string, unknown> | null {
		if (!slug || !id) return null;
		return this.getRowBySlugAndCanonicalId(slug, this.normalizeId(id));
	}

	private getRowBySlugAndCanonicalId(slug: string, canonId: string): Record<string, unknown> | null {
		const rows = this.rowsBySlug.get(slug) || [];
		for (const r of rows) {
			const rowIdCanon = this.normalizeId(r['gid'] ?? r['id'] ?? r['objectid'] ?? '');
			if (rowIdCanon === canonId) return r;
		}
		return null;
	}

	private findDepartByColumnMatch(slugDepart: string, refCols: string[], targetCanon: string): string | null {
		if (!slugDepart || !targetCanon) return null;
		const rows = this.rowsBySlug.get(slugDepart) || [];
		for (const r of rows) {
			for (const c of refCols) {
				if (this.valueToCanon(r[c]) === targetCanon) {
					const depId = this.extractRowId(r);
					if (depId) return this.normalizeId(depId);
				}
			}
		}
		return null;
	}

	resetSimulationCoupure(): void {
		this.effacerTrace();
	}

	resetSimulationReelimentation(): void {
		this.effacerTrace();
	}

	/** Affiche sur la carte uniquement les ouvrages du tracé (ou tous si liste vide). */
	private applyTraceResult(ouvrageIds: { slug: string; id: string }[], direction: 'amont' | 'aval' | 'tous'): void {
		// Pour l’instant : si le backend renvoie des IDs, on pourrait masquer les couches non concernées ou surligner.
		// Ici on garde l’affichage actuel ; à étendre quand le backend renverra les géométries ou IDs.
		this.traceOuvrageIds = new Set(ouvrageIds.map((o) => `${o.slug}:${o.id}`));
		this.traceOuvrageIdsCanon = new Set(ouvrageIds.map((o) => this.normalizeOuvrageKey(`${o.slug}:${o.id}`)));
		this.lastTraceDirection = direction;
		this.flowDashOffset = 0;
		this.resumeOuvrages = ouvrageIds.length;
		this.resumePoteaux = ouvrageIds.filter((o) => this.isPointSlug(o.slug)).length;
		this.resumeLongueurKm = 0;
		this.buildTraceInsights(ouvrageIds);
		this.traceInsightsOpen = ouvrageIds.length > 0;
		this.applyTraceStyleToMap();
		this.updateTracePointClusters();
		this.startFlowAnimation();
		this.cdr.markForCheck();
	}

	private buildTraceInsights(ouvrageIds: { slug: string; id: string }[]): void {
		const details = ouvrageIds.map((o) => {
			const kind: 'ligne' | 'point' | 'autre' = this.isLineSlug(o.slug) ? 'ligne' : this.isPointSlug(o.slug) ? 'point' : 'autre';
			return { slug: o.slug, id: o.id, kind, color: this.getColorForSlug(o.slug) };
		});
		details.sort((a, b) => (a.slug === b.slug ? a.id.localeCompare(b.id) : a.slug.localeCompare(b.slug)));
		this.traceDetails = details;

		const grouped = new Map<string, { slug: string; count: number; color: string }>();
		for (const d of details) {
			const e = grouped.get(d.slug) ?? { slug: d.slug, count: 0, color: d.color };
			e.count += 1;
			grouped.set(d.slug, e);
		}
		this.traceTypeCounts = Array.from(grouped.values()).sort((a, b) => b.count - a.count);
	}

	private getColorForSlug(slug: string): string {
		const couche = this.couchesReseau.find((c) => c.id === slug);
		if (couche) return couche.color;
		let hash = 0;
		for (let i = 0; i < slug.length; i += 1) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
		return MAP_COLORS[hash % MAP_COLORS.length];
	}

	private isLineSlug(slug: string): boolean {
		return /ligne|electricline/.test((slug || '').toLowerCase());
	}

	private isAbonneSlug(slug: string): boolean {
		return /point-raccord|point_raccord/.test((slug || '').toLowerCase());
	}

	get traceLineCount(): number {
		return this.traceDetails.filter((d) => d.kind === 'ligne').length;
	}

	get tracePointCount(): number {
		return this.traceDetails.filter((d) => d.kind === 'point').length;
	}

	get traceOtherCount(): number {
		return this.traceDetails.filter((d) => d.kind === 'autre').length;
	}

	get traceLinePercent(): number {
		return this.resumeOuvrages > 0 ? Math.round((this.traceLineCount / this.resumeOuvrages) * 100) : 0;
	}

	get tracePointPercent(): number {
		return this.resumeOuvrages > 0 ? Math.round((this.tracePointCount / this.resumeOuvrages) * 100) : 0;
	}

	get traceOtherPercent(): number {
		return this.resumeOuvrages > 0 ? Math.max(0, 100 - this.traceLinePercent - this.tracePointPercent) : 0;
	}

	get maxTraceTypeCount(): number {
		return this.traceTypeCounts.length > 0 ? Math.max(...this.traceTypeCounts.map((x) => x.count)) : 1;
	}

	getTypeBarPercent(count: number): number {
		if (this.maxTraceTypeCount <= 0) return 0;
		return Math.max(6, Math.round((count / this.maxTraceTypeCount) * 100));
	}

	get traceAnalysisLines(): string[] {
		if (this.resumeOuvrages === 0 || !this.lastTraceDirection) return [];
		const mode =
			this.lastTraceDirection === 'amont' ? 'Amont'
				: this.lastTraceDirection === 'aval' ? 'Aval'
					: 'Tous connectés';
		return [`Mode de tracé: ${mode}.`];
	}

	private getTraceUsedLabel(): string {
		const typeLabel =
			this.paramTypePoint === 'poste_source' ? 'Poste source'
				: this.paramTypePoint === 'poste_transformation' ? 'Poste transformation'
					: 'Point de raccordement';
		const selectedLabel = this.getSelectedOptionLabel();
		const directionLabel =
			this.lastTraceDirection === 'amont' ? 'amont'
				: this.lastTraceDirection === 'aval' ? 'aval'
					: 'tous connectés';
		return `${directionLabel} depuis ${typeLabel}${selectedLabel ? ` (${selectedLabel})` : ''}`;
	}

	private getTraceRuleLabel(): string {
		if (this.lastTraceDirection === 'amont') {
			return "parcours directionnel inverse du flux (nœud aval -> nœud amont) sur les identifiants de connectivité.";
		}
		if (this.lastTraceDirection === 'aval') {
			return "parcours directionnel du flux (nœud amont -> nœud aval) sur les identifiants de connectivité.";
		}
		return "parcours de la composante connectée complète (amont + aval) pour récupérer tous les points et lignes reliés.";
	}

	private getTraceNodeMeaningLine(): string {
		return "Correspondance des nœuds: nœud amont = champs id_depart_hta/id_depart_bt (départ HTA ou départ BT, donc source de la ligne) ; nœud aval = champs id_poteau_hta/id_poteau_bt (poteau/ouvrage d'arrivée de la ligne).";
	}

	getSelectedOptionLabel(): string {
		if (this.paramTypePoint === 'poste_source') {
			return this.posteSourceOptions.find((o) => o.value === this.paramPosteSource)?.label ?? '';
		}
		if (this.paramTypePoint === 'poste_transformation') {
			return this.posteTransfoOptions.find((o) => o.value === this.paramPosteTransfo)?.label ?? '';
		}
		return this.abonneOptions.find((o) => o.value === this.paramAbonne)?.label ?? '';
	}

	getCurrentStartLabel(): string {
		if (this.selectedMapStart) return this.selectedMapStart.label;
		return this.getSelectedOptionLabel() || 'Aucun';
	}

	onTraceRowClick(item: { slug: string; id: string }): void {
		this.selectedTraceRowKey = `${item.slug}:${item.id}`;
		this.focusTraceItemOnMap(item.slug, item.id);
	}

	onTopologyValidationRowClick(issue: TopologyValidationIssue): void {
		this.selectedTraceRowKey = `${issue.slug}:${issue.id}`;
		this.focusTraceItemOnMap(issue.slug, issue.id);
		this.cdr.markForCheck();
	}

	/** Libellé court pour la colonne « Problème » (connectivité vs topologie). */
	topologyProblemLabel(t: TopologyValidationIssue['rule_type']): string {
		return t === 'connectivite' ? 'Connectivité' : 'Topologie';
	}

	private getTopologyIssueKey(issue: TopologyValidationIssue): string {
		return `${issue.slug}:${issue.id}:${issue.rule_type}`;
	}

	private normalizeId(v: unknown): string {
		return String(v ?? '').replace(/^\{|\}$/g, '').trim().toLowerCase();
	}

	isTraceRowSelected(item: { slug: string; id: string }): boolean {
		if (!this.selectedTraceRowKey) return false;
		const idx = this.selectedTraceRowKey.indexOf(':');
		if (idx < 0) return false;
		const selSlug = this.selectedTraceRowKey.slice(0, idx);
		const selId = this.selectedTraceRowKey.slice(idx + 1);
		return selSlug.toLowerCase() === item.slug.toLowerCase() && this.normalizeId(selId) === this.normalizeId(item.id);
	}

	private findTraceLayer(slug: string, id: string): {
		getBounds?: () => { getCenter?: () => unknown };
		getLatLng?: () => { lat: number; lng: number };
		setStyle?: (s: object) => void;
		bringToFront?: () => void;
	} | null {
		const idNorm = String(id).replace(/^\{|\}$/g, '');
		const idCanonical = this.normalizeId(id);
		const idNum = Number(id);
		let layer =
			this.slugIdToLayer.get(`${slug}:${id}`) ??
			this.slugIdToLayer.get(`${slug}:${idNorm}`) ??
			this.slugIdToLayer.get(`${slug}:{${idNorm}}`) ??
			this.slugIdToLayer.get(`${slug}:${idNorm.toLowerCase()}`) ??
			(!Number.isNaN(idNum) ? this.slugIdToLayer.get(`${slug}:${idNum}`) : null);
		if (!layer) {
			for (const [key, l] of this.slugIdToLayer) {
				const colon = key.indexOf(':');
				if (colon < 0) continue;
				const keySlug = key.slice(0, colon);
				const keyId = key.slice(colon + 1);
				if (keySlug.toLowerCase() !== slug.toLowerCase()) continue;
				const keyCanonical = this.normalizeId(keyId);
				if (keyCanonical === idCanonical || (keyId === String(idNum) && !Number.isNaN(idNum))) {
					layer = l;
					break;
				}
			}
		}
		return layer ?? null;
	}

	private getLayerCenter(layer: {
		getBounds?: () => { getCenter?: () => unknown };
		getLatLng?: () => { lat: number; lng: number };
	}): [number, number] | null {
		const b = typeof layer.getBounds === 'function' ? layer.getBounds() : null;
		const center =
			b && typeof (b as { getCenter?: () => unknown }).getCenter === 'function'
				? (b as { getCenter: () => unknown }).getCenter()
				: typeof layer.getLatLng === 'function'
					? layer.getLatLng()
					: null;
		if (!center) return null;
		return Array.isArray(center) ? [center[0], center[1]] : [(center as { lat: number }).lat, (center as { lng: number }).lng];
	}

	private updateTracePointClusters(): void {
		this.clearTracePointClusters();
		if (!this.traceClusterLayerGroup) return;
		const pointItems = this.traceDetails.filter((d) => d.kind === 'point');
		if (pointItems.length === 0) return;
		const groups = new Map<string, { lat: number; lng: number; count: number }>();
		for (const item of pointItems) {
			const layer = this.findTraceLayer(item.slug, item.id);
			if (!layer) continue;
			const center = this.getLayerCenter(layer);
			if (!center) continue;
			const lat = Number(center[0].toFixed(6));
			const lng = Number(center[1].toFixed(6));
			const key = `${lat}:${lng}`;
			const g = groups.get(key) ?? { lat, lng, count: 0 };
			g.count += 1;
			groups.set(key, g);
		}
		const overlap = Array.from(groups.values()).filter((g) => g.count > 1);
		if (overlap.length === 0) return;
		import('leaflet').then((LMod) => {
			const L = (LMod as { default: unknown }).default as {
				divIcon: (opts: { className: string; html: string; iconSize: [number, number]; iconAnchor: [number, number] }) => unknown;
				marker: (latlng: [number, number], opts: { icon: unknown }) => unknown;
			};
			for (const g of overlap) {
				const icon = L.divIcon({
					className: 'trace-point-cluster-icon',
					html: `<span>${g.count}</span>`,
					iconSize: [28, 28],
					iconAnchor: [14, 14]
				});
				const m = L.marker([g.lat, g.lng], { icon });
				this.traceClusterLayerGroup!.addLayer(m);
			}
		});
	}

	private applySelectedTraceRowStyle(): void {
		if (!this.selectedTraceRowKey) return;
		const idx = this.selectedTraceRowKey.indexOf(':');
		if (idx < 0) return;
		const slug = this.selectedTraceRowKey.slice(0, idx);
		const id = this.selectedTraceRowKey.slice(idx + 1);
		const layer = this.findTraceLayer(slug, id);
		if (!layer) return;
		if (layer.setStyle) {
			layer.setStyle({
				color: '#f59e0b',
				weight: 8,
				opacity: 1,
				fillColor: '#f59e0b',
				fillOpacity: 0.85
			});
		}
		if (layer.bringToFront) layer.bringToFront();
	}

	private focusTraceItemOnMap(slug: string, id: string): void {
		const layer = this.findTraceLayer(slug, id);
		if (!layer || !this.map) return;
		// Reposer d'abord le style global du tracé, puis renforcer la sélection courante.
		this.applyTraceStyleToMap();
		this.applySelectedTraceRowStyle();
		const b = typeof layer.getBounds === 'function' ? layer.getBounds() : null;
		const center =
			b && typeof (b as { getCenter?: () => unknown }).getCenter === 'function'
				? (b as { getCenter: () => unknown }).getCenter()
				: typeof layer.getLatLng === 'function'
					? layer.getLatLng()
					: null;
		if (!center) return;
		const latLng = Array.isArray(center) ? center : [(center as { lat: number }).lat, (center as { lng: number }).lng];
		const m = this.map as {
			fitBounds?: (b: unknown, o?: object) => void;
			setView?: (center: [number, number] | unknown, zoom?: number, opts?: object) => void;
		};
		if (m?.fitBounds && b) m.fitBounds(b, { padding: [80, 80], maxZoom: 22 });
		else if (m?.setView) m.setView(latLng, 20, { animate: true });
		this.stopBlink();
		import('leaflet').then((LMod) => {
			const L = (LMod as { default: unknown }).default as {
				circleMarker: (latlng: unknown, opts: object) => { setStyle: (s: object) => void; setRadius: (n: number) => void; bringToFront: () => void };
			};
			if (!this.highlightLayerGroup) return;
			const marker = L.circleMarker(latLng, {
				radius: 24,
				color: '#f59e0b',
				weight: 4,
				fillColor: '#f59e0b',
				fillOpacity: 0.45
			});
			this.highlightLayerGroup.addLayer(marker);
			marker.bringToFront();
			this.blinkCircle = marker;
			let radius = 24;
			let growing = true;
			this.blinkInterval = setInterval(() => {
				if (!this.blinkCircle) return;
				radius = growing ? radius + 3 : radius - 3;
				if (radius >= 34) growing = false;
				if (radius <= 16) growing = true;
				marker.setRadius(radius);
				marker.setStyle({ fillOpacity: growing ? 0.55 : 0.25, weight: growing ? 5 : 2 });
			}, 150);
			setTimeout(() => this.stopBlink(), 3200);
		});
	}

	private isPointSlug(slug: string): boolean {
		const s = slug.toLowerCase();
		return /poteau|pole|transfo|poste|abonne|branchement|noeud|junction/.test(s) && !/ligne|electricline/.test(s);
	}

	private applyTraceStyleToMap(): void {
		const hasTrace = this.traceOuvrageIds.size > 0;
		const layerFlags = new Map<unknown, boolean>();
		const layerSlug = new Map<unknown, string>();
		const layerCanonKeys = new Map<unknown, Set<string>>();
		const ligneSecours = this.getLigneSecoursSelectionInfo();
		const ligneSecoursCanon = ligneSecours ? this.normalizeOuvrageKey(`${ligneSecours.slug}:${ligneSecours.id}`) : '';
		const potentielSecoursCanon = this.getPotentialLigneSecoursCanonSet();
		this.slugIdToLayer.forEach((layer, key) => {
			if (!layerFlags.has(layer)) layerFlags.set(layer, false);
			if (!layerSlug.has(layer)) layerSlug.set(layer, this.getSlugFromLayerKey(key));
			const canon = this.normalizeOuvrageKey(key);
			let s = layerCanonKeys.get(layer);
			if (!s) {
				s = new Set<string>();
				layerCanonKeys.set(layer, s);
			}
			s.add(canon);
			if (hasTrace && (this.traceOuvrageIds.has(key) || this.traceOuvrageIdsCanon.has(canon))) {
				layerFlags.set(layer, true);
			}
		});
		const layerHasCanon = (layer: unknown, canon: string): boolean => {
			if (!canon) return false;
			const s = layerCanonKeys.get(layer);
			return !!s && s.has(canon);
		};
		const layerInCanonSet = (layer: unknown, canonSet: Set<string>): boolean => {
			if (!canonSet || canonSet.size === 0) return false;
			const s = layerCanonKeys.get(layer);
			if (!s || s.size === 0) return false;
			for (const k of s) {
				if (canonSet.has(k)) return true;
			}
			return false;
		};
		layerFlags.forEach((isHighlighted, layer) => {
			const setStyle = (layer as { setStyle?: (s: object) => void }).setStyle;
			if (!setStyle) return;
			const slug = layerSlug.get(layer) ?? '';
			const isLine = this.isLineSlug(slug);
			const isPoint = this.isPointSlug(slug);
			const baseColor = this.getColorForSlug(slug);
			const isLigneSecours = layerHasCanon(layer, ligneSecoursCanon);
			const isLigneSecoursPotentiel = layerInCanonSet(layer, potentielSecoursCanon);
			const isTopologyViolation = layerInCanonSet(layer, this.topologyViolationCanon);
			// En mode coupure : lignes pouvant alimenter la zone coupée (tracé depuis le départ de secours)
			const isSupplyLine = this.coupureActive && this.coupureSupplyOuvrageIdsCanon.size > 0 && layerInCanonSet(layer, this.coupureSupplyOuvrageIdsCanon);
			const normal: Record<string, unknown> = {
				color: baseColor,
				fillColor: baseColor,
				opacity: 0.95,
				fillOpacity: 0.5,
				weight: isLine ? 5 : 3,
				dashArray: null,
				dashOffset: null
			};
			if (isTopologyViolation) {
				setStyle.call(layer, {
					color: '#dc2626',
					fillColor: '#dc2626',
					opacity: 1,
					fillOpacity: 0.9,
					weight: isLine ? 8 : 6,
					dashArray: isLine ? '10 6' : null,
					dashOffset: null
				});
				return;
			}
			if (isSupplyLine) {
				setStyle.call(layer, {
					color: '#2563eb',
					fillColor: '#2563eb',
					opacity: 1,
					fillOpacity: 0.85,
					weight: isLine ? 7 : 5,
					dashArray: isLine ? '12 8' : null,
					dashOffset: null
				});
				return;
			}
			if (!hasTrace || !isHighlighted) {
				if (isLigneSecours) {
					setStyle.call(layer, {
						color: '#2563eb',
						fillColor: '#2563eb',
						opacity: 1,
						fillOpacity: this.secoursPulsePhase ? 0.95 : 0.5,
						weight: isLine ? (this.secoursPulsePhase ? 9 : 6) : (this.secoursPulsePhase ? 8 : 5),
						dashArray: isLine ? (this.secoursPulsePhase ? '18 8' : '10 8') : null,
						dashOffset: null
					});
					return;
				}
				if (isLigneSecoursPotentiel) {
					setStyle.call(layer, {
						color: '#06b6d4',
						fillColor: '#06b6d4',
						opacity: 0.95,
						fillOpacity: 0.55,
						weight: isLine ? 7 : 5,
						dashArray: isLine ? '8 8' : null,
						dashOffset: null
					});
					return;
				}
				setStyle.call(layer, normal);
				return;
			}
			if (this.reelimentationActive) {
				const inCut = isHighlighted || layerInCanonSet(layer, this.reelimentationCutSetCanon);
				const inSupply = layerInCanonSet(layer, this.reelimentationSupplySetCanon);
				if (inSupply) {
					setStyle.call(layer, {
						color: '#2563eb',
						fillColor: '#2563eb',
						opacity: 1,
						fillOpacity: 0.9,
						weight: isLine ? 8 : 6,
						dashArray: null,
						dashOffset: null
					});
					return;
				}
				// Zone coupée réalimentée : plus en noir, affichée en vert (alimentée)
				if (inCut) {
					setStyle.call(layer, {
						color: '#16a34a',
						fillColor: '#16a34a',
						opacity: 1,
						fillOpacity: 0.85,
						weight: isLine ? 7 : 5,
						dashArray: null,
						dashOffset: null
					});
					return;
				}
				setStyle.call(layer, normal);
				return;
			}
			if (this.coupureActive) {
				const coupureStyle: Record<string, unknown> = {
					color: '#111111',
					fillColor: '#111111',
					opacity: 1,
					fillOpacity: 0.85,
					weight: isLine ? 7 : 5,
					dashArray: null,
					dashOffset: null
				};
				setStyle.call(layer, coupureStyle);
				return;
			}
			const highlight: Record<string, unknown> = { opacity: 1, fillOpacity: 0.7, weight: 6 };
			if (isLine && this.lastTraceDirection) {
				highlight['color'] = '#fde047';
				highlight['fillColor'] = '#fde047';
				highlight['weight'] = 7;
				highlight['dashArray'] = '14 10';
				highlight['dashOffset'] = String(this.flowDashOffset);
			} else if (isPoint) {
				// Pulsation des points impactés pour visualiser les nœuds du tracé.
				highlight['color'] = baseColor;
				highlight['fillColor'] = baseColor;
				highlight['dashArray'] = null;
				highlight['weight'] = this.pointPulsePhase ? 7 : 4;
				highlight['fillOpacity'] = this.pointPulsePhase ? 0.95 : 0.45;
				highlight['opacity'] = 1;
			} else {
				highlight['dashArray'] = null;
			}
			setStyle.call(layer, highlight);
		});
		this.applySelectedTraceRowStyle();
	}

	private getSlugFromLayerKey(key: string): string {
		const idx = key.indexOf(':');
		return idx >= 0 ? key.slice(0, idx) : key;
	}

	private normalizeOuvrageKey(key: string): string {
		const idx = key.indexOf(':');
		if (idx < 0) return key.toLowerCase();
		const slug = key.slice(0, idx).toLowerCase();
		const id = key.slice(idx + 1).replace(/^\{|\}$/g, '').trim().toLowerCase();
		return `${slug}:${id}`;
	}

	private layerBelongsToSet(layer: unknown, keySet: Set<string>, keySetCanon: Set<string>): boolean {
		for (const [k, l] of this.slugIdToLayer) {
			if (l !== layer) continue;
			if (keySet.has(k)) return true;
			if (keySetCanon.has(this.normalizeOuvrageKey(k))) return true;
		}
		return false;
	}

	private layerMatchesOuvrage(layer: unknown, slug: string, id: string): boolean {
		const targetSlug = (slug || '').toLowerCase();
		const targetId = this.normalizeId(id);
		if (!targetSlug || !targetId) return false;
		for (const [k, l] of this.slugIdToLayer) {
			if (l !== layer) continue;
			const idx = k.indexOf(':');
			if (idx < 0) continue;
			const keySlug = k.slice(0, idx).toLowerCase();
			const keyId = this.normalizeId(k.slice(idx + 1));
			if (keySlug === targetSlug && keyId === targetId) return true;
		}
		return false;
	}

	private startFlowAnimation(): void {
		this.stopFlowAnimation();
		if (this.traceOuvrageIds.size === 0) return;
		this.flowAnimationInterval = setInterval(() => {
			if (this.lastTraceDirection === 'amont' || this.lastTraceDirection === 'aval') {
				const step = this.lastTraceDirection === 'aval' ? -3 : 3;
				this.flowDashOffset += step;
			}
			this.pointPulsePhase = !this.pointPulsePhase;
			this.applyTraceStyleToMap();
		}, 140);
	}

	private startSecoursAnimation(): void {
		this.stopSecoursAnimation();
		const ligneSecours = this.getLigneSecoursSelectionInfo();
		if (!ligneSecours) {
			this.applyTraceStyleToMap();
			return;
		}
		// Éviter de restyler toute la carte en boucle si le panneau n'est pas utilisé.
		if (!this.reelimentationOpen && !this.reelimentationActive) {
			this.applyTraceStyleToMap();
			return;
		}
		this.secoursAnimationInterval = setInterval(() => {
			this.secoursPulsePhase = !this.secoursPulsePhase;
			this.applyTraceStyleToMap();
		}, 420);
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
		this.traceOuvrageIdsCanon = new Set();
		this.resumeOuvrages = 0;
		this.resumePoteaux = 0;
		this.resumeLongueurKm = 0;
		this.lastTraceDirection = null;
		this.traceInsightsOpen = false;
		this.traceDetails = [];
		this.traceTypeCounts = [];
		this.selectedTraceRowKey = null;
		this.flowDashOffset = 0;
		this.pointPulsePhase = false;
		this.stopFlowAnimation();
		this.stopSecoursAnimation();
		this.clearTracePointClusters();
		this.resetCoupureState();
		this.resetReelimentationState();
		this.applyTraceStyleToMap();
		this.cdr.markForCheck();
	}

	/** Charge le tracé du départ de secours sélectionné pour mettre en évidence les lignes pouvant alimenter la zone coupée. */
	private loadCoupureSupplyTrace(): void {
		this.coupureSupplyOuvrageIdsCanon = new Set();
		if (!this.coupureActive) return;
		const ligneSecoursId = this.getLigneSecoursId();
		if (!ligneSecoursId) {
			this.applyTraceStyleToMap();
			this.cdr.markForCheck();
			return;
		}
		this.gisApi.getTrace('ouvrage', ligneSecoursId, 'tous').pipe(
			catchError(() => of({ ouvrage_ids: [] }))
		).subscribe({
			next: (res) => {
				const ids = res.ouvrage_ids || [];
				const canon = new Set<string>();
				for (const o of ids) {
					canon.add(this.normalizeOuvrageKey(`${o.slug}:${o.id}`));
				}
				this.coupureSupplyOuvrageIdsCanon = canon;
				this.applyTraceStyleToMap();
				this.cdr.markForCheck();
			},
			error: () => {
				this.applyTraceStyleToMap();
				this.cdr.markForCheck();
			}
		});
	}

	private applyCoupureResult(ouvrageIds: { slug: string; id: string }[]): void {
		this.coupureActive = true;
		this.coupureStartLabel = this.getCurrentStartLabel();
		this.coupureStartType = this.selectedMapStart ? 'ouvrage carte' : this.paramTypePoint;
		this.coupureCauseLabel = this._coupureCauseEnCours || 'Non renseignée';
		this._coupureCauseEnCours = '';
		this.coupureImpactedLignes = ouvrageIds.filter((o) => this.isLineSlug(o.slug)).length;
		this.coupureImpactedPoints = ouvrageIds.filter((o) => this.isPointSlug(o.slug)).length;
		this.coupureImpactedAbonnes = ouvrageIds.filter((o) => this.isAbonneSlug(o.slug)).length;
		this.coupureExecutedAt = new Date().toLocaleString('fr-FR');
		this.stopFlowAnimation();
		this.loadCoupureSupplyTrace();
		this.applyTraceStyleToMap();
	}

	private resetCoupureState(): void {
		this.coupureActive = false;
		this.coupureStartLabel = '';
		this.coupureStartType = '';
		this.coupureCauseLabel = '';
		this.coupureImpactedAbonnes = 0;
		this.coupureImpactedLignes = 0;
		this.coupureImpactedPoints = 0;
		this.coupureExecutedAt = '';
		this.coupureSupplyOuvrageIdsCanon = new Set();
		this.showCoupureCauseModal = false;
		this.coupureCauseSelected = null;
	}

	private resetReelimentationState(): void {
		this.reelimentationActive = false;
		this.reelimentationImpacted = 0;
		this.reelimentationBypass = 0;
		this.reelimentationImpossible = 0;
		this.reelimentationExecutedAt = '';
		this.reelimentationCutSet = new Set();
		this.reelimentationSupplySet = new Set();
		this.reelimentationCutSetCanon = new Set();
		this.reelimentationSupplySetCanon = new Set();
	}

	/** Ordre d’étage du flux pour le schéma unifilaire (1 = amont, 5 = aval). */
	private getUnifilaireStageOrder(slug: string): number {
		const s = (slug || '').toLowerCase();
		if (s.includes('poste-source') || s.includes('limite-poste') || s.includes('arrivee')) return 1;
		if (s.includes('ligne') && (s.includes('hta') || s.includes('ht'))) return 2;
		if (s.includes('poteau') || s.includes('cellule') || s.includes('transformateur') || s.includes('transfo') || s.includes('parafoudre') || s.includes('poste-cabine') || s.includes('depart') && !s.includes('bt')) return 3;
		if (s.includes('ligne') && (s.includes('bt') || s.includes('brcht'))) return 4;
		if (s.includes('abonne') || s.includes('raccordement') || s.includes('branchement') || s.includes('compteur')) return 5;
		return 3;
	}

	/** Libellé court d’un slug pour le schéma unifilaire. */
	getUnifilaireLabel(slug: string): string {
		const labels: Record<string, string> = {
			'poste-source': 'Poste source',
			'limite-poste-sourc': 'Poste source',
			arrivee: 'Arrivée HT',
			'ligne-hta-aerien': 'Ligne HTA',
			'ligne-hta-souter': 'Ligne HTA',
			'ligne-hta': 'Ligne HTA',
			'depart-bt': 'Départ BT',
			depart: 'Départ MT',
			'poteau-hta': 'Poteau HTA',
			'poteau-bt': 'Poteau BT',
			'transformateur-ps': 'Transfo puissance',
			'transfo-ht-bt': 'Transfo MT/BT',
			cellule: 'Cellule',
			parafoudre: 'Parafoudre',
			'poste-cabine': 'Poste cabine',
			'ligne-brcht': 'Ligne branchement',
			'ligne-bt': 'Ligne BT',
			'point-raccordement': 'Point raccordement',
			branchement: 'Branchement',
			abonne: 'Abonné',
			compteur: 'Compteur'
		};
		const lower = (slug || '').toLowerCase();
		const entries = Object.entries(labels).sort((a, b) => b[0].length - a[0].length);
		for (const [key, label] of entries) {
			if (lower === key || lower.includes(key)) return label;
		}
		return slug || 'Ouvrage';
	}

	/** Construit les sections du schéma unifilaire à partir du tracé courant. */
	buildUnifilaireSections(): void {
		const stageLabels: Record<number, string> = {
			1: 'Source / Arrivée HT',
			2: 'Lignes HTA',
			3: 'Ouvrages MT (poteaux, cellules, transfo)',
			4: 'Lignes BT',
			5: 'Raccordements / Abonnés'
		};
		const byStage = new Map<number, { slug: string; label: string; count: number; color: string }[]>();
		for (const t of this.traceTypeCounts) {
			const order = this.getUnifilaireStageOrder(t.slug);
			const list = byStage.get(order) ?? [];
			list.push({
				slug: t.slug,
				label: this.getUnifilaireLabel(t.slug),
				count: t.count,
				color: t.color
			});
			byStage.set(order, list);
		}
		const orders = Array.from(byStage.keys()).sort((a, b) => a - b);
		this.unifilaireSections = orders.map((order) => ({
			stageLabel: stageLabels[order] ?? 'Autres',
			order,
			items: byStage.get(order) ?? []
		}));
		this.unifilairePlantUmlCode = this.buildUnifilairePlantUmlCode();
	}

	/**
	 * Génère le code PlantUML pour le même schéma unifilaire (poste source).
	 * À coller dans un outil PlantUML (pas Mermaid). Syntaxe activité, orientation haut vers bas.
	 */
	buildUnifilairePlantUmlCode(): string {
		return `@startuml
' Schéma unifilaire — Poste source (transport / distribution)
' Orientation : haut vers bas (Top-Down). Sans blocs/partitions.
title Schéma unifilaire - Poste source

skinparam backgroundColor #FFFFFF
skinparam defaultFontSize 10

start
:Ligne d'arrivée HT 1 (90 kV);
:Ligne d'arrivée HT 2 (90 kV);
:Sectionneur IS - Arrivée 1;
:Sectionneur IS - Arrivée 2;
:Parafoudre(s) - Protection surtension;
:JEU_A 90 kV;
:JEU_B 90 kV;
:Transfo 1 - 90 kV / 33 kV;
:Transfo 2 - 90 kV / 33 kV;
:JEU_MT 33 kV;
:Disjoncteur DM1 - Départ 1;
:Disjoncteur DM2 - Départ 2;
:Disjoncteur DM3 - Départ 3;
:Sectionneur IS - Départ 1;
:Sectionneur IS - Départ 2;
:TC/TT Mesure QM - Départ 1;
:TC/TT Mesure QM - Départ 2;
:Départ MT 1 - Ligne HTA;
:Départ MT 2 - Ligne HTA;
:Départ MT 3 - Ligne HTA;
:SCADA / Contrôle-commande (RTU, IED, HMI);
:Réseau mise à la terre;
:Alimentation secourue (Batterie 110 V DC, chargeur, UPS);

stop
@enduml`;
	}

	/** Ouvre la modale du schéma unifilaire (représentation simplifiée du flux d'énergie). */
	openUnifilaireModal(): void {
		this.buildUnifilaireSections();
		this.showUnifilaireModal = true;
		this.cdr.markForCheck();
	}

	/** Ferme la modale du schéma unifilaire. */
	closeUnifilaireModal(): void {
		this.showUnifilaireModal = false;
		this.unifilaireDiagramError = null;
		this.unifilaireSvgContent = null;
		this.cdr.markForCheck();
	}

	/** Appelé quand la modale schéma unifilaire est affichée : charge le schéma PowSyBL (SVG depuis le backend). */
	onUnifilaireDialogShow(): void {
		this.unifilaireDiagramError = null;
		this.unifilaireSvgContent = null;
		setTimeout(() => this.loadUnifilairePowSyBL(), 80);
	}

	/** Charge et affiche le schéma unifilaire PowSyBL (SVG généré par le backend à partir du tracé). */
	loadUnifilairePowSyBL(): void {
		const ouvrageIds = this.traceDetails.map((d) => ({ slug: d.slug, id: d.id }));
		if (ouvrageIds.length === 0) {
			this.unifilaireDiagramError = 'Effectuez d\'abord un tracé (Amont, Aval ou Tous connectés) pour générer le schéma.';
			this.unifilaireSvgContent = null;
			this.cdr.markForCheck();
			return;
		}
		this.unifilaireDiagramError = null;
		this.unifilaireSvgContent = null;
		this.gisApi
			.getUnifilaireSvg(ouvrageIds)
			.pipe(
				catchError((err) => {
					const msg = err?.error ?? err?.message ?? String(err);
					this.unifilaireDiagramError = 'Impossible de charger le schéma : ' + msg;
					this.unifilaireSvgContent = null;
					this.cdr.markForCheck();
					return of('');
				})
			)
			.subscribe((svg) => {
				if (svg) {
					this.unifilaireSvgContent = svg;
					this.unifilaireDiagramError = null;
				}
				this.cdr.markForCheck();
			});
	}

	/** Copie le code PlantUML du schéma unifilaire dans le presse-papiers. */
	async copyUnifilairePlantUmlToClipboard(): Promise<void> {
		if (!this.unifilairePlantUmlCode) return;
		try {
			await navigator.clipboard.writeText(this.unifilairePlantUmlCode);
		} catch {
			const ta = document.createElement('textarea');
			ta.value = this.unifilairePlantUmlCode;
			ta.setAttribute('readonly', '');
			ta.style.position = 'fixed';
			ta.style.opacity = '0';
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
		}
	}

	/** Exporte le schéma unifilaire en PDF (téléchargement). */
	exportUnifilairePdf(): void {
		const ouvrageIds = this.traceDetails.map((d) => ({ slug: d.slug, id: d.id }));
		if (ouvrageIds.length === 0) {
			this.unifilaireDiagramError = 'Effectuez d\'abord un tracé pour exporter le schéma en PDF.';
			this.cdr.markForCheck();
			return;
		}
		this.gisApi
			.getUnifilairePdf(ouvrageIds)
			.pipe(
				catchError((err) => {
					const msg = err?.error?.message ?? err?.message ?? 'Erreur lors de l\'export PDF.';
					this.unifilaireDiagramError = msg;
					this.cdr.markForCheck();
					return of(null);
				})
			)
			.subscribe((blob) => {
				if (!blob || blob.size === 0) {
					this.unifilaireDiagramError = this.unifilaireDiagramError ?? 'Impossible de générer le PDF.';
					this.cdr.markForCheck();
					return;
				}
				this.unifilaireDiagramError = null;
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'schema-unifilaire.pdf';
				a.click();
				URL.revokeObjectURL(url);
				this.cdr.markForCheck();
			});
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
			m.fitBounds(this.initialBounds, { padding: [40, 40], maxZoom: 22 });
		}
	}

	undo(): void {}
	redo(): void {}

	/** Anomalies du dernier contrôle des règles pour cet ouvrage (popup carte). */
	getValidationIssuesForPopup(slug: string, id: string): TopologyValidationIssue[] {
		const issues = this.topologyValidationResult?.issues;
		if (!issues?.length || !slug || !id) return [];
		const idCanon = this.normalizeId(id);
		return issues.filter(
			(iss) => iss.slug.toLowerCase() === slug.toLowerCase() && this.normalizeId(iss.id) === idCanon
		);
	}

	buildPopupContent(props: Record<string, unknown>): string {
		if (!props || typeof props !== 'object') return '';
		const { _layerLabel, _layerSlug, geom, Geom, ...rest } = props;
		const title = _layerLabel != null ? String(_layerLabel) : '';
		const rawEntries = Object.entries(rest)
			.map(([k, v]) => ({
				key: k,
				label: this.formatPopupKey(k),
				val: this.formatPopupValue(v)
			}));
		const ordered = this.orderPopupEntries(rawEntries);
		const slug = _layerSlug != null ? String(_layerSlug) : '';
		const id = String(props['gid'] ?? props['id'] ?? props['objectid'] ?? '').trim();
		const idKey = props['gid'] != null ? 'gid' : props['id'] != null ? 'id' : 'objectid';
		let html = '<div class="map-popup">';
		if (title) html += `<div class="map-popup-header"><i class="fa fa-info-circle map-popup-icon"></i><span>${this.escapeHtml(title)}</span></div>`;
		html += '<div class="map-popup-body">';
		ordered.forEach((e, i) => {
			html += `<div class="map-popup-row ${i % 2 === 0 ? 'map-popup-row--even' : ''}"><span class="map-popup-key">${this.escapeHtml(e.label)}</span><span class="map-popup-val">${this.escapeHtml(e.val)}</span></div>`;
		});
		html += '</div>';
		if (slug && id) {
			const popupIssues = this.getValidationIssuesForPopup(slug, id);
			if (popupIssues.length) {
				const byRule = new Map<'connectivite' | 'topologie', TopologyValidationIssue[]>();
				for (const iss of popupIssues) {
					const list = byRule.get(iss.rule_type) ?? [];
					list.push(iss);
					byRule.set(iss.rule_type, list);
				}
				html += '<div class="map-popup-validation">';
				html += '<div class="map-popup-validation-title"><i class="fa fa-shield"></i> À corriger</div>';
				for (const [ruleType, list] of byRule) {
					const first = list[0];
					const reasons = list.map((i) => i.reason).filter(Boolean);
					const reasonsText = reasons.length ? reasons.join(' · ') : '';
					const suggestion = list.map((i) => i.suggestion).find((s) => s != null && String(s).trim() !== '');
					html += '<div class="map-popup-validation-item">';
					html += `<div class="map-popup-validation-type">${this.escapeHtml(this.topologyProblemLabel(ruleType))}</div>`;
					if (reasonsText) {
						html += `<div class="map-popup-validation-reason">${this.escapeHtml(reasonsText)}</div>`;
					}
					if (suggestion) {
						html += `<div class="map-popup-validation-suggestion"><span>Suggestion</span> ${this.escapeHtml(String(suggestion))}</div>`;
					}
					if (this.canAutoCorrectIssue(first)) {
						html += `<button type="button" class="map-popup-btn map-popup-btn--fix" data-slug="${this.escapeHtml(slug)}" data-id="${this.escapeHtml(id)}" data-rule-type="${this.escapeHtml(ruleType)}"><i class="fa fa-magic"></i> Corriger</button>`;
					}
					html += '</div>';
				}
				html += '</div>';
			}
			html += '<div class="map-popup-actions">';
			html += `<button type="button" class="map-popup-btn map-popup-btn--trace-amont" data-slug="${this.escapeHtml(slug)}" data-id="${this.escapeHtml(id)}" data-id-key="${this.escapeHtml(idKey)}" data-label="${this.escapeHtml(title || slug)}"><i class="fa fa-arrow-up"></i> Tracé amont</button>`;
			html += `<button type="button" class="map-popup-btn map-popup-btn--trace-aval" data-slug="${this.escapeHtml(slug)}" data-id="${this.escapeHtml(id)}" data-id-key="${this.escapeHtml(idKey)}" data-label="${this.escapeHtml(title || slug)}"><i class="fa fa-arrow-down"></i> Tracé aval</button>`;
			html += `<button type="button" class="map-popup-btn map-popup-btn--trace-all" data-slug="${this.escapeHtml(slug)}" data-id="${this.escapeHtml(id)}" data-id-key="${this.escapeHtml(idKey)}" data-label="${this.escapeHtml(title || slug)}"><i class="fa fa-sitemap"></i> Tous connectés</button>`;
			html += `<button type="button" class="map-popup-btn map-popup-btn--outage" data-slug="${this.escapeHtml(slug)}" data-id="${this.escapeHtml(id)}" data-id-key="${this.escapeHtml(idKey)}" data-label="${this.escapeHtml(title || slug)}"><i class="fa fa-power-off"></i> Simuler coupure</button>`;
			html += '</div>';
		}
		html += '</div>';
		return html;
	}

	private formatPopupValue(value: unknown): string {
		if (value == null) return '-';
		if (value === '') return '-';
		if (typeof value === 'object') {
			if ((value as { toISOString?: () => string }).toISOString) {
				return (value as { toISOString: () => string }).toISOString();
			}
			try {
				return JSON.stringify(value);
			} catch {
				return String(value);
			}
		}
		return String(value);
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
				zoomControl: false,
				maxZoom: 22
			});
			const mapWithPanes = this.map as {
				createPane?: (name: string) => { style?: { zIndex?: string } };
				getPane?: (name: string) => { style?: { zIndex?: string } } | undefined;
			};
			mapWithPanes.createPane?.('trace-polygons');
			mapWithPanes.createPane?.('trace-lines');
			mapWithPanes.createPane?.('trace-points');
			const polyPane = mapWithPanes.getPane?.('trace-polygons');
			const linePane = mapWithPanes.getPane?.('trace-lines');
			const pointPane = mapWithPanes.getPane?.('trace-points');
			// Ordre (bas → haut): polygones < points < lignes pour que lignes et points soient cliquables
			if (polyPane?.style) {
				polyPane.style.zIndex = '380';
			}
			if (pointPane?.style) {
				pointPane.style.zIndex = '520';
			}
			if (linePane?.style) {
				linePane.style.zIndex = '560';
			}
			Lx.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '© OpenStreetMap contributors'
			}).addTo(this.map);
			Lx.control.zoom({ position: 'topleft' }).addTo(this.map);
			this.layerGroup = Lx.layerGroup().addTo(this.map) as { addLayer: (l: unknown) => void; removeLayer: (l: unknown) => void };
			this.highlightLayerGroup = Lx.layerGroup().addTo(this.map) as { addLayer: (l: unknown) => void; clearLayers: () => void };
			this.traceClusterLayerGroup = Lx.layerGroup().addTo(this.map) as { addLayer: (l: unknown) => void; clearLayers: () => void };
			this.popupButtonsClickListener = (e: Event): void => {
				const fixTarget = (e.target as HTMLElement).closest?.('.map-popup-btn--fix');
				if (fixTarget && fixTarget instanceof HTMLElement) {
					const slug = fixTarget.getAttribute('data-slug') ?? '';
					const id = fixTarget.getAttribute('data-id') ?? '';
					const rt = fixTarget.getAttribute('data-rule-type') as 'connectivite' | 'topologie';
					if (!slug || !id || (rt !== 'connectivite' && rt !== 'topologie')) return;
					const issue =
						this.getValidationIssuesForPopup(slug, id).find((i) => i.rule_type === rt) ?? {
							slug,
							id,
							rule_type: rt,
							reason: '',
							severity: 'warning' as const
						};
					this.corrigerIssueTopologie(issue, undefined);
					return;
				}
				const traceTarget = (e.target as HTMLElement).closest?.('.map-popup-btn--trace-amont, .map-popup-btn--trace-aval, .map-popup-btn--trace-all, .map-popup-btn--outage');
				if (traceTarget && traceTarget instanceof HTMLElement) {
					const slug = traceTarget.getAttribute('data-slug') ?? '';
					const id = traceTarget.getAttribute('data-id') ?? '';
					const label = traceTarget.getAttribute('data-label') ?? '';
					if (!slug || !id) return;
					if (traceTarget.classList.contains('map-popup-btn--outage')) {
						this.simulateCoupureFromMapSelection(slug, id, label);
						return;
					}
					const direction: 'amont' | 'aval' | 'tous' =
						traceTarget.classList.contains('map-popup-btn--trace-amont') ? 'amont'
							: traceTarget.classList.contains('map-popup-btn--trace-aval') ? 'aval'
								: 'tous';
					this.traceFromMapSelection(slug, id, label, direction);
					return;
				}
			};
			this.mapContainer.nativeElement.addEventListener('click', this.popupButtonsClickListener);
			setTimeout(() => {
				void this.loadGeometries();
			}, 150);
		});
	}

	private loadGeometries(): Promise<void> {
		if (!this.map || !this.layerGroup || !this.gisApi) return Promise.resolve();
		this.mapLoading = true;
		return new Promise((resolve) => {
		this.gisApi.getTables().pipe(
			switchMap((tables) => {
				if (tables.length === 0) return of([]);
				return forkJoin(
					tables.map((t, i) =>
						// Charger un volume plus large pour éviter que des ouvrages du tracé
						// (ex. poteaux) ne soient absents de la carte à cause de la pagination.
						this.gisApi.getList(t.slug, 2000, 0).pipe(
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
					const isLineTable = (s: string): boolean => /ligne|electricline/.test((s || '').toLowerCase());
					const detectGeometryRank = (rows: Record<string, unknown>[]): number => {
						for (const row of rows || []) {
							const raw = row['geom'] ?? row['Geom'];
							if (typeof raw !== 'string') continue;
							const w = raw.replace(/^SRID=\d+;/i, '').trim().toUpperCase();
							if (!w) continue;
							if (w.startsWith('POLYGON') || w.startsWith('MULTIPOLYGON')) return 0; // fond
							if (w.startsWith('POINT') || w.startsWith('MULTIPOINT')) return 1; // au-dessus des polygones
							if (w.startsWith('LINESTRING') || w.startsWith('MULTILINESTRING')) return 2; // au-dessus de tout
						}
						return 1;
					};
					const sortedResults = [...(results as { slug: string; table: string; rows: Record<string, unknown>[]; color: string; label: string }[])].sort(
						(a, b) => detectGeometryRank(a.rows) - detectGeometryRank(b.rows)
					);
					const self = this;
					self.slugIdToLayer.clear();
					self.rowsBySlug.clear();
					const couches: { id: string; label: string; color: string; visible: boolean }[] = [];
					for (const { slug, table, rows, color, label } of sortedResults) {
						self.rowsBySlug.set(slug, rows || []);
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
						const geometryRank = detectGeometryRank(rows);
						const paneName = geometryRank === 0 ? 'trace-polygons' : geometryRank === 2 ? 'trace-lines' : 'trace-points';
						const style = { color, weight: isLine ? 8 : 2, opacity: 0.9, fillColor: color, fillOpacity: 0.5 };
						const styleWithPane = { ...style, pane: paneName };
						const slugGroup = (leaflet as { layerGroup?: () => { addLayer: (l: unknown) => void } }).layerGroup?.();
						if (!slugGroup) continue;
						const fc = { type: 'FeatureCollection' as const, features };
						const geoJsonLayer = leaflet.geoJSON(fc, {
							pane: paneName,
							style: () => styleWithPane,
							pointToLayer: (_: unknown, latlng: unknown) => leaflet.circleMarker(latlng, {
								...styleWithPane,
								radius: 14,
								weight: 3,
								interactive: true
							}),
							onEachFeature: (
								feature: { properties?: Record<string, unknown> },
								layer: {
									bindPopup: (content: string, opts?: { maxWidth?: number }) => void;
									setPopupContent: (content: string) => void;
									feature?: unknown;
									on?: (event: string, handler: () => void) => void;
								}
							) => {
								(layer as { feature?: unknown }).feature = feature;
								const props = feature.properties ?? {};
								layer.bindPopup(self.buildPopupContent(props), { maxWidth: 400 });
								if (typeof layer.on === 'function') {
									layer.on('popupopen', () => {
										layer.setPopupContent(self.buildPopupContent(props));
									});
								}
								const pickedId = String(props['gid'] ?? props['id'] ?? props['objectid'] ?? '').trim();
								const pickedSlug = String(props['_layerSlug'] ?? slug).trim();
								if (pickedId && pickedSlug && typeof layer.on === 'function') {
									layer.on('click', () => {
										self.selectedTraceRowKey = `${pickedSlug}:${pickedId}`;
										const label = String(props['_layerLabel'] ?? props['name'] ?? props['numero_poste'] ?? props['assetid'] ?? props['numero'] ?? `${pickedSlug}:${pickedId}`).trim() || `${pickedSlug}:${pickedId}`;
										self.selectedMapStart = { slug: pickedSlug, id: pickedId, label };
										self.applyTraceStyleToMap();
										self.cdr.markForCheck();
									});
									layer.on('popupclose', () => {
										self.selectedTraceRowKey = null;
										self.applyTraceStyleToMap();
										self.cdr.markForCheck();
									});
								}
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
					if (bounds && m?.fitBounds) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 22 });
					this.mapLoading = false;
					this.cdr.markForCheck();
					this.updateLigneSecoursOptionsBySelection();
					setTimeout(() => self.highlightSelectionOnMap(), 0);
					resolve();
				}).catch(() => {
					this.mapLoading = false;
					this.cdr.markForCheck();
					resolve();
				});
			},
			error: () => {
				this.mapLoading = false;
				this.cdr.markForCheck();
				resolve();
			}
		});
		});
	}
}
