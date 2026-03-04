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
			label: 'Tableau de bord',
			icon: 'fa fa-pie-chart',
			items: [
				{
					label: 'Vue d\'ensemble',
					icon: 'fa fa-dashboard',
					routerLink: ['/stock/tableau-de-bord']
				}
				/*
				{
					label: 'Situation de stock',
					icon: 'fa fa-archive',
					routerLink: ['/stock/situation-de-stock']
				}7
				*/
			]
		},
		{
			label: 'Tracé du réseau',
			icon: 'fa fa-map',
			items: [
				{
					label: 'Carte du réseau',
					icon: 'fa fa-map-marker',
					routerLink: ['/reseau/trace-reseau']
				},
				{
					label: 'Modélisation',
					icon: 'fa fa-cube',
					routerLink: ['/reseau/modelisation']
				}
			]
		}
	];
}
