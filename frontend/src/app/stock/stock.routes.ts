import {Routes} from '@angular/router';
import {TableauDeBord} from "@/stock/tableau-de-bord/tableau-de-bord.component";
import {SituationDeStock} from "@/stock/situation-de-stock/situation-de-stock.component";

export default [
	{path: '', redirectTo: '/stock/tableau-de-bord', pathMatch: 'full'},
	{
		path: 'tableau-de-bord',
		data: {breadcrumb: 'Tableau de bord	'},
		component: TableauDeBord
	},
	{
		path: 'situation-de-stock',
		data: {breadcrumb: 'Situation de stock'},
		component: SituationDeStock
	},
	{path: '**', redirectTo: '/notfound'}
] as Routes;
