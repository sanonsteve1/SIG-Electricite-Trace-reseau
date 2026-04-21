import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';
import { environment } from '@environments/environment';

export interface GisTableInfo {
	slug: string;
	table: string;
}

export interface GisTableMeta {
	slug: string;
	table: string;
	geometry_type?: string;
}

export interface GisCountResponse {
	count: number;
}

export interface GisFilterOptions {
	collectePar?: string;
}

export interface SuggestPlacementItem {
	type: 'line_connection' | 'near_point';
	lat: number;
	lng: number;
	label: string;
	source_slug: string;
	source_id: string;
	distance_m: number;
	/** Géométrie WKT de la ligne (pour mise en évidence sur la carte), uniquement pour type line_connection */
	line_wkt?: string;
}

export interface SuggestPlacementResponse {
	suggestions: SuggestPlacementItem[];
	message?: string;
}

export interface OcrProcessResponse {
	success: boolean;
	text?: string;
	confidence?: number;
	language?: string;
	processing_time?: number;
	timestamp?: string;
	error?: string;
}

export interface NetworkRule {
	id: number;
	rule_type: 'connectivite' | 'topologie';
	category?: string;
	rule_name: string;
	concerned_objects?: string;
	description?: string;
	technical_constraints?: string;
	examples?: string;
	detected_errors?: string;
	best_practices?: string;
	source_file?: string;
	sort_order?: number;
	created_at?: string;
	updated_at?: string;
}

/**
 * Service pour l'API GIS (script_bd - FastAPI).
 * Base URL : environment.gisApiUrl (ex. http://localhost:8000)
 */
@Injectable({ providedIn: 'root' })
export class GisApiService {
	private readonly baseUrl = environment.gisApiUrl;
	private readonly ocrApiUrl = (environment as { ocrApiUrl?: string }).ocrApiUrl ?? '';

	constructor(private http: HttpClient) {}

	/** Liste des tables disponibles (slugs) */
	getTables(): Observable<GisTableInfo[]> {
		const url = `${this.baseUrl}/`;
		return this.http.get<{ tables: GisTableInfo[] }>(url).pipe(
			map((res) => res.tables || [])
		);
	}

	/** Nombre d'enregistrements pour une table (slug) */
	getCount(tableSlug: string, filters?: GisFilterOptions): Observable<number> {
		let url = `${this.baseUrl}/gis/${encodeURIComponent(tableSlug)}/count`;
		const collectePar = filters?.collectePar?.trim();
		if (collectePar) url += `?collecte_par=${encodeURIComponent(collectePar)}`;
		return this.http.get<GisCountResponse>(url).pipe(
			map((res) => res?.count ?? 0)
		);
	}

	/** Métadonnées de la table (slug, table, type de géométrie détecté automatiquement) */
	getTableMeta(tableSlug: string): Observable<GisTableMeta> {
		const url = `${this.baseUrl}/gis/${encodeURIComponent(tableSlug)}/meta`;
		return this.http.get<GisTableMeta>(url);
	}

	/**
	 * Valeurs par défaut pour le pré-remplissage du formulaire de création (module IA).
	 * GET /gis/{table_slug}/form-defaults
	 */
	getFormDefaults(tableSlug: string): Observable<{ defaults: Record<string, unknown> }> {
		const url = `${this.baseUrl}/gis/${encodeURIComponent(tableSlug)}/form-defaults`;
		return this.http.get<{ defaults: Record<string, unknown> }>(url);
	}

	/** Comptes pour plusieurs tables en parallèle. Retourne un Map slug -> count. */
	getCounts(tableSlugs: string[], filters?: GisFilterOptions): Observable<Map<string, number>> {
		if (tableSlugs.length === 0) {
			return of(new Map());
		}
		return forkJoin(
			tableSlugs.map((slug) =>
				this.getCount(slug, filters).pipe(map((count) => ({ slug, count })))
			)
		).pipe(
			map((pairs) => {
				const m = new Map<string, number>();
				pairs.forEach(({ slug, count }) => m.set(slug, count));
				return m;
			})
		);
	}

