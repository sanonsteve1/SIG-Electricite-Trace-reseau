package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.ElectricDeviceLowVoltageControlUnitTUR;
import java.time.LocalDateTime;

public class ElectricDeviceLowVoltageControlUnitTURDto {

    private Integer id;

    private Integer objectid;
    private Integer assetgroup;
    private String assetid;
    private Integer assettype;
    private Integer constructionstatus;
    private LocalDateTime createdDate;
    private String createdUser;
    private String globalid;
    private LocalDateTime installdate;
    private LocalDateTime lastEditedDate;
    private String lastEditedUser;
    private Integer lifecyclestatus;
    private Integer manufacturer;
    private Integer maxoperatingvoltage;
    private Integer maxvoltage;
    private Integer nominalvoltage;
    private String lowvoltagefeederscode;
    private Integer loadtapchangepercent;
    private String breakingcapacity;
    private Integer distributionboardpanelstype;
    private Integer qualityverified;
    private Integer phasesnormal;
    private String username;
    private String validator;
    private String notes;

    public ElectricDeviceLowVoltageControlUnitTURDto() {}

    public ElectricDeviceLowVoltageControlUnitTURDto(ElectricDeviceLowVoltageControlUnitTUR e) {
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
        this.installdate = e.getInstalldate();
        this.lastEditedDate = e.getLastEditedDate();
        this.lastEditedUser = e.getLastEditedUser();
        this.lifecyclestatus = e.getLifecyclestatus();
        this.manufacturer = e.getManufacturer();
        this.maxoperatingvoltage = e.getMaxoperatingvoltage();
        this.maxvoltage = e.getMaxvoltage();
        this.nominalvoltage = e.getNominalvoltage();
        this.lowvoltagefeederscode = e.getLowvoltagefeederscode();
        this.loadtapchangepercent = e.getLoadtapchangepercent();
        this.breakingcapacity = e.getBreakingcapacity();
        this.distributionboardpanelstype = e.getDistributionboardpanelstype();
        this.qualityverified = e.getQualityverified();
        this.phasesnormal = e.getPhasesnormal();
        this.username = e.getUsername();
        this.validator = e.getValidator();
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
    public LocalDateTime getInstalldate() { return installdate; }
    public void setInstalldate(LocalDateTime installdate) { this.installdate = installdate; }
    public LocalDateTime getLastEditedDate() { return lastEditedDate; }
    public void setLastEditedDate(LocalDateTime lastEditedDate) { this.lastEditedDate = lastEditedDate; }
    public String getLastEditedUser() { return lastEditedUser; }
    public void setLastEditedUser(String lastEditedUser) { this.lastEditedUser = lastEditedUser; }
    public Integer getLifecyclestatus() { return lifecyclestatus; }
    public void setLifecyclestatus(Integer lifecyclestatus) { this.lifecyclestatus = lifecyclestatus; }
    public Integer getManufacturer() { return manufacturer; }
    public void setManufacturer(Integer manufacturer) { this.manufacturer = manufacturer; }
    public Integer getMaxoperatingvoltage() { return maxoperatingvoltage; }
    public void setMaxoperatingvoltage(Integer maxoperatingvoltage) { this.maxoperatingvoltage = maxoperatingvoltage; }
    public Integer getMaxvoltage() { return maxvoltage; }
    public void setMaxvoltage(Integer maxvoltage) { this.maxvoltage = maxvoltage; }
    public Integer getNominalvoltage() { return nominalvoltage; }
    public void setNominalvoltage(Integer nominalvoltage) { this.nominalvoltage = nominalvoltage; }
    public String getLowvoltagefeederscode() { return lowvoltagefeederscode; }
    public void setLowvoltagefeederscode(String lowvoltagefeederscode) { this.lowvoltagefeederscode = lowvoltagefeederscode; }
    public Integer getLoadtapchangepercent() { return loadtapchangepercent; }
    public void setLoadtapchangepercent(Integer loadtapchangepercent) { this.loadtapchangepercent = loadtapchangepercent; }
    public String getBreakingcapacity() { return breakingcapacity; }
    public void setBreakingcapacity(String breakingcapacity) { this.breakingcapacity = breakingcapacity; }
    public Integer getDistributionboardpanelstype() { return distributionboardpanelstype; }
    public void setDistributionboardpanelstype(Integer distributionboardpanelstype) { this.distributionboardpanelstype = distributionboardpanelstype; }
    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }
    public Integer getPhasesnormal() { return phasesnormal; }
    public void setPhasesnormal(Integer phasesnormal) { this.phasesnormal = phasesnormal; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}