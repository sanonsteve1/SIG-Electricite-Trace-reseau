package com.onea.abcash.domain.gis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "StructueBoundary_ElectricdistributionstationBoundary_limite_po")
public class StructueBoundaryElectricdistributionstationBoundaryLimitePo {

    @Id
    @SequenceGenerator(name = "StructueBoundary_ElectricdistributionstationBoundary_limite_po_id_seq", sequenceName = "StructueBoundary_ElectricdistributionstationBoundary_limite_po_id_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "StructueBoundary_ElectricdistributionstationBoundary_limite_po_id_seq")
    private Integer id;

    private Integer objectid;

    private String globalid;

    private Integer assetgroup;

    private String assetid;

    private Integer assettype;

    private Integer constructionstatus;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "created_user")
    private String createdUser;

    @Column(name = "last_edited_date")
    private LocalDateTime lastEditedDate;

    @Column(name = "last_edited_user")
    private String lastEditedUser;

    private Integer lifecyclestatus;

    private Integer materialcode;

    private String username;

    private Integer qualityverified;

    private String validator;

    private Integer ownedby;

    private Integer maintby;

    private Integer grouding;

    private String notes;

    @Column(name = "shape_length")
    private Double shapeLength;

    @Column(name = "shape_area")
    private Double shapeArea;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getObjectid() { return objectid; }
    public void setObjectid(Integer objectid) { this.objectid = objectid; }

    public String getGlobalid() { return globalid; }
    public void setGlobalid(String globalid) { this.globalid = globalid; }

    public Integer getAssetgroup() { return assetgroup; }
    public void setAssetgroup(Integer assetgroup) { this.assetgroup = assetgroup; }

    public String getAssetid() { return assetid; }
    public void setAssetid(String assetid) { this.assetid = assetid; }

    public Integer getAssettype() { return assettype; }
    public void setAssettype(Integer assettype) { this.assettype = assettype; }

    public Integer getConstructionstatus() { return constructionstatus; }
    public void setConstructionstatus(Integer constructionstatus) { this.constructionstatus = constructionstatus; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public String getCreatedUser() { return createdUser; }
    public void setCreatedUser(String createdUser) { this.createdUser = createdUser; }

    public LocalDateTime getLastEditedDate() { return lastEditedDate; }
    public void setLastEditedDate(LocalDateTime lastEditedDate) { this.lastEditedDate = lastEditedDate; }

    public String getLastEditedUser() { return lastEditedUser; }
    public void setLastEditedUser(String lastEditedUser) { this.lastEditedUser = lastEditedUser; }

    public Integer getLifecyclestatus() { return lifecyclestatus; }
    public void setLifecyclestatus(Integer lifecyclestatus) { this.lifecyclestatus = lifecyclestatus; }

    public Integer getMaterialcode() { return materialcode; }
    public void setMaterialcode(Integer materialcode) { this.materialcode = materialcode; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }

    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }

    public Integer getOwnedby() { return ownedby; }
    public void setOwnedby(Integer ownedby) { this.ownedby = ownedby; }

    public Integer getMaintby() { return maintby; }
    public void setMaintby(Integer maintby) { this.maintby = maintby; }

    public Integer getGrouding() { return grouding; }
    public void setGrouding(Integer grouding) { this.grouding = grouding; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Double getShapeLength() { return shapeLength; }
    public void setShapeLength(Double shapeLength) { this.shapeLength = shapeLength; }

    public Double getShapeArea() { return shapeArea; }
    public void setShapeArea(Double shapeArea) { this.shapeArea = shapeArea; }

}