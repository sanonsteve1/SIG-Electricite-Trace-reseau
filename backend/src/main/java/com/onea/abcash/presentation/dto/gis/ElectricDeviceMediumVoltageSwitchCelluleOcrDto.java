package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.ElectricDeviceMediumVoltageSwitchCelluleOcr;
import java.time.LocalDateTime;

public class ElectricDeviceMediumVoltageSwitchCelluleOcrDto {

    private Integer id;

    private Integer objectid;
    private String anomaly;
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
    private Integer nominalvoltage;
    private Integer normaloperatingstatus;
    private String notes;
    private String ocrtype;
    private Integer phasesnormal;
    private String username;
    private Integer qualityverified;
    private String validator;
    private Integer switchtype;
    private String feederscode;

    public ElectricDeviceMediumVoltageSwitchCelluleOcrDto() {}

    public ElectricDeviceMediumVoltageSwitchCelluleOcrDto(ElectricDeviceMediumVoltageSwitchCelluleOcr e) {
        if (e == null) return;
        this.id = e.getId();
        this.objectid = e.getObjectid();
        this.anomaly = e.getAnomaly();
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
        this.nominalvoltage = e.getNominalvoltage();
        this.normaloperatingstatus = e.getNormaloperatingstatus();
        this.notes = e.getNotes();
        this.ocrtype = e.getOcrtype();
        this.phasesnormal = e.getPhasesnormal();
        this.username = e.getUsername();
        this.qualityverified = e.getQualityverified();
        this.validator = e.getValidator();
        this.switchtype = e.getSwitchtype();
        this.feederscode = e.getFeederscode();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getObjectid() { return objectid; }
    public void setObjectid(Integer objectid) { this.objectid = objectid; }
    public String getAnomaly() { return anomaly; }
    public void setAnomaly(String anomaly) { this.anomaly = anomaly; }
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
    public Integer getNominalvoltage() { return nominalvoltage; }
    public void setNominalvoltage(Integer nominalvoltage) { this.nominalvoltage = nominalvoltage; }
    public Integer getNormaloperatingstatus() { return normaloperatingstatus; }
    public void setNormaloperatingstatus(Integer normaloperatingstatus) { this.normaloperatingstatus = normaloperatingstatus; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getOcrtype() { return ocrtype; }
    public void setOcrtype(String ocrtype) { this.ocrtype = ocrtype; }
    public Integer getPhasesnormal() { return phasesnormal; }
    public void setPhasesnormal(Integer phasesnormal) { this.phasesnormal = phasesnormal; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }
    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }
    public Integer getSwitchtype() { return switchtype; }
    public void setSwitchtype(Integer switchtype) { this.switchtype = switchtype; }
    public String getFeederscode() { return feederscode; }
    public void setFeederscode(String feederscode) { this.feederscode = feederscode; }
}