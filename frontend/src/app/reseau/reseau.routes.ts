import { Routes } from '@angular/router';
import { TraceReseau } from '@/reseau/trace-reseau/trace-reseau.component';
import { SchemaReseau } from '@/reseau/schema-reseau/schema-reseau.component';
import { Modelisation } from '@/reseau/modelisation/modelisation.component';
import { ReglesComponent } from '@/reseau/regles/regles.component';
import { ExploitationUnComponent } from '@/reseau/exploitation-un/exploitation-un.component';

export default [
	{
		path: 'trace-reseau',
		data: { breadcrumb: 'Carte du réseau' },
		component: TraceReseau
	},
	{
		path: 'schema-reseau',
		data: { breadcrumb: 'Schéma du réseau' },
		component: SchemaReseau
	},
	{
		path: 'modelisation',
		data: { breadcrumb: 'Modélisation' },
		component: Modelisation
	},
	{
		path: 'exploitation-un',
		data: { breadcrumb: 'Exploitation UN' },
		component: ExploitationUnComponent
	},
	{
		path: 'regles/connectivite',
		data: { breadcrumb: 'Règles connectivité', ruleType: 'connectivite' },
		component: ReglesComponent
	},
	{
		path: 'regles/topologie',
		data: { breadcrumb: 'Règles topologie', ruleType: 'topologie' },
		component: ReglesComponent
	},
	{ path: '**', redirectTo: '/notfound' }
] as Routes;
