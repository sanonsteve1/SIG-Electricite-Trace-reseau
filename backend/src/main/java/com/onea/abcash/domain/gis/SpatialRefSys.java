package com.onea.abcash.domain.gis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "spatial_ref_sys")
public class SpatialRefSys {

    @Id
    private Integer srid;

    @Column(name = "auth_name")
    private String authName;

    @Column(name = "auth_srid")
    private Integer authSrid;

    private String srtext;

    private String proj4text;

    public Integer getId() {
        return srid;
    }

    public void setId(Integer id) {
        this.srid = id;
    }
    public Integer getSrid() { return srid; }
    public void setSrid(Integer srid) { this.srid = srid; }

    public String getAuthName() { return authName; }
    public void setAuthName(String authName) { this.authName = authName; }

    public Integer getAuthSrid() { return authSrid; }
    public void setAuthSrid(Integer authSrid) { this.authSrid = authSrid; }

    public String getSrtext() { return srtext; }
    public void setSrtext(String srtext) { this.srtext = srtext; }

    public String getProj4text() { return proj4text; }
    public void setProj4text(String proj4text) { this.proj4text = proj4text; }

}