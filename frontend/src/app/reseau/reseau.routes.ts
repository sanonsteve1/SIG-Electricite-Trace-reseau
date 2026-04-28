import { Routes } from '@angular/router';
import { TraceReseau } from '@/reseau/trace-reseau/trace-reseau.component';
import { SchemaReseau } from '@/reseau/schema-reseau/schema-reseau.component';
import { DiagrammeReseau } from '@/reseau/diagramme-reseau/diagramme-reseau.component';
import { Modelisation } from '@/reseau/modelisation/modelisation.component';
import { ReglesComponent } from '@/reseau/regles/regles.component';

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
		path: 'diagramme-reseau',
		data: { breadcrumb: 'Diagramme du réseau' },
		component: DiagrammeReseau
	},
	{
		path: 'modelisation',
		data: { breadcrumb: 'Modélisation' },
		component: Modelisation
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
