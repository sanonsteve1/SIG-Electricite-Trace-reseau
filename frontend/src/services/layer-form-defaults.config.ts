/**
 * Configuration des valeurs par défaut pour le pré-remplissage automatique
 * des formulaires d'ouvrages, par type de couche (slug).
 *
 * Chaque entrée peut être :
 * - une clé exacte (slug tel que renvoyé par l'API, ex: "distributionpanel-branchement")
 * - une clé pattern se terminant par "*" (ex: "ligne-bt*" pour toute couche dont le slug contient "ligne-bt")
 *
 * Les valeurs sont appliquées uniquement aux champs vides du formulaire.
 */

export interface LayerFormDefaultsConfig {
	/** Slug exact ou pattern (suffixe avec *) */
	[key: string]: Record<string, string | number | null> | undefined;
}

export const LAYER_FORM_DEFAULTS: LayerFormDefaultsConfig = {
	// ——— Branchements (points abonnés)
	'distributionpanel-branchement': {
		connectiontype: 1,
		existencedecompteur: 'Non',
		transformationreport: 0,
		notes: 'Créé via formulaire'
	},

	// ——— Lignes branchement BT
	'ligne-branchement-bt': {},
	'electricline-lowvoltageservice-ligne-branchement-bt': {
		lifecyclestatus: 1,
		phasesnormal: 1,
		qualityverified: 0
	},

	// ——— Lignes BT aérien / souterrain
	'ligne-bt-aerien': {},
	'ligne-bt-souterrain': {},
	'electricline-lowvoltageoverheadconductor-ligne-bt-aerien': {
		lifecyclestatus: 1,
		phasesnormal: 1
	},
	'electricline-lowvoltageundergroundconductor-ligne-bt-souterrain': {
		lifecyclestatus: 1,
		phasesnormal: 1
	},

	// ——— Lignes HTA aérien / souterrain
	'ligne-hta-aerien': {},
	'ligne-hta-souter': {},
	'electricline-mediumvoltageoverheadconductor-ligne-hta-aerien': {
		lifecyclestatus: 1,
		phasesnormal: 1
	},
	'electricline-mediumvoltageundergroundconductor-ligne-hta-souter': {
		lifecyclestatus: 1,
		phasesnormal: 1
	},

	// ——— Poteaux BT / HTA
	'poteau-bt': {},
	'poteau-hta': {},
	'structurejunction-electriclowvoltagepole-poteau-bt': {
		constructionstatus: 1
	},
	'structurejunction-electricmediumvoltagepole-poteau-hta': {
		constructionstatus: 1
	},

	// ——— Postes, transformateurs, cellules
	'structureboundary-electricsubstationboundary-limite-poste-sourc': {},
	'structueboundary-electricdistributionstationboundary-limite-po': {},
	'electricdevice-highvoltagetransformer-transfo-ps': {},
	'electricdevice-mediumvoltagetransformer-transfo-ht-bt': {},
	'electricdevice-mediumvoltageswitch-cellule-ocr': {},
	'electricdevice-lowvoltagecontrolunit-tur': {},
	'electricdevice-lowvoltagenetworkprotection-disjoncteur': {},
	'electricdevice-mediumvoltagearrester-parafoudre': {},

	// ——— Noeuds, fin de ligne, coffrets
	'electricjunction-lowvoltageconnection-point-noeud-bt': {},
	'electricjunction-lowvoltagelineend-findeligne': {},
	'structurejunction-electricjunctionbox-coffret': {},

	// ——— Compteurs, abonnés, terre
	'meters-compteur': {},
	'subscriberform-abonne': {},
	'electricdevice-ground-terre': {},

	// ——— Patterns (suffixe *) : appliqués si le slug contient la partie avant *
	'ligne-bt*': { lifecyclestatus: 1, phasesnormal: 1 },
	'ligne-hta*': { lifecyclestatus: 1, phasesnormal: 1 },
	'poteau*': { constructionstatus: 1 },
	'branchement*': { notes: 'Créé via formulaire' }
};
