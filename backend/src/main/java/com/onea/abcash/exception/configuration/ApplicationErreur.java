package com.onea.abcash.exception.configuration;

import org.apache.commons.collections4.CollectionUtils;

import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.Collection;

import static org.apache.commons.lang3.StringUtils.join;

/**
 * Objet utilisé pour transporter une erreur de l'application, spécifiés par son type, son code et son message.<br/>
 */
public class ApplicationErreur {

	private final Long code;
	private final String type;
	private final String message;
	private final Collection<String> parametres = new ArrayList<>();

	public ApplicationErreur(AbstractCodeErreur type, String message) {
		this.code = type.getCode();
		this.type = TypeErreur.ERROR.name();
		this.message = message;
	}

	public ApplicationErreur(Long codeErreur, String typeErreur, String message) {
		this.code = codeErreur;
		this.type = typeErreur;
		this.message = message;
	}

	public ApplicationErreur(Long codeErreur, String typeErreur, String message, Collection<String> parametres) {
		this(codeErreur, typeErreur, message);
		if (CollectionUtils.isNotEmpty(parametres)) {
			this.parametres.addAll(parametres);
		}
	}


	public Long getCode() {
		return code;
	}

	public String getMessage() {
		return message;
	}

	public String getType() {
		return type;
	}

	public Collection<String> getParametres() {
		return parametres;
	}

	/**
	 * Retourne le message préfixé par le code de l'erreur.
	 *
	 * @return le message préfixé par le code de l'erreur.
	 */
	public String getMessageAvecCode() {
		return MessageFormat.format("[{0,number,0000}] {1}", getCode(), String.format(getMessage(), join(parametres, ", ")));
	}
}
