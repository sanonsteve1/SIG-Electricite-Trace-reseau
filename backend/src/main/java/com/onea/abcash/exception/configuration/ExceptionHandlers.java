package com.onea.abcash.exception.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.NoResultException;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

import static com.onea.abcash.exception.configuration.CodeErreurTechnique.ACCES_REFUSE;
import static com.onea.abcash.exception.configuration.CodeErreurTechnique.AUCUN_RESULTAT;
import static com.onea.abcash.exception.configuration.CodeErreurTechnique.ERREUR_INCONNUE;

/**
 * Gestion des exceptions avec spring MVC.
 */
@ControllerAdvice
public class ExceptionHandlers extends ResponseEntityExceptionHandler {

	public static final int CODE_HTTP_OPTIMISTICLOCK = 550;
	/**
	 * Encodage par défaut des messages json
	 */
	public static final Charset ENCODAGE_MESSAGE = StandardCharsets.UTF_8;
	public static final Logger log = LoggerFactory.getLogger(ExceptionHandlers.class);

	/**
	 * Permet de spécifier que la réponse http renvoie du JSON.
	 *
	 * @param erreur   l'erreur à renvoyer.
	 * @param response la réponse HTTP.
	 */
	public static void setReponseJson(Object erreur, HttpServletResponse response) {
		try {
			ObjectMapper mapper = new ObjectMapper();
			String json = mapper.writeValueAsString(erreur);

			response.setContentType("application/json");
			response.setCharacterEncoding(ENCODAGE_MESSAGE.name());
			OutputStream os = response.getOutputStream();
			os.write(json.getBytes(ENCODAGE_MESSAGE));
		} catch (IOException ex) {
       // Ne devrait pas arriver mais...
			log.error(ex.getMessage(), ex);
		}
	}

	/**
	 * Permet de gérer les exceptions lancées lorsqu'on n'a aucun résultat pour une requête en base.
	 *
	 * @param ex       l'exception lorsqu'on n'a aucun résultat pour une requête en base.
	 * @param response la réponse HTTP.
	 */
	@ExceptionHandler(NoResultException.class)
	public void handleNoResultException(NoResultException ex, HttpServletResponse response) {
		response.setStatus(HttpStatus.NOT_FOUND.value());

		ApplicationErreur msg = new ApplicationErreur(AUCUN_RESULTAT, "Aucun résultat trouvé");

		log.warn(msg.getMessageAvecCode());
		log.warn(ex.getMessage(), ex);
		setReponseJson(msg, response);
	}

	/**
	 * Permet de gérer les exceptions liés à un échec d'authentification avec Spring Security.
	 * C'est l'exception renvoyée lorsqu'une erreur est renvoyée liée à
	 * l'annotation @Secured.
	 *
	 * @param ex       L'exception.
	 * @param response La réponse HTTP.
	 */
	@ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
	public void handleAuthenticationCredentialsNotFoundException(AuthenticationCredentialsNotFoundException ex, HttpServletResponse response) {
		response.setStatus(HttpStatus.UNAUTHORIZED.value());

		ApplicationErreur erreur = new ApplicationErreur(ACCES_REFUSE, "Nom d'utilisateur ou mode passe erroné");
		handleUnauthorizedError(ex, erreur, response);
	}

	private void handleUnauthorizedError(Exception ex, ApplicationErreur erreur, HttpServletResponse response) {
		log.warn(erreur.getMessageAvecCode());
		log.debug(ex.getMessage(), ex);
		setReponseJson(erreur, response);
	}

	/**
	 * Permet de gérer les exceptions lancées lorsqu'une entité cherchée n'existe pas en base.
	 *
	 * @param ex       l'exception pour l'entité qui n'existe pas en base.
	 * @param response la réponse HTTP.
	 */
	@ExceptionHandler(EntiteNonConnueException.class)
	public void handleEntiteNonConnueException(EntiteNonConnueException ex, HttpServletResponse response) {
		response.setStatus(HttpStatus.NOT_FOUND.value());

		log.warn(ex.getMessageAvecCode());
		log.warn(ex.getMessage(), ex);
		setReponseJson(ex.getApplicationErreur(), response);
	}

	@ExceptionHandler(AbstractApplicationException.class)
	public void handleAbstractApplicationException(AbstractApplicationException ex, HttpServletResponse response) {
		response.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());

		log.error(ex.getMessageAvecCode());
		log.debug(ex.getMessage(), ex);
		setReponseJson(ex.getApplicationErreur(), response);
	}

	@ExceptionHandler(RuntimeException.class)
	public void handlexceptionInconnue(RuntimeException ex, HttpServletResponse response) {
		response.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
		ApplicationErreur erreur = new ApplicationErreur(ERREUR_INCONNUE, "Une erreur inattendue s'est produite. Veuillez contacter votre administrateur.");
		log.error(erreur.getMessageAvecCode());
		log.error(ex.getMessage());
		setReponseJson(erreur, response);
	}
}
