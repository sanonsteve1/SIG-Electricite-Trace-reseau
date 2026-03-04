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
	getCount(tableSlug: string): Observable<number> {
		const url = `${this.baseUrl}/gis/${encodeURIComponent(tableSlug)}/count`;
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
	getCounts(tableSlugs: string[]): Observable<Map<string, number>> {
		if (tableSlugs.length === 0) {
			return of(new Map());
		}
		return forkJoin(
			tableSlugs.map((slug) =>
				this.getCount(slug).pipe(map((count) => ({ slug, count })))
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
		offset = 0
	): Observable<Record<string, unknown>[]> {
		const url = `${this.baseUrl}/gis/${encodeURIComponent(tableSlug)}?limit=${limit}&offset=${offset}`;
		return this.http.get<Record<string, unknown>[]>(url);
	}

	/** Lecture : récupère un ouvrage par clé primaire */
	getById(tableSlug: string, pkValue: string): Observable<Record<string, unknown>> {
		const url = `${this.baseUrl}/gis/${encodeURIComponent(tableSlug)}/${encodeURIComponent(pkValue)}`;
		return this.http.get<Record<string, unknown>>(url);
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

	/**
	 * Tracé amont/aval : ouvrages connectés à un point (poste source, poste de transformation ou abonné).
	 * type: 'poste_source' | 'poste_transformation' | 'abonne'
	 * direction: 'amont' | 'aval'
	 */
	getTrace(
		type: string,
		refId: string,
		direction: 'amont' | 'aval'
	): Observable<{ ouvrage_ids: { slug: string; id: string }[] }> {
		const url = `${this.baseUrl}/gis/trace?type=${encodeURIComponent(type)}&ref_id=${encodeURIComponent(refId)}&direction=${encodeURIComponent(direction)}`;
		return this.http.get<{ ouvrage_ids: { slug: string; id: string }[] }>(url);
	}

	/**
	 * Correction de topologie : rapproche les extrémités des lignes vers les nœuds (poteaux, transfo, etc.)
	 * dans la tolérance donnée (mètres).
	 */
	correctTopology(tolerance_m: number): Observable<TopologyCorrectResponse> {
		const url = `${this.baseUrl}/gis/topology/correct`;
		return this.http.post<TopologyCorrectResponse>(url, { tolerance_m });
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
