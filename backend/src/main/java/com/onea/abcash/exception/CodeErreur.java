package com.onea.abcash.exception;

import com.onea.abcash.exception.configuration.AbstractCodeErreur;

public enum CodeErreur implements AbstractCodeErreur {
	;

	/**
	 * Valeur minimale des codes de cette application.
	 */
	public static final int CODE_MIN = 7000;

	/**
	 * Valeur maximale des codes de cette application.
	 */
	public static final int CODE_MAX = 7999;

	private final Long code;

	CodeErreur(Long code) {
		if (code < CODE_MIN || code > CODE_MAX) {
			throw new IllegalStateException(String.format("Le code erreur doit se trouver entre %s et %s", CODE_MIN, CODE_MAX));
		}
		this.code = code;
	}

	@Override
	public Long getCode() {
		return code;
	}

	@Override
	public String getType() {
		return this.name();
	}
}
