import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { RippleModule } from 'primeng/ripple';
import { GisApiService, SuggestPlacementItem } from '../../../services/gis-api.service';
import { LayerFormDefaultsService } from '../../../services/layer-form-defaults.service';
import { of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import confetti from 'canvas-confetti';

const MAP_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#06b6d4'];

/** Clés souvent utilisées comme clé primaire (ordre de priorité) */
const PK_KEYS = ['objectid', 'id', 'assetid', 'gid'];

@Component({
	selector: 'app-modelisation',
	standalone: true,
	imports: [CommonModule, FormsModule, Select, DialogModule, ButtonModule, InputTextModule, TextareaModule, RippleModule],
	templateUrl: './modelisation.component.html',
	styleUrls: ['./modelisation.component.scss']
})
export class Modelisation implements AfterViewInit, OnDestroy {
	@ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

	sidebarCollapsed = false;

	/** Périmètre du modèle */
	paramPosteSource = '';
	paramTension = '';
	paramTypeReseau = '';

	posteSourceOptions: { label: string; value: string }[] = [
		{ label: 'Tous les postes', value: '' },
		{ label: 'Poste Gounghin', value: 'gounghin' },
		{ label: 'Poste Tampouy', value: 'tampouy' },
		{ label: 'Poste Karpala', value: 'karpala' }
	];
	tensionOptions: { label: string; value: string }[] = [
		{ label: 'HTA', value: 'hta' },
		{ label: 'BT', value: 'bt' },
		{ label: 'HTA + BT', value: 'both' }
	];
	typeReseauOptions: { label: string; value: string }[] = [
		{ label: 'Aérien', value: 'aerien' },
		{ label: 'Souterrain', value: 'souterrain' },
		{ label: 'Tous', value: 'tous' }
	];

	/** Couches incluses dans le modèle (chargées depuis l'API) */
	couchesModele: { id: string; label: string; color: string; included: boolean }[] = [];

	/** Liste pour le select « Couche » (référence stable, mise à jour au chargement) */
	couchesIncludedList: { id: string; label: string; color: string; included: boolean }[] = [];

	/** Couches cochées (pour le select, pas d'arrow function dans le template) */
	get couchesIncluded(): { id: string; label: string; color: string; included: boolean }[] {
		return this.couchesModele.filter((c) => c.included);
	}

	/** True si la couche sélectionnée est une couche de branchements (point) — suggestions limitées aux lignes BT. */
	get isBranchementLayer(): boolean {
		const s = (this.selectedLayerSlug || '').toLowerCase();
		return s.includes('branchement') && !s.includes('ligne');
	}

	buildLoading = false;
	exportLoading = false;
	calcLoading = false;
	modelResult: { success: boolean; message: string } | null = null;

	/** Gestion des ouvrages (CRUD) */
	selectedLayerSlug: string | null = null;
	selectedLayerLabel = '';
	/** Type de géométrie détecté automatiquement pour la couche sélectionnée (Point, LineString, Polygon, etc.) */
	selectedLayerGeometryType: string | null = null;
	/** Panneau flottant carte réduit (icônes seules) ou déplié — par défaut réduit */
	mapPanelCollapsed = true;
	/** Légende carte : panneau ouvert ou fermé */
	legendPanelOpen = false;
	/** Panneau « Couches visibles » (comme Carte réseau) */
	layersPanelOpen = false;
	/** Spinner : chargement des couches sur la carte */
	layersMapLoading = false;
	/** Action du panneau carte actuellement sélectionnée (pour mise en évidence visuelle) */
	selectedMapPanelAction: 'create' | 'modify' | 'delete' | 'select' | null = null;
	ouvragesList: Record<string, unknown>[] = [];
	ouvragesLoading = false;
	ouvrageModalVisible = false;
	ouvrageModalMode: 'view' | 'edit' | 'create' = 'view';
	ouvrageForm: Record<string, unknown> = {};
	/** Cible CRUD mémorisée pendant l'édition (utile pour couches synthétiques points*). */
	private editTargetSlug: string | null = null;
	private editTargetPk = '';
	crudLoading = false;
	ocrLoading = false;
	ocrMessage = '';
	imageViewerVisible = false;
	imageViewerSrc = '';
	imageViewerTitle = 'Image';
	popupOcrVisible = false;
	popupOcrLoading = false;
	popupOcrTitle = 'Résultat OCR';
	popupOcrText = '';
	popupOcrTargetSlug: string | null = null;
	popupOcrTargetPk = '';
	popupOcrSourceRow: Record<string, unknown> | null = null;
	popupOcrFieldOptions: Array<{ key: string; label: string }> = [];
	popupOcrMappings: Array<{ text: string; field: string }> = [];
	/** Modale de confirmation de suppression */
	deleteConfirmVisible = false;
	ouvrageToDelete: Record<string, unknown> | null = null;
	/** Sélection multiple pour suppression en masse (clés "slug:pk" pour supporter plusieurs couches) */
	selectedOuvragePks = new Set<string>();
	/** Modale de confirmation de suppression multiple */
	bulkDeleteConfirmVisible = false;
	/** Overlay plein écran : succès (confettis) ou échec (animation) après enregistrement/suppression */
	crudOverlayVisible = false;
	crudOverlaySuccess = false;
	crudOverlayMessage = '';
	private crudOverlayTimeout: ReturnType<typeof setTimeout> | null = null;
	/** Slugs du dernier modèle affiché sur la carte (pour rafraîchir après CRUD) */
	private lastLoadedModelSlugs: string[] = [];

	private map: unknown = null;
	/** Groupe Leaflet pour les couches du modèle (lignes, points) */
	private layerGroup: { addLayer: (l: unknown) => void; removeLayer: (l: unknown) => void; clearLayers: () => void } | null = null;
	/** Par slug : groupe de couches (pour afficher/masquer comme dans Carte réseau) */
	private slugToLayerGroups = new Map<string, unknown>();
	/** Groupe pour le cercle de clignotement (consulter ouvrage) */
	private highlightLayerGroup: { addLayer: (l: unknown) => void; clearLayers: () => void } | null = null;
	private blinkCircle: unknown = null;
	private blinkInterval: ReturnType<typeof setInterval> | null = null;
	private blinkTimeout: ReturnType<typeof setTimeout> | null = null;
	/** Clé ouvrage (slug:pk) → layer + style par défaut (pour mise en évidence au consulter) */
	private ouvrageIdToLayer = new Map<string, { layer: { setStyle: (s: object) => void; getBounds?: () => unknown; getLatLng?: () => { lat: number; lng: number }; bringToFront?: () => void }; defaultColor: string; isLine: boolean }>();
	private highlightedOuvrageKey: string | null = null;
	/** Mode sélection par rectangle : début du tracé (lat, lng) */
	private selectRectStart: [number, number] | null = null;
	/** Rectangle de sélection affiché pendant le dessin */
	private selectRectLayer: unknown = null;
	/** Nettoyage des écouteurs de dessin du rectangle de sélection */
	private removeSelectRectListeners: (() => void) | null = null;
	/** Détails chargés au clic popup (incluant image) pour éviter des appels répétés. */
	private popupDetailsCache = new Map<string, Record<string, unknown>>();

	/** Création : phase dessin sur la carte */
	createDrawingMode = false;
	createDrawingPoints: [number, number][] = [];
	createGeometryWkt: string | null = null;
	/** Afficher le formulaire des attributs dans le panneau (après dessin) */
	createFormInPanel = false;
	/** Afficher le formulaire de modification dans le panneau (au lieu de la modale) */
	editFormInPanel = false;
	/** Afficher la consultation (Consulter) dans le panneau flottant au lieu de la modale */
	viewFormInPanel = false;
	private drawLayerGroup: { addLayer: (l: unknown) => void; clearLayers: () => void } | null = null;
	/** Groupe Leaflet pour les marqueurs de suggestions de placement (création intelligente). */
	private suggestionLayerGroup: { addLayer: (l: unknown) => void; clearLayers: () => void } | null = null;
	/** Polylines des lignes suggérées (pour clignotement). */
	private suggestionLineLayers: Array<{ setStyle: (s: object) => void }> = [];
	/** Intervalle de clignotement des lignes suggérées. */
	private suggestionBlinkInterval: ReturnType<typeof setInterval> | null = null;
	/** Propositions de placement/raccordement affichées en mode création. */
	createSuggestions: SuggestPlacementItem[] = [];
	/** Chargement des suggestions en cours. */
	createSuggestionsLoading = false;
	/** Les suggestions ont été chargées (même si vides) — pour afficher un message si 0. */
	createSuggestionsLoaded = false;
	/** Libellé de la proposition choisie (affiché dans le formulaire de création). */
	suggestedConnectionLabel = '';
	/** Couches temporaires de dessin ajoutées à la carte (pour retrait au clear). */
	private drawTempLayers: unknown[] = [];
	/** Désinscrit tous les écouteurs du mode dessin (clic, clic droit, double-clic, Échap). */
	private removeDrawingListeners: (() => void) | null = null;
	/** Timeout pour debounce du rechargement des suggestions au déplacement de la carte. */
	private suggestMoveEndTimeout: ReturnType<typeof setTimeout> | null = null;
	/** Listener de délégation pour les boutons Modifier/Supprimer du popup carte. */
	private popupButtonsClickListener: ((e: Event) => void) | null = null;

	constructor(
		private gisApi: GisApiService,
		private layerFormDefaults: LayerFormDefaultsService,
		private cdr: ChangeDetectorRef,
		private ngZone: NgZone
	) {}

	ngOnInit(): void {
		this.paramPosteSource = this.posteSourceOptions[0]?.value ?? '';
		this.paramTension = this.tensionOptions[0]?.value ?? '';
		this.paramTypeReseau = this.typeReseauOptions[0]?.value ?? '';
		this.loadCouchesModele();
	}

	ngAfterViewInit(): void {
		this.initMap();
	}

	ngOnDestroy(): void {
		this.clearCrudOverlayTimeout();
		this.stopBlink();
		this.stopSelectRectDrawing();
		if (this.popupButtonsClickListener && this.mapContainer?.nativeElement) {
			this.mapContainer.nativeElement.removeEventListener('click', this.popupButtonsClickListener);
			this.popupButtonsClickListener = null;
		}
		if (this.suggestMoveEndTimeout) {
			clearTimeout(this.suggestMoveEndTimeout);
			this.suggestMoveEndTimeout = null;
		}
		if (this.suggestionBlinkInterval) {
			clearInterval(this.suggestionBlinkInterval);
			this.suggestionBlinkInterval = null;
		}
		this.suggestionLineLayers = [];
		if (this.map && typeof (this.map as { remove?: () => void }).remove === 'function') {
			(this.map as { remove: () => void }).remove();
			this.map = null;
		}
	}

	/** Arrête le clignotement et retire le cercle de mise en évidence */
	private stopBlink(): void {
		if (this.blinkTimeout) {
			clearTimeout(this.blinkTimeout);
			this.blinkTimeout = null;
		}
		if (this.blinkInterval) {
			clearInterval(this.blinkInterval);
			this.blinkInterval = null;
		}
		if (this.highlightLayerGroup && this.blinkCircle) {
			this.highlightLayerGroup.clearLayers();
			this.blinkCircle = null;
		}
	}

	/** Restaure le style de l'ouvrage actuellement mis en évidence puis retire la mise en évidence */
	private restoreHighlightedOuvrageStyle(): void {
		if (!this.highlightedOuvrageKey) return;
		const prev = this.ouvrageIdToLayer.get(this.highlightedOuvrageKey);
		if (prev?.layer?.setStyle) {
			prev.layer.setStyle({
				color: prev.defaultColor,
				weight: prev.isLine ? 5 : 2,
				opacity: 0.9,
				fillColor: prev.defaultColor,
				fillOpacity: 0.5
			});
		}
		this.highlightedOuvrageKey = null;
		this.cdr.markForCheck();
	}

	private loadCouchesModele(): void {
		if (!this.gisApi) return;
		this.gisApi.getTables().pipe(
			map((tables) =>
				tables.map((t, i) => {
					const colors = ['#ef4444', '#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#06b6d4'];
					const label = (t.table || t.slug).replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
					return { id: t.slug, label, color: colors[i % colors.length], included: true };
				})
			),
			catchError(() => of([]))
		).subscribe((couches) => {
			this.couchesModele = couches;
			this.couchesIncludedList = couches.filter((c) => c.included);
			this.cdr.markForCheck();
			if (this.map && this.layerGroup && couches.length > 0) {
				this.loadAllLayersOnMap();
			}
		});
	}

	/** Charge toutes les couches du modèle sur la carte (comme l’onglet Carte réseau). */
	loadAllLayersOnMap(): void {
		if (!this.couchesModele?.length || !this.gisApi) return;
		const slugs = this.couchesModele.map((c) => c.id);
		this.lastLoadedModelSlugs = slugs;
		this.loadModelOnMap(slugs);
	}

	toggleCouche(couche: { id: string; label: string; color: string; included: boolean }): void {
		const mainGroup = this.layerGroup as { addLayer: (l: unknown) => void; removeLayer: (l: unknown) => void } | null;
		if (!mainGroup) {
			this.cdr.markForCheck();
			return;
		}
		const slugGroup = this.slugToLayerGroups.get(couche.id);
		if (slugGroup) {
			if (couche.included) {
				mainGroup.addLayer(slugGroup);
			} else {
				mainGroup.removeLayer(slugGroup);
			}
		}
		this.cdr.markForCheck();
	}

	private getModelisationParams(): { poste_source: string; tension: string; type_reseau: string; layer_slugs: string[] } {
		return {
			poste_source: this.paramPosteSource || '',
			tension: this.paramTension || '',
			type_reseau: this.paramTypeReseau || '',
			layer_slugs: this.couchesModele.filter((c) => c.included).map((c) => c.id)
		};
	}

	/** Construire le modèle à partir du périmètre et des couches sélectionnées */
	construireModele(): void {
		this.modelResult = null;
		this.buildLoading = true;
		this.cdr.markForCheck();
		const params = this.getModelisationParams();
		if (params.layer_slugs.length === 0) {
			this.buildLoading = false;
			this.modelResult = { success: false, message: 'Sélectionnez au moins une couche.' };
			this.cdr.markForCheck();
			return;
		}
		this.gisApi.buildModel(params).pipe(
			catchError((err) => {
				this.buildLoading = false;
				this.modelResult = { success: false, message: err?.error?.detail || err?.message || 'Erreur lors de la construction du modèle.' };
				this.cdr.markForCheck();
				return of(null);
			})
		).subscribe((res) => {
			this.buildLoading = false;
			if (res) {
				this.modelResult = { success: res.success, message: res.message ?? '' };
				const slugs = res.layers?.map((l) => l.slug) ?? params.layer_slugs ?? [];
				if (res.success && slugs.length > 0) {
					this.lastLoadedModelSlugs = slugs;
					this.loadModelOnMap(slugs);
				}
			}
			this.cdr.markForCheck();
		});
	}

	/** Retourne la clé primaire probable d'un ouvrage */
	getPkValue(ouvrage: Record<string, unknown>): string {
		for (const k of PK_KEYS) {
			if (ouvrage[k] != null) return String(ouvrage[k]);
		}
		const first = Object.keys(ouvrage)[0];
		return first ? String(ouvrage[first]) : '';
	}

	private isSyntheticPointLayer(slug: string | null): boolean {
		const s = (slug ?? '').toLowerCase();
		return s === 'points' || s === 'point-connecte' || s === 'point-non-connecte' || s === 'point-connecte-topologie';
	}

	private normalizeSlugFromType(typeValue: unknown): string | null {
		if (typeof typeValue !== 'string' || !typeValue.trim()) return null;
		return typeValue.trim().toLowerCase().replace(/_/g, '-');
	}

	private resolveCrudTarget(
		defaultSlug: string | null,
		payload: Record<string, unknown>
	): { slug: string | null; pk: string } {
		const fallbackPk = this.getPkValue(payload);
		if (!defaultSlug) return { slug: null, pk: fallbackPk };
		if (!this.isSyntheticPointLayer(defaultSlug)) return { slug: defaultSlug, pk: fallbackPk };
		const targetSlug = this.normalizeSlugFromType(payload['t']);
		const gid = payload['gid'];
		if (targetSlug && gid != null && String(gid).trim().length > 0) {
			return { slug: targetSlug, pk: String(gid) };
		}
		return { slug: defaultSlug, pk: fallbackPk };
	}

	/** Retourne le nom de la clé primaire (pour le popup data-pk-key) */
	private getPkKey(props: Record<string, unknown>): string {
		for (const k of PK_KEYS) {
			if (props[k] != null) return k;
		}
		const keys = Object.keys(props).filter((x) => x !== '_layerSlug' && x !== 'geom' && x !== 'Geom');
		return keys[0] ?? 'gid';
	}

	/** Colonnes à afficher dans la liste (hors geom) */
	getListColumns(ouvrage: Record<string, unknown>): string[] {
		return Object.keys(ouvrage).filter((k) => k.toLowerCase() !== 'geom' && (ouvrage[k] == null || typeof ouvrage[k] !== 'string' || (ouvrage[k] as string).length < 200));
	}

	onLayerSlugChange(slug: string | null): void {
		this.selectedLayerSlug = slug;
		this.selectedLayerLabel = slug ? (this.couchesModele.find((c) => c.id === slug)?.label ?? '') : '';
		this.selectedLayerGeometryType = null;
		this.selectedMapPanelAction = null;
		this.mapPanelCollapsed = true;
		this.selectedOuvragePks.clear();
		if (slug && this.gisApi) {
			this.gisApi.getTableMeta(slug).pipe(
				catchError(() => of({ slug, table: slug, geometry_type: undefined }))
			).subscribe((meta) => {
				this.selectedLayerGeometryType = meta.geometry_type ?? null;
				this.cdr.markForCheck();
			});
		}
		this.cdr.markForCheck();
	}

	/** Charge la liste des ouvrages pour la couche sélectionnée. En mode Modifier/Supprimer, affiche toutes les couches sur la carte. */
	loadOuvragesForLayer(): void {
		const slug = this.selectedLayerSlug;
		if (!slug || !this.gisApi) return;
		this.ouvragesLoading = true;
		this.cdr.markForCheck();
		const showAllLayersOnMap = this.selectedMapPanelAction === 'modify' || this.selectedMapPanelAction === 'delete' || this.selectedMapPanelAction === 'create' || this.selectedMapPanelAction === 'select';
		this.gisApi.getList(slug, 2000, 0).pipe(
			catchError(() => of([]))
		).subscribe((list) => {
			this.ouvragesList = list;
			this.selectedOuvragePks.clear();
			this.ouvragesLoading = false;
			if (showAllLayersOnMap && this.map && this.layerGroup) {
				// Afficher toutes les couches sur la carte (ligne, point, polygone, etc.)
				const allSlugs = this.couchesModele.map((c) => c.id);
				this.lastLoadedModelSlugs = allSlugs.length > 0 ? allSlugs : [slug];
				this.loadModelOnMap(this.lastLoadedModelSlugs);
			} else {
				this.lastLoadedModelSlugs = [slug];
				if (this.map && this.layerGroup) {
					if (list.length > 0) {
						this.drawOuvragesOnMap(slug, list);
					} else {
						this.layerGroup.clearLayers();
					}
				}
			}
			this.cdr.markForCheck();
		});
	}

	/** Ouvre la consultation : dans le panneau flottant si une couche est sélectionnée, sinon en modale */
	openView(ouvrage: Record<string, unknown>): void {
		const target = this.resolveCrudTarget(this.selectedLayerSlug, ouvrage);
		const slug = target.slug;
		const pk = target.pk;
		this.ouvrageModalMode = 'view';
		if (slug && this.gisApi) {
			this.gisApi.getById(slug, pk).pipe(
				catchError(() => of(null))
			).subscribe((full) => {
				this.ouvrageForm = full ? { ...full } : { ...ouvrage };
				this.viewFormInPanel = true;
				this.ouvrageModalVisible = false;
				this.mapPanelCollapsed = false;
				this.highlightOuvrageOnMap(pk);
				this.cdr.markForCheck();
			});
		} else {
			this.ouvrageForm = { ...ouvrage };
			this.viewFormInPanel = false;
			this.ouvrageModalVisible = true;
			this.highlightOuvrageOnMap(pk);
			this.cdr.markForCheck();
		}
	}

	/** Ouvre l'édition : dans le panneau flottant si on est en mode Modifier, sinon en modale */
	openEdit(ouvrage: Record<string, unknown>, forcedTarget?: { slug: string | null; pk: string }): void {
		const target = forcedTarget ?? this.resolveCrudTarget(this.selectedLayerSlug, ouvrage);
		const slug = target.slug;
		const pk = target.pk;
		this.editTargetSlug = slug;
		this.editTargetPk = pk;
		this.ouvrageModalMode = 'edit';
		const openPanel = this.selectedMapPanelAction === 'modify';
		const applyForm = (row: Record<string, unknown>): void => {
			this.ouvrageForm = { ...row };
			if (openPanel) {
				this.editFormInPanel = true;
				this.ouvrageModalVisible = false;
				this.mapPanelCollapsed = false;
			} else {
				this.editFormInPanel = false;
				this.ouvrageModalVisible = true;
			}
			this.cdr.markForCheck();
		};
		// Toujours recharger la ligne complète (incluant image) pour éviter les
		// écarts entre la liste allégée et la fiche d'édition.
		if (slug && pk && this.gisApi) {
			this.gisApi.getById(slug, pk).pipe(
				catchError(() => of(ouvrage))
			).subscribe((full) => applyForm((full ?? ouvrage) as Record<string, unknown>));
			return;
		}
		applyForm(ouvrage);
	}

	/** En mode Modifier : clic sur un ouvrage sur la carte → charger l'ouvrage complet et ouvrir le formulaire de modification */
	openEditFromMapClick(slug: string, props: Record<string, unknown>): void {
		const target = this.resolveCrudTarget(slug, props);
		if (!target.slug || !target.pk || !this.gisApi) return;
		this.gisApi.getById(target.slug, target.pk).pipe(
			catchError(() => of(null))
		).subscribe((ouvrage) => {
			if (ouvrage) {
				this.selectedLayerSlug = slug;
				this.selectedLayerLabel = this.couchesModele.find((c) => c.id === slug)?.label ?? slug;
				this.openEdit(ouvrage, target);
				this.cdr.markForCheck();
			}
		});
	}

	/** En mode Supprimer : clic sur un ouvrage sur la carte → ouvrir la confirmation de suppression */
	openDeleteFromMapClick(slug: string, props: Record<string, unknown>): void {
		this.selectedLayerSlug = slug;
		this.selectedLayerLabel = this.couchesModele.find((c) => c.id === slug)?.label ?? slug;
		this.ouvrageToDelete = { ...props };
		this.deleteConfirmVisible = true;
		this.cdr.markForCheck();
	}

	/** Démarre la création : dessin sur la carte selon le type de géométrie, puis formulaire dans le panneau. Charge les suggestions de placement. */
	openCreate(): void {
		this.selectedMapPanelAction = 'create';
		this.stopSelectRectDrawing();
		this.mapPanelCollapsed = false;
		this.suggestedConnectionLabel = '';
		this.createSuggestionsLoaded = false;
		this.clearCreateSuggestions();
		const geomType = (this.selectedLayerGeometryType || '').toLowerCase();
		if (!geomType) {
			// Pas de type de géométrie : ouvrir directement la modale (comportement ancien)
			const first = this.ouvragesList[0];
			this.ouvrageForm = first ? Object.keys(first).reduce((acc, k) => ({ ...acc, [k]: '' }), {} as Record<string, unknown>) : {};
			this.layerFormDefaults.getDefaultsForLayer(this.selectedLayerSlug).subscribe((defaults) => {
				this.layerFormDefaults.applyDefaultsToForm(this.ouvrageForm, defaults, { onlyEmpty: true, excludeKeys: ['geom'] });
				this.cdr.markForCheck();
			});
			this.ouvrageModalMode = 'create';
			this.ouvrageModalVisible = true;
			this.cdr.markForCheck();
			return;
		}
		this.createDrawingMode = true;
		this.createDrawingPoints = [];
		this.createGeometryWkt = null;
		this.createFormInPanel = false;
		this.ouvrageForm = {};
		this.startMapClickForDrawing();
		this.scheduleLoadCreateSuggestions(0);
		// Afficher toutes les couches du modèle sur la carte pour voir les lignes et ouvrages concernés
		if (this.map && this.layerGroup && this.couchesModele.length > 0) {
			const allSlugs = this.couchesModele.map((c) => c.id);
			this.lastLoadedModelSlugs = allSlugs;
			this.loadModelOnMap(allSlugs);
		}
		this.cdr.markForCheck();
	}

	/** Centre actuel de la carte (pour les suggestions). */
	private getMapCenter(): { lat: number; lng: number } | null {
		const m = this.map as { getCenter?: () => { lat: number; lng: number } } | null;
		if (m?.getCenter) {
			const c = m.getCenter();
			return c ? { lat: c.lat, lng: c.lng } : null;
		}
		return null;
	}

	private static readonly SUGGEST_RETRY_DELAY_MS = 250;
	private static readonly SUGGEST_RETRY_MAX = 12;

	/** Programme le chargement des suggestions (retry si la carte n'est pas prête). */
	private scheduleLoadCreateSuggestions(attempt: number): void {
		if (attempt >= Modelisation.SUGGEST_RETRY_MAX) return;
		const delay = attempt === 0 ? 350 : Modelisation.SUGGEST_RETRY_DELAY_MS;
		setTimeout(() => {
			if (!this.createDrawingMode) return;
			const slug = this.selectedLayerSlug;
			if (!slug || !this.gisApi) {
				this.scheduleLoadCreateSuggestions(attempt + 1);
				return;
			}
			if (!this.suggestionLayerGroup || !this.getMapCenter()) {
				this.scheduleLoadCreateSuggestions(attempt + 1);
				this.cdr.markForCheck();
				return;
			}
			this.loadCreateSuggestions();
		}, delay);
	}

	/** Charge les propositions de placement (où placer, à quoi raccorder) et les affiche sur la carte. */
	loadCreateSuggestions(): void {
		const slug = this.selectedLayerSlug;
		if (!slug || !this.gisApi) return;
		const center = this.getMapCenter();
		if (!center || !this.suggestionLayerGroup) return;
		this.createSuggestionsLoading = true;
		this.createSuggestionsLoaded = false;
		this.cdr.markForCheck();
		this.gisApi.getSuggestPlacement(slug, { lat: center.lat, lng: center.lng, radius_m: 5000 }).pipe(
			catchError(() => of({ suggestions: [], message: '' }))
		).subscribe((res) => {
			this.createSuggestionsLoading = false;
			this.createSuggestionsLoaded = true;
			this.createSuggestions = res.suggestions || [];
			this.drawSuggestionMarkers();
			this.cdr.markForCheck();
		});
	}

	/** Parse WKT LINESTRING / LINESTRING Z / MULTILINESTRING en [lat, lng][]. Fallback si wellknown échoue (ex. PostGIS Z). */
	private parseLineWktToLatLngs(wkt: string): [number, number][] | [number, number][][] | null {
		if (!wkt || typeof wkt !== 'string') return null;
		const s = wkt.trim();
		// LINESTRING (lng lat, lng lat, ...) ou LINESTRING Z (lng lat z, ...)
		const lineMatch = s.match(/LINESTRING\s*Z?\s*\(\s*(.+)\s*\)/is);
		if (lineMatch) {
			const coords = this.parseWktCoordList(lineMatch[1]);
			if (coords.length >= 2) return coords;
		}
		const multiMatch = s.match(/MULTILINESTRING\s*Z?\s*\(\s*\((.+)\)\s*\)/s);
		if (multiMatch) {
			const parts = multiMatch[1].split(/\)\s*,\s*\(/).map((part) => this.parseWktCoordList(part.replace(/^\s*\(|\)\s*$/g, '')));
			if (parts.some((p) => p.length >= 2)) return parts;
		}
		return null;
	}

	private parseWktCoordList(s: string): [number, number][] {
		const out: [number, number][] = [];
		const pairs = s.split(',').map((p) => p.trim().split(/\s+/));
		for (const p of pairs) {
			const x = parseFloat(p[0]);
			const y = parseFloat(p[1]);
			if (Number.isFinite(x) && Number.isFinite(y)) out.push([y, x]);
		}
		return out;
	}

	/** Affiche les marqueurs de suggestions sur la carte, met en évidence les lignes concernées (clignotantes) et la distance. */
	private drawSuggestionMarkers(): void {
		if (!this.suggestionLayerGroup || !this.map) return;
		if (this.suggestionBlinkInterval) {
			clearInterval(this.suggestionBlinkInterval);
			this.suggestionBlinkInterval = null;
		}
		this.suggestionLineLayers = [];
		this.suggestionLayerGroup.clearLayers();
		if (this.createSuggestions.length === 0) return;
		Promise.all([import('leaflet'), import('wellknown').then((w) => w.default ?? w)]).then(([LMod, wellknown]) => {
			const L = (LMod as { default: unknown }).default as {
				marker: (latlng: unknown, opts: { icon: unknown; pane?: string }) => { bindPopup: (html: string) => unknown; on: (ev: string, fn: () => void) => unknown };
				divIcon: (opts: { html: string; className?: string; iconSize?: [number, number]; iconAnchor?: [number, number] }) => unknown;
				polyline: (latlngs: [number, number][], opts: object) => { setStyle: (s: object) => void; addTo?: (g: unknown) => unknown };
			};
			const wk = (wellknown as { parse?: (wkt: string) => { type: string; coordinates: number[][] | number[][][] } }).parse
				?? (wellknown as { default?: { parse: (wkt: string) => { type: string; coordinates: number[][] | number[][][] } } }).default?.parse;
			const parseWkt = typeof wk === 'function' ? wk : ((): null => null);
			const group = this.suggestionLayerGroup!;
			const highlightStyle = {
				color: '#059669',
				weight: 10,
				opacity: 1,
				pane: 'suggestPane' as const,
				lineCap: 'round' as const,
				lineJoin: 'round' as const
			};

			// D'abord dessiner les lignes en évidence (sous les marqueurs)
			for (const s of this.createSuggestions) {
				if (s.type !== 'line_connection' || !s.line_wkt) continue;
				let latlngsList: [number, number][] | [number, number][][] | null = null;
				const geojson = parseWkt(s.line_wkt);
				if (geojson?.coordinates) {
					const toLatLng = (c: number[]): [number, number] => [c[1], c[0]];
					if (geojson.type === 'LineString') {
						latlngsList = (geojson.coordinates as number[][]).map(toLatLng);
					} else if (geojson.type === 'MultiLineString') {
						latlngsList = (geojson.coordinates as number[][][]).map((part) => part.map(toLatLng));
					}
				}
				if (!latlngsList) latlngsList = this.parseLineWktToLatLngs(s.line_wkt);
				if (!latlngsList) continue;
				const list = Array.isArray(latlngsList[0]) && typeof latlngsList[0][0] === 'number' ? [latlngsList as [number, number][]] : (latlngsList as [number, number][][]);
				for (const latlngs of list) {
					if (latlngs.length >= 2) {
						const line = L.polyline(latlngs, highlightStyle);
						group.addLayer(line);
						if (line.setStyle) this.suggestionLineLayers.push(line);
					}
				}
			}
			// Clignotement des lignes suggérées (opacité 1 ↔ 0.3)
			if (this.suggestionLineLayers.length > 0) {
				let blinkVisible = true;
				this.suggestionBlinkInterval = setInterval(() => {
					blinkVisible = !blinkVisible;
					const opacity = blinkVisible ? 1 : 0.3;
					for (const layer of this.suggestionLineLayers) {
						if (layer.setStyle) layer.setStyle({ opacity });
					}
				}, 500);
			}

			// Puis les marqueurs (point + distance)
			for (const s of this.createSuggestions) {
				const color = s.type === 'line_connection' ? '#22c55e' : '#3b82f6';
				const distText = s.distance_m != null ? `${Math.round(s.distance_m)} m` : '—';
				const icon = L.divIcon({
					className: 'suggestion-marker-icon',
					html: `<div class="suggestion-marker-wrap">
						<div class="suggestion-marker-dot" style="background-color:${color};border-color:${color};"></div>
						<span class="suggestion-marker-distance">${distText}</span>
					</div>`,
					iconSize: [48, 36],
					iconAnchor: [24, 18]
				});
				const marker = L.marker([s.lat, s.lng], { icon, pane: 'suggestPane' }) as { bindPopup: (h: string) => unknown; on: (ev: string, fn: () => void) => unknown };
				(marker as { bindPopup: (h: string) => unknown }).bindPopup(`<strong>${s.label}</strong><br><span class="suggestion-popup-dist">Distance : ${distText}</span><br><em>Cliquez pour placer ici</em>`);
				(marker as { on: (ev: string, fn: () => void) => unknown }).on('click', () => this.selectSuggestion(s));
				group.addLayer(marker);
			}
		});
	}

	/** Choisir une proposition : place l'entité à ce point et affiche le libellé dans le formulaire (point uniquement). */
	selectSuggestion(s: SuggestPlacementItem): void {
		const geomType = (this.selectedLayerGeometryType || '').toLowerCase();
		if (geomType === 'point') {
			this.suggestedConnectionLabel = s.label;
			this.buildPointWktAndFinish(s.lng, s.lat);
			this.removeMapClickForDrawing();
			this.clearCreateSuggestions();
		}
		this.cdr.markForCheck();
	}

	/** Efface les suggestions de placement de la carte. */
	clearCreateSuggestions(): void {
		this.createSuggestions = [];
		this.createSuggestionsLoaded = false;
		if (this.suggestionBlinkInterval) {
			clearInterval(this.suggestionBlinkInterval);
			this.suggestionBlinkInterval = null;
		}
		this.suggestionLineLayers = [];
		if (this.suggestionLayerGroup) this.suggestionLayerGroup.clearLayers();
		this.cdr.markForCheck();
	}

	private startMapClickForDrawing(): void {
		if (!this.map || !this.drawLayerGroup) return;
		import('leaflet').then((LMod) => {
			const L = (LMod as { default: unknown }).default as {
				circleMarker: (latlng: unknown, opts: object) => unknown;
				polyline: (latlngs: unknown[], opts: object) => unknown;
				polygon: (latlngs: unknown[], opts: object) => unknown;
			};
			const map = this.map as {
				on: (ev: string, fn: (e: unknown) => void) => unknown;
				off: (ev: string, fn?: (e: unknown) => void) => void;
				getContainer?: () => HTMLElement;
			};
			const geomType = (this.selectedLayerGeometryType || '').toLowerCase().replace(/\s+/g, '');
			const isLineOrPolygon = geomType === 'linestring' || geomType.includes('line') || geomType === 'polygon' || geomType === 'multipolygon';

			const onMapClick = (e: unknown): void => {
				const ev = e as { latlng: { lat: number; lng: number } };
				if (!ev?.latlng) return;
				const { lat, lng } = ev.latlng;
				if (geomType === 'point') {
					this.buildPointWktAndFinish(lng, lat);
					this.removeMapClickForDrawing();
					this.cdr.markForCheck();
					return;
				}
				this.createDrawingPoints.push([lat, lng]);
				this.updateTempDrawLayer(L);
				this.cdr.markForCheck();
			};

			const onFinishGesture = (e: unknown): void => {
				if (!this.canFinishDrawing()) return;
				const ev = e as { originalEvent?: Event };
				if (ev?.originalEvent) {
					ev.originalEvent.preventDefault();
					ev.originalEvent.stopPropagation();
				}
				this.finishCreateDrawing();
			};

			const onKeyDown = (e: KeyboardEvent): void => {
				if (e.key === 'Escape') {
					e.preventDefault();
					this.cancelCreateDrawing();
				}
			};

			map.on('click', onMapClick);
			if (isLineOrPolygon) {
				map.on('contextmenu', onFinishGesture as (e: unknown) => void);
				map.on('dblclick', onFinishGesture as (e: unknown) => void);
			}
			document.addEventListener('keydown', onKeyDown);

			this.removeDrawingListeners = (): void => {
				map.off('click', onMapClick);
				if (isLineOrPolygon) {
					map.off('contextmenu', onFinishGesture as (e: unknown) => void);
					map.off('dblclick', onFinishGesture as (e: unknown) => void);
				}
				document.removeEventListener('keydown', onKeyDown);
				this.removeDrawingListeners = null;
			};
		});
	}

	private removeMapClickForDrawing(): void {
		if (this.removeDrawingListeners) {
			this.removeDrawingListeners();
			this.removeDrawingListeners = null;
		}
	}

	private clearDrawLayer(): void {
		const map = this.map as { removeLayer?: (l: unknown) => void } | null;
		if (map?.removeLayer) {
			this.drawTempLayers.forEach((l) => map.removeLayer!(l));
		}
		this.drawTempLayers = [];
		if (this.drawLayerGroup) this.drawLayerGroup.clearLayers();
	}

	private buildPointWktAndFinish(lng: number, lat: number): void {
		this.createGeometryWkt = `POINT(${lng} ${lat})`;
		this.createDrawingMode = false;
		// Garder le point visible sur la carte pendant la saisie des attributs
		this.createDrawingPoints = [[lat, lng]];
		import('leaflet').then((LMod) => {
			const L = (LMod as { default: unknown }).default as {
				circleMarker: (latlng: unknown, opts: object) => unknown;
				polyline: (latlngs: unknown[], opts: object) => unknown;
				polygon: (latlngs: unknown[], opts: object) => unknown;
			};
			this.updateTempDrawLayer(L);
		});
		this.loadOuvrageFormTemplateAndShowInPanel();
	}

	/** Terminer le dessin (ligne ou polygone) et afficher le formulaire dans le panneau. */
	finishCreateDrawing(): void {
		const geomType = (this.selectedLayerGeometryType || '').toLowerCase().replace(/\s+/g, '');
		const isLine = geomType === 'linestring' || geomType.includes('line');
		if (isLine && this.createDrawingPoints.length >= 2) {
			const coords = this.createDrawingPoints.map(([lat, lng]) => `${lng} ${lat}`).join(', ');
			this.createGeometryWkt = `LINESTRING(${coords})`;
		} else if ((geomType === 'polygon' || geomType === 'multipolygon') && this.createDrawingPoints.length >= 3) {
			const pts = [...this.createDrawingPoints];
			if (pts.length > 0) {
				const first = pts[0];
				if (pts[pts.length - 1][0] !== first[0] || pts[pts.length - 1][1] !== first[1]) pts.push(first);
			}
			const coords = pts.map(([lat, lng]) => `${lng} ${lat}`).join(', ');
			this.createGeometryWkt = `POLYGON((${coords}))`;
		} else {
			return;
		}
		this.createDrawingMode = false;
		this.removeMapClickForDrawing();
		this.clearDrawLayer();
		this.loadOuvrageFormTemplateAndShowInPanel();
		this.cdr.markForCheck();
	}

	private loadOuvrageFormTemplateAndShowInPanel(): void {
		const slug = this.selectedLayerSlug;
		if (!slug || !this.gisApi) {
			this.ouvrageForm = { geom: this.createGeometryWkt };
			this.ouvrageModalMode = 'create';
			this.createFormInPanel = true;
			this.cdr.markForCheck();
			return;
		}
		this.gisApi.getList(slug, 1, 0).pipe(
			catchError(() => of([]))
		).subscribe((rows) => {
			const first = rows[0];
			const geomKey = first && Object.keys(first).find((k) => /^geom$/i.test(k)) ? Object.keys(first).find((k) => /^geom$/i.test(k))! : 'geom';
			this.ouvrageForm = first
				? Object.keys(first).reduce((acc, k) => ({ ...acc, [k]: /^geom$/i.test(k) ? this.createGeometryWkt : '' }), {} as Record<string, unknown>)
				: { [geomKey]: this.createGeometryWkt };
			this.layerFormDefaults.getDefaultsForLayer(this.selectedLayerSlug).subscribe((defaults) => {
				this.layerFormDefaults.applyDefaultsToForm(this.ouvrageForm, defaults, { onlyEmpty: true, excludeKeys: ['geom'] });
				this.cdr.markForCheck();
			});
			this.ouvrageModalMode = 'create';
			this.createFormInPanel = true;
			this.cdr.markForCheck();
		});
	}

	private updateTempDrawLayer(L: { circleMarker: (latlng: unknown, opts: object) => unknown; polyline: (latlngs: unknown[], opts: object) => unknown; polygon: (latlngs: unknown[], opts: object) => unknown }): void {
		const map = this.map as { addLayer?: (l: unknown) => void; removeLayer?: (l: unknown) => void } | null;
		if (!map?.addLayer) return;
		// Retirer les anciennes couches de dessin de la carte
		this.drawTempLayers.forEach((l) => map.removeLayer?.(l));
		this.drawTempLayers = [];
		if (this.drawLayerGroup) this.drawLayerGroup.clearLayers();
		const geomType = (this.selectedLayerGeometryType || '').toLowerCase().replace(/\s+/g, '');
		const isLine = geomType === 'linestring' || geomType.includes('line');
		const isPolygon = geomType === 'polygon' || geomType === 'multipolygon';
		// Couleur de la couche sélectionnée (chaque ouvrage/couche a sa couleur)
		const layerColor = this.couchesModele.find((c) => c.id === this.selectedLayerSlug)?.color ?? '#ea580c';
		const baseStyle = {
			color: layerColor,
			weight: 6,
			opacity: 1,
			fillColor: layerColor,
			fillOpacity: 0.45,
			pane: 'drawPane'
		};
		const addToMap = (layer: unknown): void => {
			map.addLayer!(layer);
			this.drawTempLayers.push(layer);
		};
		if (isLine && this.createDrawingPoints.length >= 2) {
			// Ligne : polyline ajoutée directement à la carte (pane drawPane pour être visible)
			const layer = L.polyline(this.createDrawingPoints as unknown[], baseStyle);
			addToMap(layer);
		} else if (isPolygon && this.createDrawingPoints.length >= 2) {
			const pts = [...this.createDrawingPoints];
			if (pts.length >= 3) {
				const first = pts[0];
				if (pts[pts.length - 1][0] !== first[0] || pts[pts.length - 1][1] !== first[1]) pts.push(first);
			}
			const layer = L.polygon(pts as unknown[], baseStyle);
			addToMap(layer);
		} else if (geomType === 'point' && this.createDrawingPoints.length >= 1) {
			const layer = L.circleMarker(this.createDrawingPoints[0], { ...baseStyle, radius: 12 });
			addToMap(layer);
		}
	}

	/** Annuler le dessin et réinitialiser l’état création. */
	/** Indique si le bouton Terminer doit être actif (assez de sommets). */
	canFinishDrawing(): boolean {
		const geomType = (this.selectedLayerGeometryType || '').toLowerCase().replace(/\s+/g, '');
		const isLine = geomType === 'linestring' || geomType.includes('line');
		if (isLine) return this.createDrawingPoints.length >= 2;
		if (geomType === 'polygon' || geomType === 'multipolygon') return this.createDrawingPoints.length >= 3;
		return false;
	}

	/** Annuler le dessin et réinitialiser l'état création. */
	cancelCreateDrawing(): void {
		this.createDrawingMode = false;
		this.createDrawingPoints = [];
		this.createGeometryWkt = null;
		this.createFormInPanel = false;
		this.ouvrageForm = {};
		this.suggestedConnectionLabel = '';
		this.removeMapClickForDrawing();
		this.clearDrawLayer();
		this.clearCreateSuggestions();
		this.cdr.markForCheck();
	}

	/** Fermer le formulaire de création dans le panneau (après enregistrement ou annulation). */
	closeCreateFormInPanel(): void {
		this.createFormInPanel = false;
		this.createGeometryWkt = null;
		this.createDrawingPoints = [];
		this.ouvrageForm = {};
		this.editTargetSlug = null;
		this.editTargetPk = '';
		this.suggestedConnectionLabel = '';
		this.selectedMapPanelAction = null;
		this.clearDrawLayer();
		this.loadOuvragesForLayer();
		if (this.lastLoadedModelSlugs.length > 0) this.loadModelOnMap(this.lastLoadedModelSlugs);
		this.cdr.markForCheck();
	}

	/** Fermer le formulaire de modification dans le panneau (après enregistrement ou annulation). */
	closeEditFormInPanel(): void {
		this.editFormInPanel = false;
		this.ouvrageForm = {};
		this.editTargetSlug = null;
		this.editTargetPk = '';
		this.loadOuvragesForLayer();
		if (this.lastLoadedModelSlugs.length > 0) this.loadModelOnMap(this.lastLoadedModelSlugs);
		this.cdr.markForCheck();
	}

	/** Charge la liste des ouvrages et marque l’action « Modifier » comme sélectionnée */
	actionModify(): void {
		this.selectedMapPanelAction = 'modify';
		this.stopSelectRectDrawing();
		if (this.selectedLayerSlug) {
			this.loadOuvragesForLayer();
		} else if (this.couchesModele.length > 0 && this.map && this.layerGroup) {
			this.loadAllLayersOnMap();
		}
		this.mapPanelCollapsed = false;
		this.cdr.markForCheck();
	}

	/** Charge la liste des ouvrages et marque l’action « Supprimer » comme sélectionnée */
	actionDelete(): void {
		this.selectedMapPanelAction = 'delete';
		this.stopSelectRectDrawing();
		if (this.selectedLayerSlug) {
			this.loadOuvragesForLayer();
		} else if (this.couchesModele.length > 0 && this.map && this.layerGroup) {
			this.loadAllLayersOnMap();
		}
		this.mapPanelCollapsed = false;
		this.cdr.markForCheck();
	}

	actionSelect(): void {
		this.selectedMapPanelAction = 'select';
		this.mapPanelCollapsed = false;
		if (this.selectedLayerSlug) {
			this.loadOuvragesForLayer();
		} else if (this.couchesModele.length > 0 && this.map && this.layerGroup) {
			this.loadAllLayersOnMap();
		}
		this.startSelectRectDrawing();
		this.cdr.markForCheck();
	}

	private startSelectRectDrawing(): void {
		this.stopSelectRectDrawing();
		if (!this.map) return;
		import('leaflet').then((LMod) => {
			const L = (LMod as { default: unknown }).default as {
				latLngBounds: (sw: [number, number], ne: [number, number]) => unknown;
				rectangle: (bounds: unknown, opts: object) => { setBounds: (b: unknown) => void; addTo: (m: unknown) => unknown; getBounds?: () => { getSouthWest: () => { lat: number; lng: number }; getNorthEast: () => { lat: number; lng: number } } };
			};
			const map = this.map as { on: (ev: string, fn: (e: unknown) => void) => unknown; off: (ev: string, fn?: (e: unknown) => void) => void; addLayer: (l: unknown) => void; removeLayer: (l: unknown) => void };
			const onMouseDown = (e: unknown): void => {
				const ev = e as { latlng: { lat: number; lng: number } };
				if (!ev?.latlng) return;
				this.selectRectStart = [ev.latlng.lat, ev.latlng.lng];
				const bounds = L.latLngBounds([ev.latlng.lat, ev.latlng.lng], [ev.latlng.lat, ev.latlng.lng]);
				this.selectRectLayer = L.rectangle(bounds, { color: '#dc2626', weight: 2, fillColor: '#dc2626', fillOpacity: 0.2, pane: 'selectPane' });
				map.addLayer(this.selectRectLayer);
				this.cdr.markForCheck();
			};
			const onMouseMove = (e: unknown): void => {
				if (!this.selectRectStart || !this.selectRectLayer) return;
				const ev = e as { latlng: { lat: number; lng: number } };
				if (!ev?.latlng) return;
				const [lat1, lng1] = this.selectRectStart;
				const southWest: [number, number] = [Math.min(lat1, ev.latlng.lat), Math.min(lng1, ev.latlng.lng)];
				const northEast: [number, number] = [Math.max(lat1, ev.latlng.lat), Math.max(lng1, ev.latlng.lng)];
				(this.selectRectLayer as { setBounds: (b: unknown) => void }).setBounds(L.latLngBounds(southWest, northEast));
				this.cdr.markForCheck();
			};
			const onMouseUp = (): void => {
				if (!this.selectRectStart || !this.selectRectLayer || !this.map) return;
				const b = (this.selectRectLayer as { getBounds?: () => { getSouthWest: () => { lat: number; lng: number }; getNorthEast: () => { lat: number; lng: number } } }).getBounds?.();
				if (b) {
					const sw = b.getSouthWest();
					const ne = b.getNorthEast();
					this.selectOuvragesInBounds(L.latLngBounds([sw.lat, sw.lng], [ne.lat, ne.lng]));
				}
				map.removeLayer(this.selectRectLayer);
				this.selectRectLayer = null;
				this.selectRectStart = null;
				this.cdr.markForCheck();
			};
			map.on('mousedown', onMouseDown);
			map.on('mousemove', onMouseMove);
			map.on('mouseup', onMouseUp);
			this.removeSelectRectListeners = (): void => {
				map.off('mousedown', onMouseDown);
				map.off('mousemove', onMouseMove);
				map.off('mouseup', onMouseUp);
				if (this.selectRectLayer && this.map) (this.map as { removeLayer: (l: unknown) => void }).removeLayer(this.selectRectLayer);
				this.selectRectLayer = null;
				this.selectRectStart = null;
				this.removeSelectRectListeners = null;
			};
		});
	}

	private stopSelectRectDrawing(): void {
		if (this.removeSelectRectListeners) {
			this.removeSelectRectListeners();
			this.removeSelectRectListeners = null;
		}
	}

	private selectOuvragesInBounds(selectionBounds: unknown): void {
		this.ouvrageIdToLayer.forEach((entry, key) => {
			const slug = this.selectedLayerSlug;
			if (slug && !key.startsWith(`${slug}:`)) return;
			const layer = entry.layer as { getBounds?: () => unknown; getLatLng?: () => { lat: number; lng: number } };
			let inside = false;
			if (layer.getBounds) {
				const layerBounds = layer.getBounds();
				if (layerBounds && typeof (selectionBounds as { intersects: (b: unknown) => boolean }).intersects === 'function') {
					inside = (selectionBounds as { intersects: (b: unknown) => boolean }).intersects(layerBounds);
				}
			} else if (layer.getLatLng) {
				const latlng = layer.getLatLng();
				if (latlng && typeof (selectionBounds as { contains: (p: unknown) => boolean }).contains === 'function') {
					inside = (selectionBounds as { contains: (p: unknown) => boolean }).contains(latlng);
				}
			}
			if (inside) this.selectedOuvragePks.add(key);
		});
		this.cdr.markForCheck();
	}

	closeOuvrageModal(): void {
		this.ouvrageModalVisible = false;
		this.viewFormInPanel = false;
		this.ouvrageForm = {};
		this.editTargetSlug = null;
		this.editTargetPk = '';
		this.highlightOuvrageOnMap(null);
		this.cdr.markForCheck();
	}

	/** Ferme la vue « Consulter » affichée dans le panneau flottant */
	closeViewFormInPanel(): void {
		this.viewFormInPanel = false;
		this.ouvrageForm = {};
		this.editTargetSlug = null;
		this.editTargetPk = '';
		this.highlightOuvrageOnMap(null);
		this.cdr.markForCheck();
	}

	/** Affiche l’overlay plein écran de succès et lance les confettis */
	showCrudSuccessOverlay(message: string): void {
		this.clearCrudOverlayTimeout();
		this.crudOverlayVisible = true;
		this.crudOverlaySuccess = true;
		this.crudOverlayMessage = message;
		this.cdr.markForCheck();
		setTimeout(() => this.fireConfetti(), 80);
		this.crudOverlayTimeout = setTimeout(() => {
			this.closeCrudOverlay();
			this.crudOverlayTimeout = null;
		}, 2800);
	}

	/** Affiche l’overlay plein écran d’échec (animation) */
	showCrudFailureOverlay(message: string): void {
		this.clearCrudOverlayTimeout();
		this.crudOverlayVisible = true;
		this.crudOverlaySuccess = false;
		this.crudOverlayMessage = message;
		this.cdr.markForCheck();
	}

	/** Ferme l’overlay succès/échec */
	closeCrudOverlay(): void {
		this.clearCrudOverlayTimeout();
		this.crudOverlayVisible = false;
		this.crudOverlaySuccess = false;
		this.crudOverlayMessage = '';
		this.cdr.markForCheck();
	}

	private clearCrudOverlayTimeout(): void {
		if (this.crudOverlayTimeout != null) {
			clearTimeout(this.crudOverlayTimeout);
			this.crudOverlayTimeout = null;
		}
	}

	/** Lance une salve de confettis plein écran */
	private fireConfetti(): void {
		try {
			const duration = 2500;
			const end = Date.now() + duration;
			const colors = ['#22c55e', '#16a34a', '#15803d', '#fbbf24', '#f59e0b', '#3b82f6', '#8b5cf6'];
			const run = () => {
				confetti({
					particleCount: 4,
					angle: 60,
					spread: 55,
					origin: { x: 0 },
					colors
				});
				confetti({
					particleCount: 4,
					angle: 120,
					spread: 55,
					origin: { x: 1 },
					colors
				});
				if (Date.now() < end) requestAnimationFrame(run);
			};
			run();
		} catch {
			// canvas-confetti non disponible ou erreur
		}
	}

	/** Passe de la consultation à l'édition (dans la modale ou dans le panneau) */
	switchToEdit(): void {
		this.ouvrageModalMode = 'edit';
		if (this.viewFormInPanel) {
			this.viewFormInPanel = false;
			this.editFormInPanel = true;
			this.selectedMapPanelAction = 'modify';
		}
		this.cdr.markForCheck();
	}

	/** Indique si la clé est la colonne géométrie (pour textarea dans le template) */
	isGeomKey(key: string): boolean {
		return /^geom$/i.test(key);
	}

	isImageKey(key: string): boolean {
		return /^image($|_)/i.test(key);
	}

	onImageFileSelected(event: Event, key: string): void {
		const input = event.target as HTMLInputElement | null;
		const file = input?.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			this.ouvrageForm[key] = typeof reader.result === 'string' ? reader.result : '';
			this.runOcrAutofillFromImage(file, key);
			if (input) input.value = '';
			this.cdr.markForCheck();
		};
		reader.readAsDataURL(file);
	}

	private runOcrAutofillFromImage(file: File, imageKey: string): void {
		if (!this.gisApi) return;
		this.ocrLoading = true;
		this.ocrMessage = "Analyse OCR en cours...";
		this.cdr.markForCheck();
		this.gisApi.processOcr(file, { language: 'fra+eng', engine: 'tesseract' }).pipe(
			catchError(() => of({ success: false, error: "api_ocr_indisponible", text: '' }))
		).subscribe((res) => {
			this.ocrLoading = false;
			const text = (res?.text ?? '').trim();
			if (!res?.success || !text) {
				this.ocrMessage = "Aucun texte exploitable détecté par l'OCR.";
				this.cdr.markForCheck();
				return;
			}
			const filled = this.fillEmptyFieldsFromOcrText(text, imageKey);
			this.ocrMessage = filled > 0
				? `OCR terminé: ${filled} champ(s) vide(s) pré-rempli(s).`
				: "OCR terminé: aucun champ vide correspondant trouvé.";
			this.cdr.markForCheck();
		});
	}

	private fillEmptyFieldsFromOcrText(text: string, imageKey: string): number {
		const entries = this.parseOcrTextToEntries(text);
		if (entries.length === 0) return 0;
		let filled = 0;
		for (const key of Object.keys(this.ouvrageForm)) {
			if (key === imageKey || this.isImageKey(key) || this.isGeomKey(key)) continue;
			const current = this.ouvrageForm[key];
			if (!(current == null || String(current).trim() === '')) continue;
			const value = this.findBestOcrValueForField(key, entries);
			if (!value) continue;
			this.ouvrageForm[key] = value;
			filled += 1;
		}
		return filled;
	}

	private parseOcrTextToEntries(text: string): Array<{ key: string; value: string }> {
		const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
		const out: Array<{ key: string; value: string }> = [];
		for (const line of lines) {
			let m = line.match(/^([^:=\-]{2,80})\s*[:=\-]\s*(.{1,200})$/);
			if (m) {
				out.push({ key: this.normalizeSearchText(m[1]), value: m[2].trim() });
				continue;
			}
			m = line.match(/^([A-Za-z0-9_À-ÿ\s]{3,80})\s{2,}(.{1,200})$/);
			if (m) {
				out.push({ key: this.normalizeSearchText(m[1]), value: m[2].trim() });
			}
		}
		return out;
	}

	private findBestOcrValueForField(fieldKey: string, entries: Array<{ key: string; value: string }>): string | null {
		const normKey = this.normalizeSearchText(fieldKey);
		const normLabel = this.normalizeSearchText(this.formatOuvrageLabel(fieldKey));
		for (const e of entries) {
			if (e.key === normKey || e.key === normLabel) return e.value;
		}
		for (const e of entries) {
			if (e.key.includes(normKey) || normKey.includes(e.key)) return e.value;
			if (e.key.includes(normLabel) || normLabel.includes(e.key)) return e.value;
		}
		return null;
	}

	private normalizeSearchText(value: string): string {
		return value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();
	}

	clearImageField(key: string): void {
		this.ouvrageForm[key] = '';
		this.cdr.markForCheck();
	}

	getImagePreviewSrc(key: string): string | null {
		return this.getImagePreviewFromValue(this.ouvrageForm[key]);
	}

	getImageDisplayValue(key: string): string {
		const val = this.ouvrageForm[key];
		if (val == null || val === '') return '';
		return String(val);
	}

	getImagePreviewFromValue(value: unknown): string | null {
		if (typeof value !== 'string' || !value.trim()) return null;
		const s = value.trim();
		if (s.startsWith('data:image/')) return s;
		if (/^https?:\/\//i.test(s)) return s;
		return null;
	}

	/** Libellé d'affichage pour un champ (lecture modale) */
	formatOuvrageLabel(key: string): string {
		const labels: Record<string, string> = {
			objectid: 'Identifiant',
			id: 'ID',
			assetid: 'ID actif',
			gid: 'ID',
			globalid: 'Global ID',
			assetgroup: 'Groupe d\'actif',
			assettype: 'Type d\'actif',
			name: 'Nom',
			nom: 'Nom',
			image: 'Image',
			code: 'Code',
			username: 'Utilisateur',
			section: 'Section',
			geom: 'Géométrie',
			Geom: 'Géométrie',
			description: 'Description',
			type: 'Type',
			statut: 'Statut',
			created_date: 'Date de création',
			created_user: 'Créé par',
			last_edited_date: 'Dernière modification',
			last_edited_user: 'Modifié par',
			date_creation: 'Date de création',
			date_maj: 'Date de mise à jour',
			shape_length: 'Longueur (m)',
			shape_area: 'Surface',
			distributionstationcode: 'Code poste',
			transformercode: 'Code transformateur',
			t: 'Type',
		};
		const k = key.toLowerCase();
		return labels[key] ?? labels[k] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	/** Sections du formulaire d’édition (même structure que la vue entité : Identification, Audit, Technique, Autres, + Géométrie) */
	getOuvrageEditSections(): { title: string; icon: string; keys: string[] }[] {
		const sections = this.getOuvrageViewSections();
		const geomKeys = this.getOuvrageFormKeys().filter((k) => this.isGeomKey(k));
		if (geomKeys.length > 0) {
			sections.push({ title: 'Géométrie (WKT)', icon: 'fa-map-marker', keys: geomKeys });
		}
		return sections;
	}

	/** Valeur affichée en lecture seule (détails, troncature si très longue) */
	formatOuvrageFormValue(key: string): string {
		const v = this.ouvrageForm[key];
		if (v == null || v === '') return '—';
		const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
		return s.length < 500 ? s : s.slice(0, 200) + '…';
	}

	/** Valeur brute de la géométrie (pour le bloc dédié, non tronquée) */
	getOuvrageGeomValue(): string {
		const keys = Object.keys(this.ouvrageForm).filter((k) => /^geom$/i.test(k));
		if (keys.length === 0) return '';
		const v = this.ouvrageForm[keys[0]];
		if (v == null) return '—';
		return typeof v === 'object' ? JSON.stringify(v) : String(v);
	}

	/** Clés pour la vue « Consulter » (sans geom, ordre lisible) */
	getOuvrageViewKeys(): string[] {
		return this.getOuvrageFormKeys().filter((k) => !/^geom$/i.test(k));
	}

	/** Regroupe les champs en sections pour la modale (Identification, Audit, Technique, Autres) */
	getOuvrageViewSections(): { title: string; icon: string; keys: string[] }[] {
		const keys = this.getOuvrageViewKeys();
		const idKeys = ['id', 'objectid', 'assetid', 'gid', 'globalid', 'assetgroup', 'assettype', 'name', 'nom', 'code', 'username', 'section'];
		const auditKeys = ['created_date', 'created_user', 'last_edited_date', 'last_edited_user'];
		const techKeys = ['shape_length', 'shape_area', 'type', 't', 'statut', 'description', 'distributionstationcode', 'transformercode'];
		const id = keys.filter((k) => idKeys.includes(k.toLowerCase()));
		const audit = keys.filter((k) => auditKeys.includes(k.toLowerCase()));
		const tech = keys.filter((k) => techKeys.includes(k.toLowerCase()));
		const rest = keys.filter((k) => !idKeys.includes(k.toLowerCase()) && !auditKeys.includes(k.toLowerCase()) && !techKeys.includes(k.toLowerCase()));
		const sections: { title: string; icon: string; keys: string[] }[] = [];
		if (id.length) sections.push({ title: 'Identification', icon: 'fa-fingerprint', keys: id });
		if (audit.length) sections.push({ title: 'Audit', icon: 'fa-history', keys: audit });
		if (tech.length) sections.push({ title: 'Technique', icon: 'fa-cog', keys: tech });
		if (rest.length) sections.push({ title: 'Autres', icon: 'fa-list', keys: rest });
		return sections;
	}

	/** Formate une valeur pour l'affichage (dates ISO → lisible) */
	formatOuvrageValueDisplay(key: string): string {
		const v = this.ouvrageForm[key];
		if (v == null || v === '') return '—';
		const s = String(v);
		if (/date|_date$/i.test(key) && /^\d{4}-\d{2}-\d{2}/.test(s)) {
			const d = new Date(s);
			if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
		}
		return s.length < 500 ? s : s.slice(0, 200) + '…';
	}

	/** Construit le HTML du popup carte au clic sur un ouvrage (avec boutons Modifier / Supprimer) */
	buildPopupContent(props: Record<string, unknown>): string {
		if (!props || typeof props !== 'object') return '<div class="map-popup"><div class="map-popup-body">Ouvrage</div></div>';
		const { _layerSlug, geom, Geom, ...rest } = props;
		const imageEntry = Object.entries(rest).find(([k, v]) => this.isImageKey(k) && this.getImagePreviewFromValue(v));
		const imageSrc = imageEntry ? this.getImagePreviewFromValue(imageEntry[1]) : null;
		const rawEntries = Object.entries(rest)
			.filter(([k, v]) => k !== '_layerSlug' && !this.isImageKey(k) && v != null && String(v).trim() !== '')
			.map(([k, v]) => ({
				key: k,
				label: this.formatOuvrageLabel(k),
				val: this.formatPopupValue(k, v)
			}));
		const ordered = this.orderPopupEntries(rawEntries);
		const title = _layerSlug ? String(_layerSlug).replace(/-/g, ' ').replace(/_/g, ' ') : 'Ouvrage';
		const titleFormatted = title.replace(/\b\w/g, (c) => c.toUpperCase());
		const slug = _layerSlug != null ? this.escapeHtml(String(_layerSlug)) : '';
		const pk = this.escapeHtml(this.getPkValue(props));
		const pkKey = this.escapeHtml(this.getPkKey(props));
		let html = '<div class="map-popup">';
		html += `<div class="map-popup-header"><i class="fa fa-info-circle map-popup-icon"></i><span>${this.escapeHtml(titleFormatted)}</span></div>`;
		html += '<div class="map-popup-body">';
		if (imageSrc) {
			html += `<div class="map-popup-image-wrap"><img class="map-popup-image" src="${this.escapeHtml(imageSrc)}" alt="Image ouvrage"></div>`;
		}
		ordered.forEach((e, i) => {
			html += `<div class="map-popup-row ${i % 2 === 0 ? 'map-popup-row--even' : ''}"><span class="map-popup-key">${this.escapeHtml(e.label)}</span><span class="map-popup-val">${this.escapeHtml(e.val)}</span></div>`;
		});
		html += '</div>';
		html += '<div class="map-popup-actions">';
		html += `<button type="button" class="map-popup-btn map-popup-btn--ocr" data-slug="${slug}" data-pk="${pk}" data-pk-key="${pkKey}" title="Appliquer OCR"><i class="fa fa-eye"></i> Appliquer OCR</button>`;
		html += `<button type="button" class="map-popup-btn map-popup-btn--edit" data-slug="${slug}" data-pk="${pk}" data-pk-key="${pkKey}" title="Modifier"><i class="fa fa-pencil"></i> Modifier</button>`;
		html += `<button type="button" class="map-popup-btn map-popup-btn--delete" data-slug="${slug}" data-pk="${pk}" data-pk-key="${pkKey}" title="Supprimer"><i class="fa fa-trash"></i> Supprimer</button>`;
		html += '</div></div>';
		return html;
	}

	private getImageFromRow(row: Record<string, unknown>): { key: string; src: string } | null {
		for (const [k, v] of Object.entries(row)) {
			if (!this.isImageKey(k)) continue;
			const src = this.getImagePreviewFromValue(v);
			if (src) return { key: k, src };
		}
		return null;
	}

	private dataUrlToFile(dataUrl: string, filename: string): File | null {
		const m = dataUrl.match(/^data:(.*?);base64,(.*)$/);
		if (!m) return null;
		const mime = m[1] || 'image/jpeg';
		const b64 = m[2] || '';
		const bin = atob(b64);
		const arr = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
		const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
		return new File([arr], `${filename}.${ext}`, { type: mime });
	}

	private async imageSrcToFile(imageSrc: string, filename: string): Promise<File | null> {
		if (imageSrc.startsWith('data:image/')) return this.dataUrlToFile(imageSrc, filename);
		if (/^https?:\/\//i.test(imageSrc)) {
			try {
				const resp = await fetch(imageSrc);
				if (!resp.ok) return null;
				const blob = await resp.blob();
				return new File([blob], `${filename}.jpg`, { type: blob.type || 'image/jpeg' });
			} catch {
				return null;
			}
		}
		return null;
	}

	openImageViewer(src: string, title = 'Image'): void {
		if (!src) return;
		this.imageViewerSrc = src;
		this.imageViewerTitle = title;
		this.imageViewerVisible = true;
		this.cdr.markForCheck();
	}

	private openPopupOcr(slug: string, pk: string, pkKey: string): void {
		if (!this.gisApi) return;
		this.popupOcrVisible = true;
		this.popupOcrLoading = true;
		this.popupOcrText = '';
		this.popupOcrTitle = `OCR - ${slug} (${pk})`;
		const target = this.resolveCrudTarget(slug, { _layerSlug: slug, [pkKey]: pk });
		if (!target.slug || !target.pk) {
			this.popupOcrLoading = false;
			this.popupOcrText = "Impossible d'identifier l'ouvrage cible.";
			this.cdr.markForCheck();
			return;
		}
		const cacheKey = `${target.slug}:${target.pk}`;
		this.popupOcrTargetSlug = target.slug;
		this.popupOcrTargetPk = target.pk;
		const consumeRow = async (row: Record<string, unknown> | null): Promise<void> => {
			if (!row) {
				this.popupOcrLoading = false;
				this.popupOcrText = "Ouvrage introuvable.";
				this.cdr.markForCheck();
				return;
			}
			const image = this.getImageFromRow(row);
			if (!image) {
				this.popupOcrLoading = false;
				this.popupOcrText = "Aucune image disponible sur cet ouvrage.";
				this.cdr.markForCheck();
				return;
			}
			this.popupOcrSourceRow = row;
			this.popupOcrFieldOptions = this.buildPopupOcrFieldOptions(row);
			const file = await this.imageSrcToFile(image.src, `${target.slug}-${target.pk}`);
			if (!file) {
				this.popupOcrLoading = false;
				this.popupOcrText = "Impossible de convertir l'image pour l'OCR.";
				this.cdr.markForCheck();
				return;
			}
			this.gisApi!.processOcr(file, { language: 'fra+eng', engine: 'tesseract' }).pipe(
				catchError(() => of({ success: false, text: '', error: "api_ocr_indisponible" }))
			).subscribe((res) => {
				this.popupOcrLoading = false;
				const text = (res?.text ?? '').trim();
				this.popupOcrText = text || "Aucun texte détecté dans l'image.";
				this.popupOcrMappings = this.buildPopupOcrMappings(this.popupOcrText, this.popupOcrFieldOptions);
				this.cdr.markForCheck();
			});
		};
		const cached = this.popupDetailsCache.get(cacheKey);
		if (cached) {
			void consumeRow(cached);
			return;
		}
		this.gisApi.getById(target.slug, target.pk).pipe(
			catchError(() => of(null))
		).subscribe((full) => {
			if (full) this.popupDetailsCache.set(cacheKey, full as Record<string, unknown>);
			void consumeRow((full as Record<string, unknown> | null) ?? null);
		});
	}

	private buildPopupOcrFieldOptions(row: Record<string, unknown>): Array<{ key: string; label: string }> {
		return Object.keys(row)
			.filter((k) => !this.isGeomKey(k) && !this.isImageKey(k) && !/^_layerSlug$/i.test(k))
			.map((k) => ({ key: k, label: this.formatOuvrageLabel(k) }))
			.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
	}

	private buildPopupOcrMappings(
		text: string,
		options: Array<{ key: string; label: string }>
	): Array<{ text: string; field: string }> {
		const lines = text
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter((l) => l.length > 0);
		const unique: string[] = [];
		for (const line of lines) {
			if (!unique.includes(line)) unique.push(line);
		}
		return unique.map((line) => ({ text: line, field: this.guessFieldForOcrLine(line, options) }));
	}

	private guessFieldForOcrLine(line: string, options: Array<{ key: string; label: string }>): string {
		const normLine = this.normalizeSearchText(line);
		for (const opt of options) {
			const nk = this.normalizeSearchText(opt.key);
			const nl = this.normalizeSearchText(opt.label);
			if (normLine.startsWith(nk + ' ') || normLine.startsWith(nl + ' ')) return opt.key;
			if (normLine.includes(nk) || normLine.includes(nl)) return opt.key;
		}
		return '';
	}

	applyPopupOcrMappings(): void {
		if (!this.popupOcrSourceRow) return;
		const next = { ...this.popupOcrSourceRow };
		let count = 0;
		for (const m of this.popupOcrMappings) {
			const field = (m.field || '').trim();
			const text = (m.text || '').trim();
			if (!field || !text) continue;
			next[field] = text;
			count += 1;
		}
		this.ouvrageForm = next;
		this.ouvrageModalMode = 'edit';
		this.ouvrageModalVisible = true;
		this.viewFormInPanel = false;
		this.editFormInPanel = false;
		this.createFormInPanel = false;
		this.popupOcrVisible = false;
		if (this.popupOcrTargetSlug) this.editTargetSlug = this.popupOcrTargetSlug;
		if (this.popupOcrTargetPk) this.editTargetPk = this.popupOcrTargetPk;
		this.ocrMessage = count > 0 ? `OCR appliqué: ${count} champ(s) renseigné(s).` : "Aucun champ sélectionné.";
		this.cdr.markForCheck();
	}

	private formatPopupValue(key: string, v: unknown): string {
		if (v == null || v === '') return '—';
		const s = typeof v === 'object' && (v as { toISOString?: () => string }).toISOString
			? (v as { toISOString: () => string }).toISOString()
			: String(v);
		if (/date|_date$/i.test(key) && /^\d{4}-\d{2}-\d{2}/.test(s)) {
			const d = new Date(s);
			if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
		}
		return s.length > 80 ? s.slice(0, 77) + '…' : s;
	}

	private orderPopupEntries(entries: { key: string; label: string; val: string }[]): { key: string; label: string; val: string }[] {
		const priority = ['id', 'objectid', 'assetid', 'name', 'nom', 'code', 'username', 'section', 'assetgroup', 'assettype', 'shape_length', 'shape_area', 'created_date', 'created_user', 'last_edited_date', 'last_edited_user', 'globalid'];
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

	private escapeHtml(s: string): string {
		const div = document.createElement('div');
		div.textContent = s;
		return div.innerHTML;
	}

	private popupHasImage(props: Record<string, unknown>): boolean {
		return Object.entries(props).some(([k, v]) => this.isImageKey(k) && !!this.getImagePreviewFromValue(v));
	}

	private bindPopupWithLazyImage(
		layer: { bindPopup: (content: string, opts?: { maxWidth?: number }) => void; on?: (ev: string, fn: () => void) => void; setPopupContent?: (content: string) => void },
		slug: string,
		props: Record<string, unknown>
	): void {
		layer.bindPopup(this.buildPopupContent(props), { maxWidth: 380 });
		if (!layer.on || !this.gisApi || this.popupHasImage(props)) return;
		const target = this.resolveCrudTarget(slug, props);
		if (!target.slug || !target.pk) return;
		const cacheKey = `${target.slug}:${target.pk}`;
		layer.on('popupopen', () => {
			const cached = this.popupDetailsCache.get(cacheKey);
			if (cached) {
				const merged = { ...props, ...cached, _layerSlug: props['_layerSlug'] ?? slug };
				layer.setPopupContent?.(this.buildPopupContent(merged));
				return;
			}
			this.gisApi!.getById(target.slug!, target.pk).pipe(
				catchError(() => of(null))
			).subscribe((full) => {
				if (!full) return;
				const details = full as Record<string, unknown>;
				this.popupDetailsCache.set(cacheKey, details);
				const merged = { ...props, ...details, _layerSlug: props['_layerSlug'] ?? slug };
				layer.setPopupContent?.(this.buildPopupContent(merged));
			});
		});
	}

	/** Indique si l'ouvrage a une géométrie à afficher */
	hasOuvrageGeom(): boolean {
		return this.getOuvrageGeomValue().length > 0 && this.getOuvrageGeomValue() !== '—';
	}

	/** Clés du formulaire pour la modale (ordre stable, geom en dernier) */
	getOuvrageFormKeys(): string[] {
		const keys = Object.keys(this.ouvrageForm);
		// Champ image toujours disponible pour l'ajout/édition d'image, même si absent du payload source.
		if (!keys.some((k) => /^image($|_)/i.test(k))) keys.push('image');
		const geomKeys = keys.filter((k) => /^geom$/i.test(k));
		const rest = keys.filter((k) => !/^geom$/i.test(k)).sort();
		return [...rest, ...geomKeys];
	}

	/** Enregistre (création ou mise à jour) */
	saveOuvrage(): void {
		const target =
			this.ouvrageModalMode === 'edit' && this.editTargetSlug
				? { slug: this.editTargetSlug, pk: this.editTargetPk }
				: this.resolveCrudTarget(this.selectedLayerSlug, this.ouvrageForm);
		const slug = target.slug;
		if (!slug || !this.gisApi) return;
		this.crudLoading = true;
		this.cdr.markForCheck();
		const body = { ...this.ouvrageForm };
		this.gisApi.createOrUpdate(slug, body).pipe(
			catchError((err) => {
				this.crudLoading = false;
				const message = err?.error?.detail || err?.message || 'Erreur enregistrement.';
				this.modelResult = { success: false, message };
				this.showCrudFailureOverlay(message);
				this.cdr.markForCheck();
				return of(null);
			})
		).subscribe((res) => {
			this.crudLoading = false;
			if (res) {
				if (target.pk) this.popupDetailsCache.set(`${slug}:${target.pk}`, res as Record<string, unknown>);
				this.modelResult = { success: true, message: this.ouvrageModalMode === 'create' ? 'Ouvrage créé.' : 'Ouvrage mis à jour.' };
				this.showCrudSuccessOverlay(this.modelResult.message);
				if (this.createFormInPanel) {
					this.closeCreateFormInPanel();
				} else if (this.editFormInPanel) {
					this.closeEditFormInPanel();
				} else {
					this.closeOuvrageModal();
					this.loadOuvragesForLayer();
					if (this.lastLoadedModelSlugs.length > 0) this.loadModelOnMap(this.lastLoadedModelSlugs);
				}
			}
			this.cdr.markForCheck();
		});
	}

	/** Ouvre la modale de confirmation de suppression */
	openDeleteConfirm(ouvrage: Record<string, unknown>): void {
		this.ouvrageToDelete = ouvrage;
		this.deleteConfirmVisible = true;
		this.cdr.markForCheck();
	}

	/** Ferme la modale de confirmation de suppression sans supprimer */
	closeDeleteConfirm(): void {
		this.deleteConfirmVisible = false;
		this.ouvrageToDelete = null;
		this.cdr.markForCheck();
	}

	/** Supprime l'ouvrage après confirmation (appelé depuis la modale) ; affiche l'animation succès/échec */
	confirmDeleteOuvrage(): void {
		const ouvrage = this.ouvrageToDelete;
		this.closeDeleteConfirm();
		if (!ouvrage) return;
		const slug = this.selectedLayerSlug;
		const pk = this.getPkValue(ouvrage);
		if (!slug || !pk || !this.gisApi) return;
		this.crudLoading = true;
		this.cdr.markForCheck();
		this.gisApi.deleteRow(slug, pk).pipe(
			catchError((err) => {
				this.crudLoading = false;
				const message = err?.error?.detail || err?.message || 'Erreur suppression.';
				this.modelResult = { success: false, message };
				this.showCrudFailureOverlay(message);
				this.cdr.markForCheck();
				return of(null);
			})
		).subscribe((res) => {
			this.crudLoading = false;
			if (res?.deleted) {
				this.modelResult = { success: true, message: 'Ouvrage supprimé.' };
				this.showCrudSuccessOverlay('Ouvrage supprimé.');
				this.loadOuvragesForLayer();
				if (this.lastLoadedModelSlugs.length > 0) this.loadModelOnMap(this.lastLoadedModelSlugs);
			}
			this.cdr.markForCheck();
		});
	}

	/** Nombre d'ouvrages sélectionnés pour la suppression multiple */
	get selectedOuvragesCount(): number {
		return this.selectedOuvragePks.size;
	}

	/** Indique si un ouvrage est sélectionné pour la suppression multiple */
	isOuvrageSelected(ouvrage: Record<string, unknown>): boolean {
		if (!this.selectedLayerSlug) return false;
		return this.selectedOuvragePks.has(`${this.selectedLayerSlug}:${this.getPkValue(ouvrage)}`);
	}

	/** Bascule la sélection d'un ouvrage pour la suppression multiple */
	toggleOuvrageSelection(ouvrage: Record<string, unknown>): void {
		if (!this.selectedLayerSlug) return;
		const key = `${this.selectedLayerSlug}:${this.getPkValue(ouvrage)}`;
		if (this.selectedOuvragePks.has(key)) {
			this.selectedOuvragePks.delete(key);
		} else {
			this.selectedOuvragePks.add(key);
		}
		this.cdr.markForCheck();
	}

	/** Sélectionne tous les ouvrages de la liste courante */
	selectAllOuvrages(): void {
		if (!this.selectedLayerSlug) return;
		this.ouvragesList.forEach((o) => this.selectedOuvragePks.add(`${this.selectedLayerSlug}:${this.getPkValue(o)}`));
		this.cdr.markForCheck();
	}

	/** Désélectionne tous les ouvrages */
	clearOuvrageSelection(): void {
		this.selectedOuvragePks.clear();
		this.cdr.markForCheck();
	}

	/** Ouvre la modale de confirmation de suppression multiple */
	openBulkDeleteConfirm(): void {
		if (this.selectedOuvragePks.size === 0) return;
		this.bulkDeleteConfirmVisible = true;
		this.cdr.markForCheck();
	}

	/** Ferme la modale de confirmation de suppression multiple */
	closeBulkDeleteConfirm(): void {
		this.bulkDeleteConfirmVisible = false;
		this.cdr.markForCheck();
	}

	/** Supprime tous les ouvrages sélectionnés après confirmation */
	confirmBulkDeleteOuvrages(): void {
		if (!this.gisApi || this.selectedOuvragePks.size === 0) {
			this.closeBulkDeleteConfirm();
			return;
		}
		const keys = Array.from(this.selectedOuvragePks);
		this.closeBulkDeleteConfirm();
		this.selectedOuvragePks.clear();
		this.crudLoading = true;
		this.cdr.markForCheck();
		const deleteCalls = keys.map((key) => {
			const i = key.indexOf(':');
			const slug = i >= 0 ? key.substring(0, i) : this.selectedLayerSlug ?? '';
			const pk = i >= 0 ? key.substring(i + 1) : key;
			return slug && pk ? this.gisApi!.deleteRow(slug, pk).pipe(map((r) => ({ pk, ...r })), catchError(() => of({ pk, deleted: false }))) : of({ pk: key, deleted: false });
		});
		forkJoin(deleteCalls).subscribe((results) => {
			this.crudLoading = false;
			const deleted = results.filter((r) => r.deleted).length;
			const failed = results.length - deleted;
			if (failed === 0) {
				this.modelResult = { success: true, message: `${deleted} ouvrage(s) supprimé(s).` };
				this.showCrudSuccessOverlay(`${deleted} ouvrage(s) supprimé(s).`);
			} else {
				this.modelResult = { success: false, message: `${deleted} supprimé(s), ${failed} échec(s).` };
				this.showCrudFailureOverlay(this.modelResult.message);
			}
			this.loadOuvragesForLayer();
			if (this.lastLoadedModelSlugs.length > 0) this.loadModelOnMap(this.lastLoadedModelSlugs);
			this.cdr.markForCheck();
		});
	}

	/** Exporter le modèle (fichier ou API) */
	exporterModele(): void {
		this.modelResult = null;
		this.exportLoading = true;
		this.cdr.markForCheck();
		this.gisApi.exportModel(this.getModelisationParams()).pipe(
			catchError((err) => {
				this.exportLoading = false;
				this.modelResult = { success: false, message: err?.error?.detail || err?.message || "Erreur export." };
				this.cdr.markForCheck();
				return of(null);
			})
		).subscribe((res) => {
			this.exportLoading = false;
			if (res) this.modelResult = { success: res.success, message: res.message ?? '' };
			this.cdr.markForCheck();
		});
	}

	/** Lancer un calcul (ex. load flow, vérification) */
	lancerCalcul(): void {
		this.modelResult = null;
		this.calcLoading = true;
		this.cdr.markForCheck();
		this.gisApi.runCalculation(this.getModelisationParams()).pipe(
			catchError((err) => {
				this.calcLoading = false;
				this.modelResult = { success: false, message: err?.error?.detail || err?.message || 'Erreur lors du calcul.' };
				this.cdr.markForCheck();
				return of(null);
			})
		).subscribe((res) => {
			this.calcLoading = false;
			if (res) this.modelResult = { success: res.success, message: res.message ?? '' };
			this.cdr.markForCheck();
		});
	}

	private initMap(): void {
		if (!this.mapContainer?.nativeElement) return;
		import('leaflet').then((L: { default: unknown }) => {
			const Lx = L.default as {
				map: (el: HTMLElement, opts: object) => { invalidateSize?: () => void };
				tileLayer: (url: string, opts: object) => { addTo: (m: unknown) => unknown };
				control: { zoom: (opts: object) => { addTo: (m: unknown) => unknown } };
				layerGroup: () => { addTo: (m: unknown) => unknown; addLayer: (l: unknown) => void; clearLayers: () => void };
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
			this.layerGroup = Lx.layerGroup().addTo(this.map) as { addLayer: (l: unknown) => void; removeLayer: (l: unknown) => void; clearLayers: () => void };
			this.highlightLayerGroup = Lx.layerGroup().addTo(this.map) as { addLayer: (l: unknown) => void; clearLayers: () => void };
			if (this.couchesModele.length > 0) {
				setTimeout(() => this.loadAllLayersOnMap(), 350);
			}
			// Pane dédié au dessin en cours, au-dessus des autres couches (z-index élevé)
			const mapWithPane = this.map as { createPane?: (name: string) => HTMLElement };
			let drawOpts: { pane?: string } = {};
			if (mapWithPane.createPane) {
				const drawPane = mapWithPane.createPane('drawPane');
				if (drawPane) drawPane.style.zIndex = '600';
				drawOpts = { pane: 'drawPane' };
			}
			this.drawLayerGroup = (Lx.layerGroup as (opts?: object) => { addTo: (m: unknown) => unknown; addLayer: (l: unknown) => void; clearLayers: () => void })(drawOpts).addTo(this.map) as { addLayer: (l: unknown) => void; clearLayers: () => void };
			// Pane pour les suggestions de placement (au-dessus du dessin)
			let suggestOpts: { pane?: string } = {};
			if (mapWithPane.createPane) {
				const suggestPane = mapWithPane.createPane('suggestPane');
				if (suggestPane) {
					suggestPane.style.zIndex = '650';
					suggestPane.classList.add('modelisation-suggest-pane');
				}
				suggestOpts = { pane: 'suggestPane' };
				const selPane = mapWithPane.createPane('selectPane');
				if (selPane) selPane.style.zIndex = '620';
			}
			this.suggestionLayerGroup = (Lx.layerGroup as (opts?: object) => { addTo: (m: unknown) => unknown; addLayer: (l: unknown) => void; clearLayers: () => void })(suggestOpts).addTo(this.map) as { addLayer: (l: unknown) => void; clearLayers: () => void };
			// Recharger les suggestions (lignes BT, branchements proposés) au déplacement de la carte en mode Créer
			const mapOn = (this.map as { on?: (ev: string, fn: () => void) => void }).on;
			if (mapOn) {
				mapOn.call(this.map, 'moveend', () => {
					if (this.suggestMoveEndTimeout) clearTimeout(this.suggestMoveEndTimeout);
					this.suggestMoveEndTimeout = setTimeout(() => {
						this.suggestMoveEndTimeout = null;
						if (this.createDrawingMode && this.selectedLayerSlug && this.gisApi && this.getMapCenter() && this.suggestionLayerGroup) {
							this.loadCreateSuggestions();
						}
					}, 400);
				});
			}
			this.popupButtonsClickListener = (e: Event): void => {
				const imageTarget = (e.target as HTMLElement).closest?.('.map-popup-image');
				if (imageTarget && imageTarget instanceof HTMLImageElement) {
					this.ngZone.run(() => {
						const src = imageTarget.getAttribute('src') ?? '';
						this.openImageViewer(src, 'Image ouvrage');
					});
					return;
				}
				const target = (e.target as HTMLElement).closest?.('.map-popup-btn--ocr, .map-popup-btn--edit, .map-popup-btn--delete');
				if (!target || !(target instanceof HTMLElement)) return;
				const slug = target.getAttribute?.('data-slug');
				const pk = target.getAttribute?.('data-pk');
				const pkKey = target.getAttribute?.('data-pk-key') ?? 'gid';
				if (!slug || !pk) return;
				const props: Record<string, unknown> = { _layerSlug: slug, [pkKey]: pk };
				this.ngZone.run(() => {
					if (target.classList.contains('map-popup-btn--ocr')) {
						this.openPopupOcr(slug, pk, pkKey);
					} else if (target.classList.contains('map-popup-btn--edit')) {
						this.openEditFromMapClick(slug, props);
					} else if (target.classList.contains('map-popup-btn--delete')) {
						this.openDeleteFromMapClick(slug, props);
					}
					this.cdr.markForCheck();
				});
			};
			this.mapContainer.nativeElement.addEventListener('click', this.popupButtonsClickListener);
		});
	}

	/**
	 * Affiche les ouvrages déjà chargés (liste) sur la carte pour une couche.
	 */
	private drawOuvragesOnMap(slug: string, rows: Record<string, unknown>[]): void {
		if (!this.map || !this.layerGroup || !rows?.length) return;
		this.layerGroup.clearLayers();
		this.ouvrageIdToLayer.clear();
		this.highlightedOuvrageKey = null;
		const color = this.couchesModele.find((m) => m.id === slug)?.color ?? MAP_COLORS[0];
		Promise.all([import('leaflet'), import('wellknown').then((w) => w.default ?? w)]).then(([LModule, wellknown]) => {
			const leaflet = (LModule as { default: unknown }).default as {
				geoJSON: (f: object, opts: object) => { eachLayer: (fn: (layer: unknown) => void) => void };
				circleMarker: (latlng: unknown, opts: object) => unknown;
				layerGroup: () => { addLayer: (l: unknown) => void };
			};
			const group = this.layerGroup as { addLayer: (l: unknown) => void };
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
			const features: { type: 'Feature'; geometry: unknown; properties: object }[] = [];
			for (const row of rows) {
				const wktRaw = row['geom'] ?? row['Geom'];
				if (wktRaw == null || typeof wktRaw !== 'string') continue;
				const wkt = normalizeWkt(wktRaw);
				if (!wkt || /EMPTY\s*\)?\s*$/i.test(wkt)) continue;
				try {
					const geom = parseWkt(wkt);
					if (!geom || typeof geom !== 'object') continue;
					const { geom: _g, Geom: _G, ...rest } = row as Record<string, unknown>;
					features.push({ type: 'Feature', geometry: geom, properties: { _layerSlug: slug, ...rest } });
				} catch {
					// ignore
				}
			}
			if (features.length === 0) {
				this.cdr.markForCheck();
				return;
			}
			const isLine = isLineTable(slug);
			const style = { color, weight: isLine ? 5 : 2, opacity: 0.9, fillColor: color, fillOpacity: 0.5 };
			const slugGroup = (leaflet as { layerGroup?: () => { addLayer: (l: unknown) => void } }).layerGroup?.();
			if (!slugGroup) {
				this.cdr.markForCheck();
				return;
			}
			const fc = { type: 'FeatureCollection' as const, features };
			const self = this;
			const geoJsonLayer = leaflet.geoJSON(fc, {
				style: () => style,
				pointToLayer: (_: unknown, latlng: unknown) => leaflet.circleMarker(latlng, { ...style, radius: 8 }),
				onEachFeature: (feature: { properties?: Record<string, unknown> }, layer: { bindPopup: (content: string, opts?: { maxWidth?: number }) => void; on?: (ev: string, fn: () => void) => void }) => {
					const props = feature.properties ?? {};
					self.bindPopupWithLazyImage(layer, slug, props);
					if (layer.on) {
						layer.on('click', () => {
							const layerSlug = String(props['_layerSlug'] ?? slug);
							if (self.selectedMapPanelAction === 'modify') {
								self.openEditFromMapClick(layerSlug, props);
							} else if (self.selectedMapPanelAction === 'delete') {
								self.openDeleteFromMapClick(layerSlug, props);
							}
						});
					}
				}
			});
			let bounds: unknown = null;
			geoJsonLayer.eachLayer((l: unknown) => {
				(slugGroup as { addLayer: (l: unknown) => void }).addLayer(l);
				const withBounds = l as { getBounds?: () => unknown };
				const withFeature = l as { feature?: { properties?: Record<string, unknown> } };
				const props = withFeature.feature?.properties ?? {};
				const pk = self.getPkValue(props);
				if (pk) {
					self.ouvrageIdToLayer.set(`${slug}:${pk}`, {
						layer: l as { setStyle: (s: object) => void; getBounds?: () => unknown; bringToFront?: () => void },
						defaultColor: color,
						isLine
					});
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
			const m = this.map as { fitBounds?: (b: unknown, o?: object) => void; invalidateSize?: () => void };
			if (m?.invalidateSize) m.invalidateSize();
			if (bounds && m?.fitBounds) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
			this.cdr.markForCheck();
		});
	}

	/**
	 * Met en évidence un ouvrage sur la carte (consulter) ou retire la mise en évidence.
	 */
	highlightOuvrageOnMap(pkValue: string | null): void {
		const slug = this.selectedLayerSlug;
		this.stopBlink();
		if (this.highlightedOuvrageKey) {
			const prev = this.ouvrageIdToLayer.get(this.highlightedOuvrageKey);
			if (prev?.layer?.setStyle) {
				prev.layer.setStyle({
					color: prev.defaultColor,
					weight: prev.isLine ? 5 : 2,
					opacity: 0.9,
					fillColor: prev.defaultColor,
					fillOpacity: 0.5
				});
			}
			this.highlightedOuvrageKey = null;
		}
		if (!pkValue || !slug || !this.map) {
			this.cdr.markForCheck();
			return;
		}
		const key = `${slug}:${pkValue}`;
		const entry = this.ouvrageIdToLayer.get(key);
		if (!entry?.layer) {
			this.cdr.markForCheck();
			return;
		}
		const highlightColor = '#eab308';
		entry.layer.setStyle({
			color: highlightColor,
			weight: entry.isLine ? 10 : 5,
			opacity: 1,
			fillColor: highlightColor,
			fillOpacity: 0.7
		});
		if (entry.layer.bringToFront) entry.layer.bringToFront();
		this.highlightedOuvrageKey = key;

		const m = this.map as { fitBounds?: (b: unknown, o?: object) => void; setView?: (center: [number, number] | unknown, zoom?: number, opts?: object) => void; invalidateSize?: () => void };
		const b = entry.layer.getBounds?.();
		const getCenter = (): [number, number] | null => {
			if (b && typeof (b as { getCenter?: () => unknown }).getCenter === 'function') {
				const c = (b as { getCenter: () => { lat: number; lng: number } }).getCenter();
				return [c.lat, c.lng];
			}
			const latLng = (entry.layer as { getLatLng?: () => { lat: number; lng: number } }).getLatLng?.();
			if (latLng) return [latLng.lat, latLng.lng];
			return null;
		};
		const center = getCenter();
		const zoomToOuvrage = (): void => {
			if (!m) return;
			if (m.invalidateSize) m.invalidateSize();
			const sw = b && (b as { getSouthWest?: () => { lat: number; lng: number } }).getSouthWest?.();
			const ne = b && (b as { getNorthEast?: () => { lat: number; lng: number } }).getNorthEast?.();
			const isPoint = sw && ne && Math.abs(sw.lat - ne.lat) < 1e-6 && Math.abs(sw.lng - ne.lng) < 1e-6;
			if (b && m.fitBounds && !isPoint) {
				m.fitBounds(b, { padding: [60, 60], maxZoom: 18 });
			} else if (center && m.setView) {
				m.setView(center, 18, { animate: true });
			}
		};
		setTimeout(zoomToOuvrage, 100);
		if (center && this.highlightLayerGroup) {
			const latLng = center;
			import('leaflet').then((LMod) => {
				const L = (LMod as { default: unknown }).default as {
					circleMarker: (latlng: unknown, opts: object) => { addTo: (m: unknown) => unknown; setStyle: (s: object) => void; setRadius: (n: number) => void; bringToFront: () => void };
				};
				const marker = L.circleMarker(latLng, {
					radius: 28,
					color: highlightColor,
					weight: 4,
					fillColor: highlightColor,
					fillOpacity: 0.5
				});
				this.highlightLayerGroup!.addLayer(marker);
				marker.bringToFront();
				this.blinkCircle = marker;
				let radius = 28;
				let growing = true;
				this.blinkInterval = setInterval(() => {
					if (!this.blinkCircle) return;
					radius = growing ? radius + 4 : radius - 4;
					if (radius >= 40) growing = false;
					if (radius <= 18) growing = true;
					marker.setRadius(radius);
					marker.setStyle({
						fillOpacity: growing ? 0.6 : 0.3,
						weight: growing ? 5 : 2
					});
				}, 150);
				this.blinkTimeout = setTimeout(() => {
					this.stopBlink();
					this.restoreHighlightedOuvrageStyle();
				}, 5000);
			});
		}
		this.cdr.markForCheck();
	}

	/**
	 * Charge les géométries des couches du modèle (slugs) et les affiche sur la carte.
	 */
	private loadModelOnMap(slugs: string[]): void {
		if (!this.map || !this.layerGroup || !this.gisApi || slugs.length === 0) return;
		this.layersMapLoading = true;
		this.cdr.markForCheck();
		this.layerGroup.clearLayers();
		this.slugToLayerGroups.clear();
		this.ouvrageIdToLayer.clear();
		this.highlightedOuvrageKey = null;
		const getColor = (slug: string, index: number): string => {
			const c = this.couchesModele.find((m) => m.id === slug);
			return c?.color ?? MAP_COLORS[index % MAP_COLORS.length];
		};
		forkJoin(
			slugs.map((slug, i) =>
				this.gisApi.getList(slug, 2000, 0).pipe(
					map((rows: Record<string, unknown>[]) => ({ slug, rows, color: getColor(slug, i) })),
					catchError(() => of({ slug, rows: [] as Record<string, unknown>[], color: getColor(slug, i) }))
				)
			)
		).subscribe({
			next: (results) => {
				const self = this;
				Promise.all([import('leaflet'), import('wellknown').then((w) => w.default ?? w)]).then(([LModule, wellknown]) => {
				const leaflet = (LModule as { default: unknown }).default as {
					geoJSON: (f: object, opts: object) => { eachLayer: (fn: (layer: unknown) => void) => void };
					circleMarker: (latlng: unknown, opts: object) => unknown;
					layerGroup: () => { addLayer: (l: unknown) => void };
				};
				const group = this.layerGroup as { addLayer: (l: unknown) => void };
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
				let bounds: unknown = null;
				for (const { slug, rows, color } of results as { slug: string; rows: Record<string, unknown>[]; color: string }[]) {
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
							features.push({ type: 'Feature', geometry: geom, properties: { _layerSlug: slug, ...rest } });
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
						onEachFeature: (feature: { properties?: Record<string, unknown> }, layer: { bindPopup: (content: string, opts?: { maxWidth?: number }) => void; on?: (ev: string, fn: () => void) => void }) => {
							const props = feature.properties ?? {};
							self.bindPopupWithLazyImage(layer, slug, props);
							if (layer.on) {
								layer.on('click', () => {
									const layerSlug = String(props['_layerSlug'] ?? slug);
									if (self.selectedMapPanelAction === 'modify') {
										self.openEditFromMapClick(layerSlug, props);
									} else if (self.selectedMapPanelAction === 'delete') {
										self.openDeleteFromMapClick(layerSlug, props);
									}
								});
							}
						}
					});
					geoJsonLayer.eachLayer((l: unknown) => {
						(slugGroup as { addLayer: (l: unknown) => void }).addLayer(l);
						const withBounds = l as { getBounds?: () => unknown };
						const withFeature = l as { feature?: { properties?: Record<string, unknown> } };
						const props = withFeature.feature?.properties ?? {};
						const pk = self.getPkValue(props);
						if (pk) {
							self.ouvrageIdToLayer.set(`${slug}:${pk}`, {
								layer: l as { setStyle: (s: object) => void; getBounds?: () => unknown; bringToFront?: () => void },
								defaultColor: color,
								isLine
							});
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
					self.slugToLayerGroups.set(slug, slugGroup);
					const couche = self.couchesModele.find((c) => c.id === slug);
					if (couche?.included !== false) {
						group.addLayer(slugGroup);
					}
				}
				const m = this.map as { fitBounds?: (b: unknown, o?: object) => void; invalidateSize?: () => void };
				if (m?.invalidateSize) m.invalidateSize();
				if (bounds && m?.fitBounds) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
				self.layersMapLoading = false;
				self.cdr.markForCheck();
			}).catch(() => {
				self.layersMapLoading = false;
				self.cdr.markForCheck();
			});
			},
			error: () => {
				this.layersMapLoading = false;
				this.cdr.markForCheck();
			}
		});
	}
}
