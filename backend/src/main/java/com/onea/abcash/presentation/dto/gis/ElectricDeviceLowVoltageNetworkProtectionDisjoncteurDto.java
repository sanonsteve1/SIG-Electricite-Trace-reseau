package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.ElectricDeviceLowVoltageNetworkProtectionDisjoncteur;
import java.time.LocalDateTime;

public class ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto {

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
    private Integer nominalvoltage;
    private Integer normaloperatingstatus;
    private Integer phasesnormal;
    private String username;
    private Integer qualityverified;
    private String validator;
    private Integer dhptype;
    private Integer phasechange;
    private Integer maintby;
    private Integer ownedby;
    private Integer numphasesconstructed;
    private String accessorytype;
    private String notes;

    public ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto() {}

    public ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto(ElectricDeviceLowVoltageNetworkProtectionDisjoncteur e) {
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
        this.nominalvoltage = e.getNominalvoltage();
        this.normaloperatingstatus = e.getNormaloperatingstatus();
        this.phasesnormal = e.getPhasesnormal();
        this.username = e.getUsername();
        this.qualityverified = e.getQualityverified();
        this.validator = e.getValidator();
        this.dhptype = e.getDhptype();
        this.phasechange = e.getPhasechange();
        this.maintby = e.getMaintby();
        this.ownedby = e.getOwnedby();
        this.numphasesconstructed = e.getNumphasesconstructed();
        this.accessorytype = e.getAccessorytype();
        this.notes = e.getNotes();
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
    public Integer getNominalvoltage() { return nominalvoltage; }
    public void setNominalvoltage(Integer nominalvoltage) { this.nominalvoltage = nominalvoltage; }
    public Integer getNormaloperatingstatus() { return normaloperatingstatus; }
    public void setNormaloperatingstatus(Integer normaloperatingstatus) { this.normaloperatingstatus = normaloperatingstatus; }
    public Integer getPhasesnormal() { return phasesnormal; }
    public void setPhasesnormal(Integer phasesnormal) { this.phasesnormal = phasesnormal; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }
    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }
    public Integer getDhptype() { return dhptype; }
    public void setDhptype(Integer dhptype) { this.dhptype = dhptype; }
    public Integer getPhasechange() { return phasechange; }
    public void setPhasechange(Integer phasechange) { this.phasechange = phasechange; }
    public Integer getMaintby() { return maintby; }
    public void setMaintby(Integer maintby) { this.maintby = maintby; }
    public Integer getOwnedby() { return ownedby; }
    public void setOwnedby(Integer ownedby) { this.ownedby = ownedby; }
    public Integer getNumphasesconstructed() { return numphasesconstructed; }
    public void setNumphasesconstructed(Integer numphasesconstructed) { this.numphasesconstructed = numphasesconstructed; }
    public String getAccessorytype() { return accessorytype; }
    public void setAccessorytype(String accessorytype) { this.accessorytype = accessorytype; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}