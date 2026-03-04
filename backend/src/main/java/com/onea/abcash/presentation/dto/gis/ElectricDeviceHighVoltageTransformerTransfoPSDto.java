package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.ElectricDeviceHighVoltageTransformerTransfoPS;
import java.time.LocalDateTime;

public class ElectricDeviceHighVoltageTransformerTransfoPSDto {

    private Integer id;

    private Integer objectid;
    private Integer assetgroup;
    private String assetid;
    private Integer assettype;
    private Integer constructionstatus;
    private Integer coolingtype;
    private LocalDateTime createdDate;
    private String createdUser;
    private String globalid;
    private Integer hasarrester;
    private LocalDateTime installdate;
    private LocalDateTime lastEditedDate;
    private String lastEditedUser;
    private Integer lifecyclestatus;
    private Integer manufacturer;
    private Integer maximumpower;
    private Integer maxoperatingvoltage;
    private Integer maxvoltage;
    private Integer nominalvoltage;
    private Integer normaloperatingstatus;
    private String notes;
    private Integer phasesnormal;
    private String serialnumber;
    private Double totalmass;
    private LocalDateTime year;
    private String username;
    private Integer qualityverified;
    private String validator;
    private Integer secondaryvoltagelinetoline;
    private Integer ratedpower;
    private Integer winding;
    private Double shortcircuitvoltagepercentage;
    private Integer terminaltype;
    private String transformercode;
    private String polenumber;

    public ElectricDeviceHighVoltageTransformerTransfoPSDto() {}

    public ElectricDeviceHighVoltageTransformerTransfoPSDto(ElectricDeviceHighVoltageTransformerTransfoPS e) {
        if (e == null) return;
        this.id = e.getId();
        this.objectid = e.getObjectid();
        this.assetgroup = e.getAssetgroup();
        this.assetid = e.getAssetid();
        this.assettype = e.getAssettype();
        this.constructionstatus = e.getConstructionstatus();
        this.coolingtype = e.getCoolingtype();
        this.createdDate = e.getCreatedDate();
        this.createdUser = e.getCreatedUser();
        this.globalid = e.getGlobalid();
        this.hasarrester = e.getHasarrester();
        this.installdate = e.getInstalldate();
        this.lastEditedDate = e.getLastEditedDate();
        this.lastEditedUser = e.getLastEditedUser();
        this.lifecyclestatus = e.getLifecyclestatus();
        this.manufacturer = e.getManufacturer();
        this.maximumpower = e.getMaximumpower();
        this.maxoperatingvoltage = e.getMaxoperatingvoltage();
        this.maxvoltage = e.getMaxvoltage();
        this.nominalvoltage = e.getNominalvoltage();
        this.normaloperatingstatus = e.getNormaloperatingstatus();
        this.notes = e.getNotes();
        this.phasesnormal = e.getPhasesnormal();
        this.serialnumber = e.getSerialnumber();
        this.totalmass = e.getTotalmass();
        this.year = e.getYear();
        this.username = e.getUsername();
        this.qualityverified = e.getQualityverified();
        this.validator = e.getValidator();
        this.secondaryvoltagelinetoline = e.getSecondaryvoltagelinetoline();
        this.ratedpower = e.getRatedpower();
        this.winding = e.getWinding();
        this.shortcircuitvoltagepercentage = e.getShortcircuitvoltagepercentage();
        this.terminaltype = e.getTerminaltype();
        this.transformercode = e.getTransformercode();
        this.polenumber = e.getPolenumber();
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
    public Integer getCoolingtype() { return coolingtype; }
    public void setCoolingtype(Integer coolingtype) { this.coolingtype = coolingtype; }
    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
    public String getCreatedUser() { return createdUser; }
    public void setCreatedUser(String createdUser) { this.createdUser = createdUser; }
    public String getGlobalid() { return globalid; }
    public void setGlobalid(String globalid) { this.globalid = globalid; }
    public Integer getHasarrester() { return hasarrester; }
    public void setHasarrester(Integer hasarrester) { this.hasarrester = hasarrester; }
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
    public Integer getMaximumpower() { return maximumpower; }
    public void setMaximumpower(Integer maximumpower) { this.maximumpower = maximumpower; }
    public Integer getMaxoperatingvoltage() { return maxoperatingvoltage; }
    public void setMaxoperatingvoltage(Integer maxoperatingvoltage) { this.maxoperatingvoltage = maxoperatingvoltage; }
    public Integer getMaxvoltage() { return maxvoltage; }
    public void setMaxvoltage(Integer maxvoltage) { this.maxvoltage = maxvoltage; }
    public Integer getNominalvoltage() { return nominalvoltage; }
    public void setNominalvoltage(Integer nominalvoltage) { this.nominalvoltage = nominalvoltage; }
    public Integer getNormaloperatingstatus() { return normaloperatingstatus; }
    public void setNormaloperatingstatus(Integer normaloperatingstatus) { this.normaloperatingstatus = normaloperatingstatus; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Integer getPhasesnormal() { return phasesnormal; }
    public void setPhasesnormal(Integer phasesnormal) { this.phasesnormal = phasesnormal; }
    public String getSerialnumber() { return serialnumber; }
    public void setSerialnumber(String serialnumber) { this.serialnumber = serialnumber; }
    public Double getTotalmass() { return totalmass; }
    public void setTotalmass(Double totalmass) { this.totalmass = totalmass; }
    public LocalDateTime getYear() { return year; }
    public void setYear(LocalDateTime year) { this.year = year; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }
    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }
    public Integer getSecondaryvoltagelinetoline() { return secondaryvoltagelinetoline; }
    public void setSecondaryvoltagelinetoline(Integer secondaryvoltagelinetoline) { this.secondaryvoltagelinetoline = secondaryvoltagelinetoline; }
    public Integer getRatedpower() { return ratedpower; }
    public void setRatedpower(Integer ratedpower) { this.ratedpower = ratedpower; }
    public Integer getWinding() { return winding; }
    public void setWinding(Integer winding) { this.winding = winding; }
    public Double getShortcircuitvoltagepercentage() { return shortcircuitvoltagepercentage; }
    public void setShortcircuitvoltagepercentage(Double shortcircuitvoltagepercentage) { this.shortcircuitvoltagepercentage = shortcircuitvoltagepercentage; }
    public Integer getTerminaltype() { return terminaltype; }
    public void setTerminaltype(Integer terminaltype) { this.terminaltype = terminaltype; }
    public String getTransformercode() { return transformercode; }
    public void setTransformercode(String transformercode) { this.transformercode = transformercode; }
    public String getPolenumber() { return polenumber; }
    public void setPolenumber(String polenumber) { this.polenumber = polenumber; }
}