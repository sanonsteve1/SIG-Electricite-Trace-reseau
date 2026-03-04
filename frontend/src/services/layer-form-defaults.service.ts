import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { GisApiService } from './gis-api.service';
import { LAYER_FORM_DEFAULTS } from './layer-form-defaults.config';

/**
 * Service « IA » pour automatiser le pré-remplissage des formulaires des couches
 * avec des valeurs par défaut selon le type de couche (slug).
 * Utilise l'API GET /gis/{slug}/form-defaults, avec repli sur la config locale si l'API est indisponible.
 */
@Injectable({ providedIn: 'root' })
export class LayerFormDefaultsService {

	constructor(private gisApi: GisApiService) {}

	/**
	 * Récupère les valeurs par défaut pour une couche (appel API, repli sur config locale).
	 */
	getDefaultsForLayer(layerSlug: string | null): Observable<Record<string, unknown>> {
		if (!layerSlug || typeof layerSlug !== 'string') return of({});
		return this.gisApi.getFormDefaults(layerSlug).pipe(
			map((res) => res?.defaults ?? {}),
			catchError(() => of(this.getDefaultsFromLocalConfig(layerSlug)))
		);
	}

	/**
	 * Config locale uniquement (utilisée en repli si l'API échoue).
	 */
	getDefaultsFromLocalConfig(layerSlug: string): Record<string, unknown> {
		const slug = layerSlug.toLowerCase().trim();
		const out: Record<string, unknown> = {};
		for (const [key, values] of Object.entries(LAYER_FORM_DEFAULTS)) {
			if (!key.endsWith('*') || !values || typeof values !== 'object') continue;
			const pattern = key.slice(0, -1).toLowerCase();
			if (slug.includes(pattern)) {
				for (const [k, v] of Object.entries(values)) {
					if (v !== undefined) out[k] = v;
				}
			}
		}
		const exact = LAYER_FORM_DEFAULTS[slug];
		if (exact && typeof exact === 'object') {
			for (const [k, v] of Object.entries(exact)) {
				if (v !== undefined) out[k] = v;
			}
		}
		return out;
	}

	/**
	 * Applique des valeurs par défaut sur un formulaire existant.
	 * Seuls les champs présents dans le formulaire et considérés comme « vides » sont remplis.
	 */
	applyDefaultsToForm(
		form: Record<string, unknown>,
		defaults: Record<string, unknown>,
		options?: { onlyEmpty?: boolean; excludeKeys?: string[] }
	): void {
		const onlyEmpty = options?.onlyEmpty !== false;
		const excludeKeys = new Set((options?.excludeKeys ?? []).map((k) => k.toLowerCase()));
		excludeKeys.add('id');
		excludeKeys.add('geom');
		for (const [key, value] of Object.entries(defaults)) {
			const kLower = key.toLowerCase();
			if (excludeKeys.has(kLower)) continue;
			if (!Object.prototype.hasOwnProperty.call(form, key)) continue;
			if (onlyEmpty && this.isFilled(form[key])) continue;
			form[key] = value;
		}
	}

	private isFilled(value: unknown): boolean {
		if (value == null) return false;
		if (typeof value === 'string') return value.trim() !== '';
		if (typeof value === 'number') return true;
		return true;
	}
}
