package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.Lignes;
import java.time.LocalDateTime;

public class LignesDto {

    private Integer id;

    private String t;

    public LignesDto() {}

    public LignesDto(Lignes e) {
        if (e == null) return;
        this.id = e.getId();
        this.t = e.getT();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getT() { return t; }
    public void setT(String t) { this.t = t; }
}