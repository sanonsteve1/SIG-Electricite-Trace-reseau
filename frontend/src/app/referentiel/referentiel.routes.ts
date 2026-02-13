import {Routes} from '@angular/router';
import {Produit} from "@/referentiel/produit/produit.component";
import {Categorie} from "@/referentiel/categorie/categorie.component";

export default [
	{path: '', redirectTo: '/referentiel/produit', pathMatch: 'full'},
	{
		path: 'produit',
		data: {breadcrumb: 'Produit'},
		component: Produit
	},
	{
		path: 'categorie',
		data: {breadcrumb: 'Catégorie'},
		component: Categorie
	},
	{path: '**', redirectTo: '/notfound'}
] as Routes;
