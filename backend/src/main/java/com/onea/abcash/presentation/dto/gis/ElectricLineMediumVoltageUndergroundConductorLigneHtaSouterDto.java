package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.ElectricLineMediumVoltageUndergroundConductorLigneHtaSouter;
import java.time.LocalDateTime;

public class ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto {

    private Integer id;

    private Integer objectid;
    private Integer assetgroup;
    private Integer assettype;
    private Integer commonconductortype;
    private LocalDateTime createdDate;
    private String createdUser;
    private String globalid;
    private LocalDateTime installdate;
    private LocalDateTime lastEditedDate;
    private String lastEditedUser;
    private Integer lifecyclestatus;
    private Integer nominalvoltage;
    private Integer phasesnormal;
    private Integer qualityverified;
    private Integer conductorstatus;
    private String conductorsize;
    private Integer ownedby;
    private Integer typeofmaterial;
    private String username;
    private String validator;
    private String sourceoffunding;
    private String notes;
    private String assetid;
    private Integer numphasesconstructed;
    private Integer section;
    private Integer phasechange;
    private Integer phasesenergized;
    private Double shapeLength;

    public ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto() {}

    public ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto(ElectricLineMediumVoltageUndergroundConductorLigneHtaSouter e) {
        if (e == null) return;
        this.id = e.getId();
        this.objectid = e.getObjectid();
        this.assetgroup = e.getAssetgroup();
        this.assettype = e.getAssettype();
        this.commonconductortype = e.getCommonconductortype();
        this.createdDate = e.getCreatedDate();
        this.createdUser = e.getCreatedUser();
        this.globalid = e.getGlobalid();
        this.installdate = e.getInstalldate();
        this.lastEditedDate = e.getLastEditedDate();
        this.lastEditedUser = e.getLastEditedUser();
        this.lifecyclestatus = e.getLifecyclestatus();
        this.nominalvoltage = e.getNominalvoltage();
        this.phasesnormal = e.getPhasesnormal();
        this.qualityverified = e.getQualityverified();
        this.conductorstatus = e.getConductorstatus();
        this.conductorsize = e.getConductorsize();
        this.ownedby = e.getOwnedby();
        this.typeofmaterial = e.getTypeofmaterial();
        this.username = e.getUsername();
        this.validator = e.getValidator();
        this.sourceoffunding = e.getSourceoffunding();
        this.notes = e.getNotes();
        this.assetid = e.getAssetid();
        this.numphasesconstructed = e.getNumphasesconstructed();
        this.section = e.getSection();
        this.phasechange = e.getPhasechange();
        this.phasesenergized = e.getPhasesenergized();
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
    public LocalDateTime getInstalldate() { return installdate; }
    public void setInstalldate(LocalDateTime installdate) { this.installdate = installdate; }
    public LocalDateTime getLastEditedDate() { return lastEditedDate; }
    public void setLastEditedDate(LocalDateTime lastEditedDate) { this.lastEditedDate = lastEditedDate; }
    public String getLastEditedUser() { return lastEditedUser; }
    public void setLastEditedUser(String lastEditedUser) { this.lastEditedUser = lastEditedUser; }
    public Integer getLifecyclestatus() { return lifecyclestatus; }
    public void setLifecyclestatus(Integer lifecyclestatus) { this.lifecyclestatus = lifecyclestatus; }
    public Integer getNominalvoltage() { return nominalvoltage; }
    public void setNominalvoltage(Integer nominalvoltage) { this.nominalvoltage = nominalvoltage; }
    public Integer getPhasesnormal() { return phasesnormal; }
    public void setPhasesnormal(Integer phasesnormal) { this.phasesnormal = phasesnormal; }
    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }
    public Integer getConductorstatus() { return conductorstatus; }
    public void setConductorstatus(Integer conductorstatus) { this.conductorstatus = conductorstatus; }
    public String getConductorsize() { return conductorsize; }
    public void setConductorsize(String conductorsize) { this.conductorsize = conductorsize; }
    public Integer getOwnedby() { return ownedby; }
    public void setOwnedby(Integer ownedby) { this.ownedby = ownedby; }
    public Integer getTypeofmaterial() { return typeofmaterial; }
    public void setTypeofmaterial(Integer typeofmaterial) { this.typeofmaterial = typeofmaterial; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }
    public String getSourceoffunding() { return sourceoffunding; }
    public void setSourceoffunding(String sourceoffunding) { this.sourceoffunding = sourceoffunding; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getAssetid() { return assetid; }
    public void setAssetid(String assetid) { this.assetid = assetid; }
    public Integer getNumphasesconstructed() { return numphasesconstructed; }
    public void setNumphasesconstructed(Integer numphasesconstructed) { this.numphasesconstructed = numphasesconstructed; }
    public Integer getSection() { return section; }
    public void setSection(Integer section) { this.section = section; }
    public Integer getPhasechange() { return phasechange; }
    public void setPhasechange(Integer phasechange) { this.phasechange = phasechange; }
    public Integer getPhasesenergized() { return phasesenergized; }
    public void setPhasesenergized(Integer phasesenergized) { this.phasesenergized = phasesenergized; }
    public Double getShapeLength() { return shapeLength; }
    public void setShapeLength(Double shapeLength) { this.shapeLength = shapeLength; }
}