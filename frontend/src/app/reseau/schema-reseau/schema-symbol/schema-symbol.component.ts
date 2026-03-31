import { Component, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Symbole IEC 60617 pour le schéma unifilaire.
 * Reçoit les coordonnées (x, y) et l'état, restitue le SVG correspondant.
 */
@Component({
	selector: 'app-schema-symbol',
	standalone: true,
	imports: [CommonModule],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	template: `
		<g [attr.transform]="'translate(' + x + ',' + y + ')'" class="schema-symbol" [attr.data-symbol]="symbol">
			@switch (symbol) {
				@case ('sym-transfo') {
					<circle r="14" fill="none" stroke="#1e293b" [attr.stroke-width]="2"/>
					<circle r="6" fill="none" stroke="#1e293b" [attr.stroke-width]="1.5"/>
					<line x1="-14" y1="0" x2="-6" y2="0" stroke="#1e293b" [attr.stroke-width]="1.5"/>
					<line x1="6" y1="0" x2="14" y2="0" stroke="#1e293b" [attr.stroke-width]="1.5"/>
				}
				@case ('sym-transfo-bt') {
					<rect x="-12" y="-10" width="24" height="20" rx="2" fill="none" stroke="#0369a1" [attr.stroke-width]="2"/>
					<line x1="-12" y1="0" x2="-16" y2="0" stroke="#0369a1" [attr.stroke-width]="1.5"/>
					<line x1="12" y1="0" x2="16" y2="0" stroke="#0369a1" [attr.stroke-width]="1.5"/>
				}
				@case ('sym-depart') {
					<rect x="-10" y="-6" width="20" height="12" rx="1" fill="none" stroke="#334155" [attr.stroke-width]="2"/>
					<line x1="-12" y1="0" x2="-10" y2="0" stroke="#334155" [attr.stroke-width]="1.5"/>
					<line x1="10" y1="0" x2="12" y2="0" stroke="#334155" [attr.stroke-width]="1.5"/>
				}
				@case ('sym-poteau') {
					<path d="M0,-12 L10,8 L-10,8 Z" fill="none" stroke="#64748b" [attr.stroke-width]="2"/>
					<line x1="0" y1="8" x2="0" y2="14" stroke="#64748b" [attr.stroke-width]="1.5"/>
				}
				@case ('sym-point-livraison') {
					<circle r="8" fill="#ea580c" stroke="#c2410c" [attr.stroke-width]="1.5"/>
					<line x1="-12" y1="0" x2="-8" y2="0" stroke="#334155" [attr.stroke-width]="1"/>
					<line x1="8" y1="0" x2="12" y2="0" stroke="#334155" [attr.stroke-width]="1"/>
				}
				@default {
					<circle r="10" fill="none" stroke="#94a3b8" [attr.stroke-width]="2"/>
					<line x1="-14" y1="0" x2="-10" y2="0" stroke="#94a3b8" [attr.stroke-width]="1"/>
					<line x1="10" y1="0" x2="14" y2="0" stroke="#94a3b8" [attr.stroke-width]="1"/>
				}
			}
			@if (label) {
				<text x="0" y="28" text-anchor="middle" class="schema-symbol-label" font-size="11" fill="#475569">{{ label }}</text>
			}
		</g>
	`,
	styles: [`
		.schema-symbol-label { font-family: inherit; }
	`]
})
export class SchemaSymbolComponent {
	@Input() symbol = '';
	@Input() x = 0;
	@Input() y = 0;
	@Input() label = '';
}
