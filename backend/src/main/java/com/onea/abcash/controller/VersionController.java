package com.onea.abcash.controller;

import com.onea.abcash.facade.VersionFacade;
import com.onea.abcash.presentation.dto.VersionDto;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("${api.prefix}/version")
@SecurityRequirement(name = "Authorization")
public class VersionController {

	private final VersionFacade versionFacade;

	public VersionController(VersionFacade versionFacade) {
		this.versionFacade = versionFacade;
	}

	/**
	 * Retourne la version et le sha1 de l'application.
	 *
	 * @return la version et le sha1 de l'application.
	 */
	@GetMapping
	@PreAuthorize("hasAuthority('ADMIN')")
	public VersionDto recupererVersionEtSha1() {
		return versionFacade.recupererVersionEtSha1();
	}
}
