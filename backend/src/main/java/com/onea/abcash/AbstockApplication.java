package com.onea.abcash;

import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;


import static io.swagger.v3.oas.annotations.enums.SecuritySchemeIn.HEADER;
import static io.swagger.v3.oas.annotations.enums.SecuritySchemeType.APIKEY;

@SpringBootApplication
@SecurityScheme(name = "Authorization", scheme = "basic", type = APIKEY, in = HEADER)
public class AbstockApplication extends SpringBootServletInitializer {
	public static final Logger log = LoggerFactory.getLogger(AbstockApplication.class);

	public static void main(String[] args) {

		SpringApplication.run(AbstockApplication.class, args);
		log.info("""

				================================================================================================
				                                   ABPROJECT started...
				================================================================================================"""
		);
	}

	@Override
	protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
		return application.sources(AbstockApplication.class);
	}

}
