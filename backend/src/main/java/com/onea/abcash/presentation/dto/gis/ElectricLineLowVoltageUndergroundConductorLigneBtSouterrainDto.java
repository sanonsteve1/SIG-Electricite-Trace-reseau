package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.ElectricLineLowVoltageUndergroundConductorLigneBtSouterrain;
import java.time.LocalDateTime;

public class ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto {

    private Integer id;

    private Integer objectid;
    private Integer assetgroup;
    private Integer assettype;
    private Integer commonconductortype;
    private LocalDateTime createdDate;
    private String createdUser;
    private String globalid;
    private LocalDateTime lastEditedDate;
    private String lastEditedUser;
    private Integer lifecyclestatus;
    private Integer neutraltype;
    private Integer nominalvoltage;
    private Integer phasesnormal;
    private String sourceoffunding;
    private Integer qualityverified;
    private Integer conductorstatus;
    private String username;
    private String validator;
    private String assetid;
    private Integer linetype;
    private String lowvoltagefeedercode;
    private Integer numphasesconstructed;
    private Integer typeofmaterial;
    private String validatedby;
    private Integer section;
    private String conductorsize;
    private Integer phasechange;
    private Integer phasesenergized;
    private String notes;
    private Double shapeLength;

    public ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto() {}

    public ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto(ElectricLineLowVoltageUndergroundConductorLigneBtSouterrain e) {
        if (e == null) return;
        this.id = e.getId();
        this.objectid = e.getObjectid();
        this.assetgroup = e.getAssetgroup();
        this.assettype = e.getAssettype();
        this.commonconductortype = e.getCommonconductortype();
        this.createdDate = e.getCreatedDate();
        this.createdUser = e.getCreatedUser();
        this.globalid = e.getGlobalid();
        this.lastEditedDate = e.getLastEditedDate();
        this.lastEditedUser = e.getLastEditedUser();
        this.lifecyclestatus = e.getLifecyclestatus();
        this.neutraltype = e.getNeutraltype();
        this.nominalvoltage = e.getNominalvoltage();
        this.phasesnormal = e.getPhasesnormal();
        this.sourceoffunding = e.getSourceoffunding();
        this.qualityverified = e.getQualityverified();
        this.conductorstatus = e.getConductorstatus();
        this.username = e.getUsername();
        this.validator = e.getValidator();
        this.assetid = e.getAssetid();
        this.linetype = e.getLinetype();
        this.lowvoltagefeedercode = e.getLowvoltagefeedercode();
        this.numphasesconstructed = e.getNumphasesconstructed();
        this.typeofmaterial = e.getTypeofmaterial();
        this.validatedby = e.getValidatedby();
        this.section = e.getSection();
        this.conductorsize = e.getConductorsize();
        this.phasechange = e.getPhasechange();
        this.phasesenergized = e.getPhasesenergized();
        this.notes = e.getNotes();
        this.shapeLength = e.getShapeLength();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getObjectid() { return objectid; }
    public void setObjectid(Integer objectid) { this.objectid = objectid; }
    public Integer getAssetgroup() { return assetgroup; }
    public void setAssetgroup(Integer assetgroup) { this.assetgroup = assetgroup; }
    public Integer getAssettype() { return assettype; }
    public void setAssettype(Integer assettype) { this.assettype = assettype; }
    public Integer getCommonconductortype() { return commonconductortype; }
    public void setCommonconductortype(Integer commonconductortype) { this.commonconductortype = commonconductortype; }
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
    public Integer getNeutraltype() { return neutraltype; }
    public void setNeutraltype(Integer neutraltype) { this.neutraltype = neutraltype; }
    public Integer getNominalvoltage() { return nominalvoltage; }
    public void setNominalvoltage(Integer nominalvoltage) { this.nominalvoltage = nominalvoltage; }
    public Integer getPhasesnormal() { return phasesnormal; }
    public void setPhasesnormal(Integer phasesnormal) { this.phasesnormal = phasesnormal; }
    public String getSourceoffunding() { return sourceoffunding; }
    public void setSourceoffunding(String sourceoffunding) { this.sourceoffunding = sourceoffunding; }
    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }
    public Integer getConductorstatus() { return conductorstatus; }
    public void setConductorstatus(Integer conductorstatus) { this.conductorstatus = conductorstatus; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }
    public String getAssetid() { return assetid; }
    public void setAssetid(String assetid) { this.assetid = assetid; }
    public Integer getLinetype() { return linetype; }
    public void setLinetype(Integer linetype) { this.linetype = linetype; }
    public String getLowvoltagefeedercode() { return lowvoltagefeedercode; }
    public void setLowvoltagefeedercode(String lowvoltagefeedercode) { this.lowvoltagefeedercode = lowvoltagefeedercode; }
    public Integer getNumphasesconstructed() { return numphasesconstructed; }
    public void setNumphasesconstructed(Integer numphasesconstructed) { this.numphasesconstructed = numphasesconstructed; }
    public Integer getTypeofmaterial() { return typeofmaterial; }
    public void setTypeofmaterial(Integer typeofmaterial) { this.typeofmaterial = typeofmaterial; }
    public String getValidatedby() { return validatedby; }
    public void setValidatedby(String validatedby) { this.validatedby = validatedby; }
    public Integer getSection() { return section; }
    public void setSection(Integer section) { this.section = section; }
    public String getConductorsize() { return conductorsize; }
    public void setConductorsize(String conductorsize) { this.conductorsize = conductorsize; }
    public Integer getPhasechange() { return phasechange; }
    public void setPhasechange(Integer phasechange) { this.phasechange = phasechange; }
    public Integer getPhasesenergized() { return phasesenergized; }
    public void setPhasesenergized(Integer phasesenergized) { this.phasesenergized = phasesenergized; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Double getShapeLength() { return shapeLength; }
    public void setShapeLength(Double shapeLength) { this.shapeLength = shapeLength; }
}