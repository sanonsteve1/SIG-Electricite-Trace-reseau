import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';

import { GisApiService, NetworkRule } from '../../../services/gis-api.service';

type RuleType = 'connectivite' | 'topologie';

@Component({
	selector: 'app-regles',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './regles.component.html',
	styleUrls: ['./regles.component.scss']
})
export class ReglesComponent implements OnInit {
	private readonly gisApi = inject(GisApiService);
	private readonly route = inject(ActivatedRoute);

	ruleType: RuleType = 'connectivite';
	title = 'Règles de connectivité';

	loading = false;
	saving = false;
	errorMessage = '';
	successMessage = '';

	rules: NetworkRule[] = [];
	editingRuleId: number | null = null;
	form: Partial<NetworkRule> = this.emptyForm();
	formPanelCollapsed = false;

	ngOnInit(): void {
		const routeType = (this.route.snapshot.data['ruleType'] as RuleType | undefined) ?? 'connectivite';
		this.ruleType = routeType === 'topologie' ? 'topologie' : 'connectivite';
		this.title = this.ruleType === 'topologie' ? 'Règles de topologie' : 'Règles de connectivité';
		this.resetForm();
		this.loadRules();
	}

	loadRules(): void {
		this.loading = true;
		this.errorMessage = '';
		this.gisApi.getRules(this.ruleType).pipe(
			catchError((err) => {
				this.loading = false;
				this.errorMessage = err?.error?.detail || err?.message || 'Erreur lors du chargement des règles.';
				return of([]);
			})
		).subscribe((rows: NetworkRule[]) => {
			this.rules = rows;
			this.loading = false;
		});
	}

	startCreate(): void {
		this.editingRuleId = null;
		this.form = this.emptyForm();
	}

	startEdit(rule: NetworkRule): void {
		this.editingRuleId = rule.id;
		this.form = {
			rule_type: rule.rule_type,
			category: rule.category ?? '',
			rule_name: rule.rule_name ?? '',
			concerned_objects: rule.concerned_objects ?? '',
			description: rule.description ?? '',
			technical_constraints: rule.technical_constraints ?? '',
			examples: rule.examples ?? '',
			detected_errors: rule.detected_errors ?? '',
			best_practices: rule.best_practices ?? '',
			sort_order: rule.sort_order ?? 0
		};
		this.successMessage = '';
		this.errorMessage = '';
	}

	save(): void {
		const payload: Partial<NetworkRule> = {
			...this.form,
			rule_type: this.ruleType,
			rule_name: (this.form.rule_name || '').trim(),
			sort_order: Number(this.form.sort_order || 0)
		};
		if (!payload.rule_name) {
			this.errorMessage = 'Le champ "Règle" est obligatoire.';
			return;
		}

		this.saving = true;
		this.errorMessage = '';
		this.successMessage = '';

		const request$ = this.editingRuleId
			? this.gisApi.updateRule(this.editingRuleId, payload)
			: this.gisApi.createRule(payload);

		request$.pipe(
			catchError((err) => {
				this.saving = false;
				this.errorMessage = err?.error?.detail || err?.message || 'Erreur lors de l\'enregistrement.';
				return of(null);
			})
		).subscribe((res: NetworkRule | null) => {
			this.saving = false;
			if (!res) return;
			this.successMessage = this.editingRuleId ? 'Règle mise à jour.' : 'Règle créée.';
			this.resetForm();
			this.loadRules();
		});
	}

	remove(rule: NetworkRule): void {
		if (!rule.id) return;
		const ok = confirm(`Supprimer la règle "${rule.rule_name}" ?`);
		if (!ok) return;

		this.errorMessage = '';
		this.successMessage = '';
		this.gisApi.deleteRule(rule.id).pipe(
			catchError((err) => {
				this.errorMessage = err?.error?.detail || err?.message || 'Erreur lors de la suppression.';
				return of(null);
			})
		).subscribe((res: { deleted: boolean; id: number } | null) => {
			if (!res?.deleted) return;
			this.successMessage = 'Règle supprimée.';
			if (this.editingRuleId === rule.id) this.resetForm();
			this.loadRules();
		});
	}

	cancelEdit(): void {
		this.resetForm();
		this.errorMessage = '';
	}

	toggleFormPanel(): void {
		this.formPanelCollapsed = !this.formPanelCollapsed;
	}

	private resetForm(): void {
		this.editingRuleId = null;
		this.form = this.emptyForm();
	}

	private emptyForm(): Partial<NetworkRule> {
		return {
			rule_type: this.ruleType,
			category: '',
			rule_name: '',
			concerned_objects: '',
			description: '',
			technical_constraints: '',
			examples: '',
			detected_errors: '',
			best_practices: '',
			sort_order: 0
		};
	}
}
