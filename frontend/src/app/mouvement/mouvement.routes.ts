import {Routes} from '@angular/router';
import {Entree} from "@/mouvement/entree/entree.component";
import {Sortie} from "@/mouvement/sortie/sortie.component";

export default [
	{path: '', redirectTo: '/mouvement/entree', pathMatch: 'full'},
	{
		path: 'entree',
		data: {breadcrumb: 'Entrée'},
		component: Entree
	},
	{
		path: 'sortie',
		data: {breadcrumb: 'Sortie'},
		component: Sortie
	},
	{path: '**', redirectTo: '/notfound'}
] as Routes;
