package com.onea.abcash.exception.configuration;

/**
 * Interface des codes erreurs de l'application.
 */
public interface AbstractCodeErreur {

	/**
	 * Retourne le code de l'erreur.
	 *
	 * @return le code de l'erreur.
	 */
	Long getCode();

	/**
	 * Retourne le type de l'erreur.
	 *
	 * @return le type de l'erreur.
	 */
	String getType();
}
