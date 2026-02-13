package com.onea.abcash.controller;

import com.onea.abcash.configuration.logger.Logged;
import com.onea.abcash.facade.UtilisateurFacade;
import com.onea.abcash.presentation.dto.UtilisateurDto;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ws/utilisateur")
@SecurityRequirement(name = "Authorization")
public class UtilisateurController {

	private final UtilisateurFacade utilisateurFacade;

	public UtilisateurController(UtilisateurFacade utilisateurFacade) {
		this.utilisateurFacade = utilisateurFacade;
	}

	/**
	 * Liste tous les utilisateurs.
	 *
	 * @return la liste {@link UtilisateurDto} des utilisateurs.
	 */
	@GetMapping("/lister")
	@PreAuthorize("hasAuthority('ADMIN')")
	@Logged
	public List<UtilisateurDto> lister() {
		return utilisateurFacade.lister();
	}

	/**
	 * Enregistre un utilisateur.
	 *
	 * @param utilisateurDto l'utilisateur.
	 */
	@PostMapping("/enregistrer")
	@PreAuthorize("hasAuthority('ADMIN')")
	@Logged
	public void enregistrer(@RequestBody UtilisateurDto utilisateurDto) {
		utilisateurFacade.enregistrer(utilisateurDto);
	}

}
