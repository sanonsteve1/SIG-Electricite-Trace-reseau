package com.onea.abcash.configuration.openapi;

import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

/**
 * Permet de configurer swagger
 */
@Configuration
public class OpenApi30Config {

	private final String moduleName;
	private final String apiVersion;

	public OpenApi30Config(@Value("${app.name}") String moduleName, @Value("${api-version}") String apiVersion) {
		this.moduleName = moduleName;
		this.apiVersion = apiVersion;
	}

	@Bean
	public OpenAPI customOpenAPI() {
		final String securitySchemeName = "bearerAuth";
		final String apiTitle = String.format("%s API", StringUtils.capitalize(moduleName));
		return new OpenAPI()
				// On dit à OpenAPI que toutes l'api est protégée
				.addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
				.components(
						new Components()
								.addSecuritySchemes(securitySchemeName,
										new SecurityScheme()
												.name(securitySchemeName)
												.type(SecurityScheme.Type.HTTP)
												.scheme("bearer")
												.bearerFormat("JWT")
								)
				)
				.info(new Info().title(apiTitle).version(apiVersion));
	}
}
