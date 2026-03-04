package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.SpatialRefSys;
import java.time.LocalDateTime;

public class SpatialRefSysDto {

    private Integer id;

    private String authName;
    private Integer authSrid;
    private String srtext;
    private String proj4text;

    public SpatialRefSysDto() {}

    public SpatialRefSysDto(SpatialRefSys e) {
        if (e == null) return;
        this.id = e.getId();
        this.authName = e.getAuthName();
        this.authSrid = e.getAuthSrid();
        this.srtext = e.getSrtext();
        this.proj4text = e.getProj4text();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getAuthName() { return authName; }
    public void setAuthName(String authName) { this.authName = authName; }
    public Integer getAuthSrid() { return authSrid; }
    public void setAuthSrid(Integer authSrid) { this.authSrid = authSrid; }
    public String getSrtext() { return srtext; }
    public void setSrtext(String srtext) { this.srtext = srtext; }
    public String getProj4text() { return proj4text; }
    public void setProj4text(String proj4text) { this.proj4text = proj4text; }
}