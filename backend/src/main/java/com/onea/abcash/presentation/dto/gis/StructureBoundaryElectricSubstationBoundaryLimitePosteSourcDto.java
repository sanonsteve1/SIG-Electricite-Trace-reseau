package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.StructureBoundaryElectricSubstationBoundaryLimitePosteSourc;
import java.time.LocalDateTime;

public class StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto {

    private Integer id;

    private Integer objectid;
    private Integer assetgroup;
    private String assetid;
    private Integer assettype;
    private Integer constructionstatus;
    private LocalDateTime createdDate;
    private String createdUser;
    private String globalid;
    private LocalDateTime lastEditedDate;
    private String lastEditedUser;
    private Integer lifecyclestatus;
    private Integer materialcode;
    private String username;
    private Integer qualityverified;
    private String validator;
    private Integer maintby;
    private Integer ownedby;
    private String notes;
    private String operation;
    private Integer otherequipments;
    private Double shapeLength;
    private Double shapeArea;

    public StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto() {}

    public StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto(StructureBoundaryElectricSubstationBoundaryLimitePosteSourc e) {
        if (e == null) return;
        this.id = e.getId();
        this.objectid = e.getObjectid();
        this.assetgroup = e.getAssetgroup();
        this.assetid = e.getAssetid();
        this.assettype = e.getAssettype();
        this.constructionstatus = e.getConstructionstatus();
        this.createdDate = e.getCreatedDate();
        this.createdUser = e.getCreatedUser();
        this.globalid = e.getGlobalid();
        this.lastEditedDate = e.getLastEditedDate();
        this.lastEditedUser = e.getLastEditedUser();
        this.lifecyclestatus = e.getLifecyclestatus();
        this.materialcode = e.getMaterialcode();
        this.username = e.getUsername();
        this.qualityverified = e.getQualityverified();
        this.validator = e.getValidator();
        this.maintby = e.getMaintby();
        this.ownedby = e.getOwnedby();
        this.notes = e.getNotes();
        this.operation = e.getOperation();
        this.otherequipments = e.getOtherequipments();
        this.shapeLength = e.getShapeLength();
        this.shapeArea = e.getShapeArea();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getObjectid() { return objectid; }
    public void setObjectid(Integer objectid) { this.objectid = objectid; }
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
    public String getGlobalid() { return globalid; }
    public void setGlobalid(String globalid) { this.globalid = globalid; }
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
    public Integer getMaintby() { return maintby; }
    public void setMaintby(Integer maintby) { this.maintby = maintby; }
    public Integer getOwnedby() { return ownedby; }
    public void setOwnedby(Integer ownedby) { this.ownedby = ownedby; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getOperation() { return operation; }
    public void setOperation(String operation) { this.operation = operation; }
    public Integer getOtherequipments() { return otherequipments; }
    public void setOtherequipments(Integer otherequipments) { this.otherequipments = otherequipments; }
    public Double getShapeLength() { return shapeLength; }
    public void setShapeLength(Double shapeLength) { this.shapeLength = shapeLength; }
    public Double getShapeArea() { return shapeArea; }
    public void setShapeArea(Double shapeArea) { this.shapeArea = shapeArea; }
}