package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.PointConnecte;
import java.time.LocalDateTime;

public class PointConnecteDto {

    private Long id;

    private String t;

    public PointConnecteDto() {}

    public PointConnecteDto(PointConnecte e) {
        if (e == null) return;
        this.id = e.getId();
        this.t = e.getT();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getT() { return t; }
    public void setT(String t) { this.t = t; }
}