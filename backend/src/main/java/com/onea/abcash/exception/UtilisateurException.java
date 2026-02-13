package com.onea.abcash.exception;

import com.onea.abcash.exception.configuration.AbstractApplicationException;
import com.onea.abcash.exception.configuration.CodeErreurTechnique;

import java.util.Collection;

import static java.util.Collections.singleton;

public class UtilisateurException extends AbstractApplicationException {

	private UtilisateurException(CodeErreurTechnique codeErreur, String message) {
		super(codeErreur.getCode(), message);
	}

	private UtilisateurException(CodeErreurTechnique codeErreur, String message, Collection<String> parametres) {
		super(codeErreur.getCode(), message, parametres);
	}

	/**
	 * Exception levée si aucun utilisateur n'est trouvé.
	 */
	public static UtilisateurException motDePasseIncorrect() {
		return new UtilisateurException(CodeErreurTechnique.MOT_DE_PASSE_INCORRECT, "Le mot de passe saisi est incorrect");
	}

	/**
	 * Exception levée si aucun utilisateur n'est trouvé.
	 */
	public static UtilisateurException utilisateurInactif() {
		return new UtilisateurException(CodeErreurTechnique.UTILISATEUR_INNACTIF, "Cet utilisateur est inactif. Contactez votre administrateur");
	}

	/**
	 * Exception levée si aucun utilisateur n'est trouvé.
	 */
	public static UtilisateurException utiilisateurInconnu(String nomUtilisateur) {
		return new UtilisateurException(CodeErreurTechnique.UTILISATEUR_INCONNU, "Aucun utilisateur trouvé avec le login %s", singleton(nomUtilisateur));
	}

	/**
	 * Exception levée lorsque le token a expiré.
	 */
	public static UtilisateurException sessionExpiree() {
		return new UtilisateurException(CodeErreurTechnique.ACCES_REFUSE, "Desolé votre token n'est plus valide");
	}
}
