package com.onea.abcash.exception;

import com.onea.abcash.exception.configuration.AbstractApplicationException;
import com.onea.abcash.exception.configuration.CodeErreurTechnique;
import com.onea.abcash.exception.configuration.TypeErreur;

public class VersionException extends AbstractApplicationException {

	public VersionException(Long codeErreur, String typeErreur, String message) {
		super(codeErreur, typeErreur, message);
	}

	/**
	 * Exception levée lorsqu'une erreur quelconque a été rencontrée pendant la récupération des version.
	 */
	public static VersionException erreurDeRecuperationDeVersion() {
		return new VersionException(CodeErreurTechnique.ERREUR_VERSION.getCode(), TypeErreur.ERROR.name(),
				"Une erreur s'est produite lors de la récupération de la version de l'application");
	}
}