	/** Liste des enregistrements (pagination) */
	getList(
		tableSlug: string,
		limit = 100,
		offset = 0,
		filters?: GisFilterOptions
	): Observable<Record<string, unknown>[]> {
		let url = `${this.baseUrl}/gis/${encodeURIComponent(tableSlug)}?limit=${limit}&offset=${offset}`;
		const collectePar = filters?.collectePar?.trim();
		if (collectePar) url += `&collecte_par=${encodeURIComponent(collectePar)}`;
		return this.http.get<Record<string, unknown>[]>(url);
	}

	/** Lecture : récupère un ouvrage par clé primaire */
	getById(tableSlug: string, pkValue: string): Observable<Record<string, unknown>> {
		const url = `${this.baseUrl}/gis/${encodeURIComponent(tableSlug)}/${encodeURIComponent(pkValue)}`;
		return this.http.get<Record<string, unknown>>(url);
	}

	/**
	 * Met à jour uniquement etat_reseau (ouvert | fermé).
	 * PATCH /gis/{slug}/{id}/etat-reseau
	 */
	updateEtatReseau(
		tableSlug: string,
		pkValue: string,
		etatReseau: 'ouvert' | 'fermé'
	): Observable<{ updated?: boolean; etat_reseau?: string; row?: Record<string, unknown> }> {
		const url = `${this.baseUrl}/gis/${encodeURIComponent(tableSlug)}/${encodeURIComponent(pkValue)}/etat-reseau`;
		return this.http.patch<{ updated?: boolean; etat_reseau?: string; row?: Record<string, unknown> }>(url, {
			etat_reseau: etatReseau
		});
	}

	/** Création ou mise à jour : body avec les champs (geom en WKT/EWKT). Si pk présent et existant → update. */
	createOrUpdate(tableSlug: string, body: Record<string, unknown>): Observable<Record<string, unknown>> {
		const url = `${this.baseUrl}/gis/${encodeURIComponent(tableSlug)}`;
		return this.http.post<Record<string, unknown>>(url, body);
	}

	/**
	 * Propositions de placement pour la création : où placer l'entité et à quoi la raccorder.
	 * lat, lng = centre de la carte ou point de clic ; radius_m = rayon de recherche en mètres.
	 */
	getSuggestPlacement(
		tableSlug: string,
		params: { lat: number; lng: number; radius_m?: number }
	): Observable<SuggestPlacementResponse> {
		const { lat, lng, radius_m = 100 } = params;
		const url = `${this.baseUrl}/gis/${encodeURIComponent(tableSlug)}/suggest-placement?lat=${lat}&lng=${lng}&radius_m=${radius_m}`;
		return this.http.get<SuggestPlacementResponse>(url);
	}

	/** Suppression : retrait d'un équipement par clé primaire */
	deleteRow(tableSlug: string, pkValue: string): Observable<{ deleted: boolean; id: string }> {
		const url = `${this.baseUrl}/gis/${encodeURIComponent(tableSlug)}/${encodeURIComponent(pkValue)}`;
		return this.http.delete<{ deleted: boolean; id: string }>(url);
	}

	/** Règles métier (connectivité/topologie) */
	getRules(ruleType: 'connectivite' | 'topologie'): Observable<NetworkRule[]> {
		const url = `${this.baseUrl}/gis/rules?rule_type=${encodeURIComponent(ruleType)}`;
		return this.http.get<NetworkRule[]>(url);
	}

	getRuleById(ruleId: number): Observable<NetworkRule> {
		const url = `${this.baseUrl}/gis/rules/${encodeURIComponent(String(ruleId))}`;
		return this.http.get<NetworkRule>(url);
	}

