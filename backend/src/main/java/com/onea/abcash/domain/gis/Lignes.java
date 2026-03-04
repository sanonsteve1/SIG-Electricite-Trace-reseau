package com.onea.abcash.domain.gis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lignes")
public class Lignes {

    @Id
    private Integer id;

    private String t;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getT() { return t; }
    public void setT(String t) { this.t = t; }

}