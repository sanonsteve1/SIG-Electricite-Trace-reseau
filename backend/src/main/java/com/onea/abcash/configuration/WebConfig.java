package com.onea.abcash.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableWebMvc
public class WebConfig implements WebMvcConfigurer {

	@Value("${client.base_url.local}")
	private String clientLocal;

	@Value("${client.base_url.online}")
	private String clientOnline;

	@Value("${photo.windows_base_path}")
	public String windowsBasePath;

	@Value("${photo.linux_base_path}")
	public String linuxBasePath;

	@Override
	public void addCorsMappings(CorsRegistry corsRegistry) {
		corsRegistry.addMapping("/**")
				.allowedOrigins(clientLocal, clientOnline)
				.allowedMethods("*")
				.maxAge(3600L)
				.allowedHeaders("*")
				.exposedHeaders("Authorization")
				.allowCredentials(true);
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler("/fichiers/**")
				.addResourceLocations(
						System.getProperty("os.name").startsWith("Windows") ?
								"file:///" + windowsBasePath.replace("\\", "/")+ "/" :
								"file:" + linuxBasePath + "/"
				);
	}
}
