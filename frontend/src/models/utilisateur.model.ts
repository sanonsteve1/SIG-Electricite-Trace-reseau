export class Utilisateur {
	id: number;
	nom: string;
	prenoms: string;
	login: string;
	role: string;
	statut: string;
	username: string;
	numerique: boolean;
	fonctionnalites: string[];

	constructor(utilisateur?: Partial<Utilisateur>) {
		Object.assign(this, utilisateur);
	}

	/**
	 * Retourne le nom et prénom abrégé de l'utilisateur (John Doe => J. Doe).
	 */
	nomEtPrenomAbrege(): string {
		return this.prenoms?.trim().length ? [this.prenoms.substring(0, 1), this.nom].join('. ') : this.nom;
	}
}
