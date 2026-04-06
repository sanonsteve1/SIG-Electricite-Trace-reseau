import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface UnTracePayload {
	noeud_depart_id: string;
	type_trace: 'Amont' | 'Aval' | 'Isolement' | 'Impact_Client';
	niveau_reseau?: string | null;
	utilisateur?: string | null;
	trace_config_id?: string | null;
}

export interface UnTraceResponse {
	trace_id: string;
}

export interface UnTopologyValidationResponse {
	nb_dirty_traites: number;
	nb_anomalies: number;
	nb_dirty_valides: number;
}

export interface UnSubnetworkRebuildPayload {
	sous_reseau_id: string;
	utilisateur?: string | null;
}

export interface UnSubnetworkRebuildResponse {
	sous_reseau_id: string;
	elements_reconstruits: number;
}

export interface UnIncrementalRecalcPayload {
	objet_table: string;
	objet_id: string;
}

export interface UnIncrementalRecalcResponse {
	objets_impactes: number;
}

export interface UnTraceBarrierPayload {
	trace_id: string;
	barriere_type: 'Noeud' | 'Arete' | 'Condition';
	noeud_id?: string | null;
	arete_id?: string | null;
	condition_sql?: string | null;
	description?: string | null;
}

export interface UnTraceConfigPayload {
	code: string;
	max_depth: number;
	ignorer_ouvert: boolean;
	phase_cible?: string | null;
	include_containment: boolean;
	include_structure: boolean;
}

export interface UnAcceptanceTestRow {
	test_name: string;
	statut: 'PASS' | 'FAIL';
	details: string;
}

@Injectable({ providedIn: 'root' })
export class UnApiService {
	private readonly baseUrl = (environment as { unApiUrl?: string }).unApiUrl || '';

	constructor(private http: HttpClient) {}

	health(): Observable<{ status: string }> {
		return this.http.get<{ status: string }>(`${this.baseUrl}/health`);
	}

	runTrace(payload: UnTracePayload): Observable<UnTraceResponse> {
		return this.http.post<UnTraceResponse>(`${this.baseUrl}/un/trace`, payload);
	}

	validateTopology(maxRecords = 10000): Observable<UnTopologyValidationResponse> {
		return this.http.post<UnTopologyValidationResponse>(`${this.baseUrl}/un/topology/validate`, { max_records: maxRecords });
	}

	rebuildSubnetwork(payload: UnSubnetworkRebuildPayload): Observable<UnSubnetworkRebuildResponse> {
		return this.http.post<UnSubnetworkRebuildResponse>(`${this.baseUrl}/un/subnetwork/rebuild`, payload);
	}

	recalcIncremental(payload: UnIncrementalRecalcPayload): Observable<UnIncrementalRecalcResponse> {
		return this.http.post<UnIncrementalRecalcResponse>(`${this.baseUrl}/un/subnetwork/recalc-incremental`, payload);
	}

	addTraceBarrier(payload: UnTraceBarrierPayload): Observable<Record<string, unknown>> {
		return this.http.post<Record<string, unknown>>(`${this.baseUrl}/un/trace/barrier`, payload);
	}

	saveTraceConfiguration(payload: UnTraceConfigPayload): Observable<Record<string, unknown>> {
		return this.http.post<Record<string, unknown>>(`${this.baseUrl}/un/trace/configuration`, payload);
	}

	runAcceptanceTests(): Observable<{ results: UnAcceptanceTestRow[] }> {
		return this.http.post<{ results: UnAcceptanceTestRow[] }>(`${this.baseUrl}/un/tests/run`, {});
	}
}

