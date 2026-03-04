package com.onea.abcash.domain.gis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "point_connecte")
public class PointConnecte {

    @Id
    private Long id;

    private String t;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getT() { return t; }
    public void setT(String t) { this.t = t; }

}