	createRule(payload: Partial<NetworkRule>): Observable<NetworkRule> {
		const url = `${this.baseUrl}/gis/rules`;
		return this.http.post<NetworkRule>(url, payload);
	}

	updateRule(ruleId: number, payload: Partial<NetworkRule>): Observable<NetworkRule> {
		const url = `${this.baseUrl}/gis/rules/${encodeURIComponent(String(ruleId))}`;
		return this.http.put<NetworkRule>(url, payload);
	}

	deleteRule(ruleId: number): Observable<{ deleted: boolean; id: number }> {
		const url = `${this.baseUrl}/gis/rules/${encodeURIComponent(String(ruleId))}`;
		return this.http.delete<{ deleted: boolean; id: number }>(url);
	}

	loadDefaultRules(replaceExisting = true): Observable<{ success: boolean; inserted: number; by_type: Record<string, number> }> {
		const url = `${this.baseUrl}/gis/rules/load-defaults?replace_existing=${replaceExisting ? 'true' : 'false'}`;
		return this.http.post<{ success: boolean; inserted: number; by_type: Record<string, number> }>(url, {});
	}

	/**
	 * Tracé amont/aval : ouvrages connectés à un point (poste source, poste de transformation ou abonné).
	 * type: 'poste_source' | 'poste_transformation' | 'abonne'
	 * direction: 'amont' | 'aval' | 'tous'
	 */
	getTrace(
		type: string,
		refId: string,
		direction: 'amont' | 'aval' | 'tous',
		refSlug?: string
	): Observable<{ ouvrage_ids: { slug: string; id: string }[] }> {
		const refSlugPart = refSlug ? `&ref_slug=${encodeURIComponent(refSlug)}` : '';
		const url = `${this.baseUrl}/gis/trace?type=${encodeURIComponent(type)}&ref_id=${encodeURIComponent(refId)}&direction=${encodeURIComponent(direction)}${refSlugPart}`;
		return this.http.get<{ ouvrage_ids: { slug: string; id: string }[] }>(url);
	}

	/**
	 * Nœuds de topologie RX avec géométrie (incluant nœuds synthétiques sans couche SHP propre).
	 * topologyCode: "rx_raz4" (par défaut).
	 */
	getRxTopologyNodes(topologyCode = 'rx_raz4'): Observable<{
		slug: string;
		rows: {
			gid: string;
			node_type: string;
			network_level: string;
			label: string | null;
			source_slug: string | null;
			source_gid: string | null;
			depart_code: string | null;
			geom: string;
		}[];
		count: number;
	}> {
		const url = `${this.baseUrl}/gis/rx-topology-nodes?topology_code=${encodeURIComponent(topologyCode)}`;
		return this.http.get<{ slug: string; rows: any[]; count: number }>(url);
	}

	/**
	 * Arcs synthétiques de la topologie RX (bridges HTA-BT) avec leur géométrie LINESTRING.
	 * Ces arcs n'ont pas de couche SHP propre mais disposent de coordonnées calculées.
	 */
	getRxTopologyEdges(topologyCode = 'rx_raz4'): Observable<{
		slug: string;
		rows: {
			gid: string;
			edge_type: string;
			network_level: string;
			label: string | null;
			source_node_id: string;
			target_node_id: string;
			depart_code: string | null;
			geom: string;
		}[];
		count: number;
	}> {
		const url = `${this.baseUrl}/gis/rx-topology-edges?topology_code=${encodeURIComponent(topologyCode)}`;
		return this.http.get<{ slug: string; rows: any[]; count: number }>(url);
	}

	/**
	 * Correction de topologie : rapproche les extrémités des lignes vers les nœuds (poteaux, transfo, etc.)
	 * dans la tolérance donnée (mètres).
	 */
	correctTopology(tolerance_m: number): Observable<TopologyCorrectResponse> {
		const url = `${this.baseUrl}/gis/topology/correct`;
		return this.http.post<TopologyCorrectResponse>(url, { tolerance_m });
	}

