import {Component, ElementRef, inject, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {MenuItem} from 'primeng/api';
import {AppMenuitem} from './app.menuitem';

@Component({
	selector: 'app-menu, [app-menu]',
	standalone: true,
	imports: [CommonModule, AppMenuitem, RouterModule],
	template: `
		<ul class="layout-menu" #menuContainer>
			<ng-container *ngFor="let item of model; let i = index">
				<li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
				<li *ngIf="item.separator" class="menu-separator"></li>
			</ng-container>
		</ul>`
})
export class AppMenu {
	el: ElementRef = inject(ElementRef);

	@ViewChild('menuContainer') menuContainer!: ElementRef;

	model: MenuItem[] = [
		{
			label: 'Gestion du stock',
			items: [
				{
					label: 'Tableau de bord',
					icon: 'fa fa-pie-chart',
					routerLink: ['/stock/tableau-de-bord']
				},
				{
					label: 'Situation de stock',
					icon: 'fa fa-archive',
					routerLink: ['/stock/situation-de-stock']
				}
			]
		},
		{
			label: 'Gestion des emplacements',
			items: [
				{
					label: 'Entrepôts',
					icon: 'fa fa-home',
					routerLink: ['/emplacement/entrepot']
				},
				{
					label: 'Zones',
					icon: 'fa fa-th-large',
					routerLink: ['/emplacement/zone']
				},
				{
					label: 'Allées',
					icon: 'fa fa-th',
					routerLink: ['/emplacement/allee']
				},
				{
					label: 'Quais',
					icon: 'fa fa-truck',
					routerLink: ['/emplacement/quai']
				},
				{
					label: 'Emplacements',
					icon: 'fa fa-map-marker',
					routerLink: ['/emplacement/liste-emplacement']
				}
			]
		},
		{
			label: 'Gestion des mouvements',
			items: [
				{
					label: 'Entrées',
					icon: 'fa fa-sign-in',
					routerLink: ['/mouvement/entree']
				},
				{
					label: 'Sorties',
					icon: 'fa fa-sign-out',
					routerLink: ['/mouvement/sortie']
				}
			]
		},
		{
			label: 'Référentiel produit',
			items: [
				{
					label: 'Produits',
					icon: 'fa fa-sign-in',
					routerLink: ['/referentiel/produit']
				},
				{
					label: 'Catégories',
					icon: 'fa fa-sign-out',
					routerLink: ['/referentiel/categorie']
				}
			]
		},
		{
			label: 'Administration',
			items: [
				{
					label: 'Version',
					icon: 'fa fa-code-fork',
					routerLink: ['/administration/version']
				}
			]
		}
	];
}
