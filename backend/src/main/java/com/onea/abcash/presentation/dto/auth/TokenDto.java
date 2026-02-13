package com.onea.abcash.presentation.dto.auth;

import org.apache.commons.lang3.StringUtils;

import static java.util.List.of;

public class TokenDto {

	private static final String TYPE_TOKEN = "Bearer";

	private String token;

	public TokenDto() {
	}

	public TokenDto(String token) {
		this.token = StringUtils.join(of(TYPE_TOKEN, token), " ");
	}

	public String getToken() {
		return token;
	}

}
