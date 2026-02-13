package com.onea.abcash.presentation.dto;

import java.util.List;

public class StatutImportPharmacieDto {
	private int nbreLigneAImporter;
	private List<ImportPharmacieDto> pharmaciesNonImportees;


	public StatutImportPharmacieDto() {

	}

	public StatutImportPharmacieDto(int nbrLigneAInforme, List<ImportPharmacieDto> importPharmacieDtos) {
		this.nbreLigneAImporter = nbrLigneAInforme;
		this.pharmaciesNonImportees = importPharmacieDtos;
	}

	public int getNbreLigneAImporter() {
		return nbreLigneAImporter;
	}

	public List<ImportPharmacieDto> getPharmaciesNonImportees() {
		return pharmaciesNonImportees;
	}
}
