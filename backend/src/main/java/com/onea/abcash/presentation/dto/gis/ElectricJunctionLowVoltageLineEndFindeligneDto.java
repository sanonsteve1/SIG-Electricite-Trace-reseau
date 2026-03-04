package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.ElectricJunctionLowVoltageLineEndFindeligne;
import java.time.LocalDateTime;

public class ElectricJunctionLowVoltageLineEndFindeligneDto {

    private Integer id;

    private Integer objectid;
    private Integer assetgroup;
    private Integer assettype;
    private String globalid;
    private Integer phasesnormal;
    private String createdUser;
    private LocalDateTime createdDate;
    private String lastEditedUser;
    private LocalDateTime lastEditedDate;
    private Integer qualityverified;
    private Integer manufacturer;
    private String username;
    private String validator;
    private Integer numphasesconstructed;
    private String notes;

    public ElectricJunctionLowVoltageLineEndFindeligneDto() {}

    public ElectricJunctionLowVoltageLineEndFindeligneDto(ElectricJunctionLowVoltageLineEndFindeligne e) {
        if (e == null) return;
        this.id = e.getId();
        this.objectid = e.getObjectid();
        this.assetgroup = e.getAssetgroup();
        this.assettype = e.getAssettype();
        this.globalid = e.getGlobalid();
        this.phasesnormal = e.getPhasesnormal();
        this.createdUser = e.getCreatedUser();
        this.createdDate = e.getCreatedDate();
        this.lastEditedUser = e.getLastEditedUser();
        this.lastEditedDate = e.getLastEditedDate();
        this.qualityverified = e.getQualityverified();
        this.manufacturer = e.getManufacturer();
        this.username = e.getUsername();
        this.validator = e.getValidator();
        this.numphasesconstructed = e.getNumphasesconstructed();
        this.notes = e.getNotes();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getObjectid() { return objectid; }
    public void setObjectid(Integer objectid) { this.objectid = objectid; }
    public Integer getAssetgroup() { return assetgroup; }
    public void setAssetgroup(Integer assetgroup) { this.assetgroup = assetgroup; }
    public Integer getAssettype() { return assettype; }
    public void setAssettype(Integer assettype) { this.assettype = assettype; }
    public String getGlobalid() { return globalid; }
    public void setGlobalid(String globalid) { this.globalid = globalid; }
    public Integer getPhasesnormal() { return phasesnormal; }
    public void setPhasesnormal(Integer phasesnormal) { this.phasesnormal = phasesnormal; }
    public String getCreatedUser() { return createdUser; }
    public void setCreatedUser(String createdUser) { this.createdUser = createdUser; }
    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
    public String getLastEditedUser() { return lastEditedUser; }
    public void setLastEditedUser(String lastEditedUser) { this.lastEditedUser = lastEditedUser; }
    public LocalDateTime getLastEditedDate() { return lastEditedDate; }
    public void setLastEditedDate(LocalDateTime lastEditedDate) { this.lastEditedDate = lastEditedDate; }
    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }
    public Integer getManufacturer() { return manufacturer; }
    public void setManufacturer(Integer manufacturer) { this.manufacturer = manufacturer; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }
    public Integer getNumphasesconstructed() { return numphasesconstructed; }
    public void setNumphasesconstructed(Integer numphasesconstructed) { this.numphasesconstructed = numphasesconstructed; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}