	/** Validation des règles connectivité/topologie pour mise en évidence cartographique. */
	validateTopology(check_type: 'connectivite' | 'topologie' | 'all' = 'all', limit_per_table = 300): Observable<TopologyValidationResponse> {
		const url = `${this.baseUrl}/gis/topology/validate`;
		return this.http.post<TopologyValidationResponse>(url, { check_type, limit_per_table });
	}

	/**
	 * Correction automatique ciblée pour une ligne du rapport de validation (connectivité ou topologie).
	 * POST /gis/topology/correct-issue
	 */
	correctTopologyIssue(params: {
		slug: string;
		id: string;
		rule_type: 'connectivite' | 'topologie';
		tolerance_m?: number;
		search_radius_m?: number;
	}): Observable<TopologyCorrectIssueResponse> {
		const url = `${this.baseUrl}/gis/topology/correct-issue`;
		return this.http.post<TopologyCorrectIssueResponse>(url, params);
	}

	/**
	 * Modélisation : construire le modèle à partir du périmètre et des couches.
	 */
	buildModel(params: ModelisationParams): Observable<ModelisationBuildResponse> {
		const url = `${this.baseUrl}/gis/modelisation/build`;
		return this.http.post<ModelisationBuildResponse>(url, params);
	}

	/**
	 * Modélisation : exporter le modèle.
	 */
	exportModel(params: ModelisationParams): Observable<ModelisationExportResponse> {
		const url = `${this.baseUrl}/gis/modelisation/export`;
		return this.http.post<ModelisationExportResponse>(url, params);
	}

	/**
	 * Modélisation : lancer un calcul (ex. load flow).
	 */
	runCalculation(params: ModelisationParams): Observable<ModelisationCalculateResponse> {
		const url = `${this.baseUrl}/gis/modelisation/calculate`;
		return this.http.post<ModelisationCalculateResponse>(url, params);
	}

	/**
	 * Schéma unifilaire du réseau **par ouvrage** : graphe des nœuds/arêtes connectés à l'ouvrage donné.
	 * GET /gis/schema-unifilaire?ref_id=...&type=...&direction=...
	 */
	getSchemaUnifilaire(
		refId: string,
		params?: { type?: string; direction?: string; refSlug?: string }
	): Observable<SchemaUnifilaireResponse> {
		if (!refId?.trim()) {
			throw new Error('Codification (numéro de l\'ouvrage) requise.');
		}
		let url = `${this.baseUrl}/gis/schema-unifilaire?ref_id=${encodeURIComponent(refId.trim())}`;
		const typeOuvrage = params?.type?.trim();
		if (typeOuvrage) url += `&type_ouvrage=${encodeURIComponent(typeOuvrage)}`;
		const direction = params?.direction?.trim();
		if (direction) url += `&direction=${encodeURIComponent(direction)}`;
		const refSlug = params?.refSlug?.trim();
		if (refSlug) url += `&ref_slug=${encodeURIComponent(refSlug)}`;
		return this.http.get<SchemaUnifilaireResponse>(url);
	}

	/**
	 * Schéma unifilaire PowSyBL : génère un SVG à partir de la liste d'ouvrages du tracé.
	 * POST /gis/unifilaire/svg avec body { ouvrage_ids: [ { slug, id }, ... ] }.
	 * Retourne le SVG en texte (image/svg+xml).
	 */
	getUnifilaireSvg(ouvrageIds: { slug: string; id: string }[]): Observable<string> {
		const url = `${this.baseUrl}/gis/unifilaire/svg`;
		return this.http.post(url, { ouvrage_ids: ouvrageIds }, { responseType: 'text' });
	}

