package com.onea.abcash.presentation.dto;

public class VersionDto {

	private String version;
	private String sha1;

	public VersionDto() {}

	public VersionDto(String version, String sha1) {
		this.version = version;
		this.sha1 = sha1;
	}

	public String getVersion() {
		return version;
	}

	public String getSha1() {
		return sha1;
	}
}
