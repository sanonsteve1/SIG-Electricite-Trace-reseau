package com.onea.abcash.exception.configuration;

import java.util.Collection;

/**
 * Classe parente pour toutes les exceptions liées à un code erreur.
 * Le code erreur doit implémenter l'interface HasCodeErreur.<br/>
 * Chaque code erreur doit être utilisé par une et une seule exception.
 *
 * @see AbstractCodeErreur
 * @see ApplicationErreur
 */
public abstract class AbstractApplicationException extends RuntimeException {

	private final Long codeErreur;
	private final String typeErreur;
	private final String message;
	private Collection<String> parametres;

	protected AbstractApplicationException(Long codeErreur, String message) {
		this(codeErreur, TypeErreur.ERROR.name(), message);
	}

	protected AbstractApplicationException(Long codeErreur, String typeErreur, String message) {
		this.codeErreur = codeErreur;
		this.message = message;
		this.typeErreur = typeErreur;
	}

	protected AbstractApplicationException(Long codeErreur, String message, Collection<String> parametres) {
		this(codeErreur, message);
		this.parametres = parametres;
	}

	/**
	 * Retourne l'ApplicationErreur correspondant à cette exception <br>
	 * composée du code au format string, du message de l'exception et du code au format long
	 *
	 * @return le message d'erreur.
	 */
	public ApplicationErreur getApplicationErreur() {
		return new ApplicationErreur(codeErreur, typeErreur, getMessage(), parametres);
	}

	/**
	 * Retourne un message préformaté avec le code erreur et le message.
	 *
	 * @return le message d'erreur.
	 */
	public final String getMessageAvecCode() {
		return getApplicationErreur().getMessageAvecCode();
	}

	@Override
	public String getMessage() {
		return message;
	}
}