	/**
	 * Schéma unifilaire en PDF : génère un PDF à partir de la liste d'ouvrages du tracé.
	 * POST /gis/unifilaire/pdf avec body { ouvrage_ids: [ { slug, id }, ... ] }.
	 * Retourne le fichier PDF (application/pdf).
	 */
	getUnifilairePdf(ouvrageIds: { slug: string; id: string }[]): Observable<Blob> {
		const url = `${this.baseUrl}/gis/unifilaire/pdf`;
		return this.http.post(url, { ouvrage_ids: ouvrageIds }, { responseType: 'blob' });
	}

	/** OCR: extraire du texte depuis une image pour pré-remplir un formulaire. */
	processOcr(file: File, options?: { language?: string; engine?: 'tesseract' | 'easyocr' }): Observable<OcrProcessResponse> {
		const base = (this.ocrApiUrl || '').trim();
		if (!base) {
			return of({ success: false, error: "ocr_api_url_missing" });
		}
		const formData = new FormData();
		formData.append('file', file, file.name || 'image.jpg');
		if (options?.language) formData.append('language', options.language);
		if (options?.engine) formData.append('engine', options.engine);
		return this.http.post<OcrProcessResponse>(`${base}/ocr`, formData);
	}
}

export interface TopologyCorrectResponse {
	corrected: number;
	by_table: Record<string, { updated: number; error?: string }>;
	tolerance_m?: number;
	message?: string;
}

export interface TopologyValidationIssue {
	rule_type: 'connectivite' | 'topologie';
	slug: string;
	id: string;
	reason: string;
	severity: 'warning' | 'error';
	/** Piste de correction métier (renseignée par l’API). */
	suggestion?: string;
	auto_correctable?: boolean;
	auto_correction_reason?: string | null;
}

export interface TopologyValidationResponse {
	check_type: 'connectivite' | 'topologie' | 'all';
	total_issues: number;
	by_rule_type: { connectivite: number; topologie: number };
	by_slug: Record<string, number>;
	issues: TopologyValidationIssue[];
	message?: string;
}

export interface TopologyCorrectIssueUpdate {
	column: string;
	ok: boolean;
	node_slug?: string;
	value?: string;
	distance_m?: number | null;
	reason?: string;
	error?: string;
}

export interface TopologyCorrectIssueResponse {
	rule_type: 'connectivite' | 'topologie';
	slug: string;
	id: string;
	success: boolean;
	message: string;
	tolerance_m?: number;
	search_radius_m?: number | null;
	make_valid_updated?: number;
	snap_updated?: number;
	updates?: TopologyCorrectIssueUpdate[];
}

export interface ModelisationParams {
	poste_source?: string;
	tension?: string;
	type_reseau?: string;
	layer_slugs?: string[];
}

export interface ModelisationBuildResponse {
	success: boolean;
	message?: string;
	layers?: { slug: string; table: string; count: number }[];
	rows_total?: number;
}

export interface ModelisationExportResponse {
	success: boolean;
	message?: string;
	layers?: { slug: string; table: string; count: number }[];
	rows_total?: number;
}

export interface ModelisationCalculateResponse {
	success: boolean;
	message?: string;
	layers?: { slug: string; table: string; count: number }[];
	rows_total?: number;
}

export interface SchemaUnifilaireNode {
	id: string;
	type: string;
	symbol: string;
	label: string;
	x: number;
	y: number;
	/** État organe : 'ouvert' | 'ferme' (si présent en base) */
	state?: string;
	/** Valeurs de mesure optionnelles (si présentes en base) */
	tension?: number;
	courant?: number;
	puissance?: number;
}

export interface SchemaUnifilaireEdge {
	source: string;
	target: string;
	line_type: string;
	line_gid: string;
	/** Libellé métier du tronçon / câble (ex. "043-50853", "DEPART 1 TUR 1") */
	label?: string;
	/** Slug de la table source du tronçon / câble */
	source_slug?: string;
}

export interface SchemaUnifilaireResponse {
	nodes: SchemaUnifilaireNode[];
	edges: SchemaUnifilaireEdge[];
	message?: string;
}
