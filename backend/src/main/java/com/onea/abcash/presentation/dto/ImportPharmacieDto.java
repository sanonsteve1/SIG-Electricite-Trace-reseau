package com.onea.abcash.presentation.dto;

public class ImportPharmacieDto {
	private String numero;
	private String nom;
	private String ville;
	private String quartier;
	private String heureOuverture;
	private String heureFermeture;
	private String nomGerant;
	private String contact;
	private String latitude;
	private String longitude;

	public ImportPharmacieDto() {
	}

	public ImportPharmacieDto(String[] valeurs) {
		this.setNumero(valeurs[0]);
		this.setNom(valeurs[1]);
		this.setVille(valeurs[2]);
		this.setQuartier(valeurs[3]);
		this.setHeureOuverture(valeurs[4]);
		this.setHeureFermeture(valeurs[5]);
		this.setNomGerant(valeurs[6]);
		this.setContact(valeurs[7]);
		if (valeurs.length > 8) {
			this.setLongitude(valeurs[8]);
			this.setLatitude(valeurs[9]);
		}
	}

	public void setNumero(String numero) {
		this.numero = numero;
	}

	public void setNom(String nom) {
		this.nom = nom;
	}

	public void setVille(String ville) {
		this.ville = ville;
	}

	public void setQuartier(String quartier) {
		this.quartier = quartier;
	}

	public void setHeureOuverture(String heureOuverture) {
		this.heureOuverture = heureOuverture;
	}

	public void setHeureFermeture(String heureFermeture) {
		this.heureFermeture = heureFermeture;
	}

	public void setNomGerant(String nomGerant) {
		this.nomGerant = nomGerant;
	}

	public void setContact(String contact) {
		this.contact = contact;
	}

	public void setLatitude(String latitude) {
		this.latitude = latitude;
	}

	public void setLongitude(String longitude) {
		this.longitude = longitude;
	}

	public String getNom() {
		return nom;
	}

	public String getVille() {
		return ville;
	}

	public String getQuartier() {
		return quartier;
	}

	public String getHeureOuverture() {
		return heureOuverture;
	}

	public String getHeureFermeture() {
		return heureFermeture;
	}

	public String getNomGerant() {
		return nomGerant;
	}

	public String getContact() {
		return contact;
	}

	public String getLatitude() {
		return latitude;
	}

	public String getLongitude() {
		return longitude;
	}

	public String getNumero() {
		return numero;
	}

}
