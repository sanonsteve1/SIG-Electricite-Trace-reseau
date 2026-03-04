package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.ElectricDeviceMediumVoltageTransformerTransfoHtBt;
import java.time.LocalDateTime;

public class ElectricDeviceMediumVoltageTransformerTransfoHtBtDto {

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
    private Integer ratedpower;
    private Integer secondaryvoltagelinetoline;
    private String serialnumber;
    private String shortcircuitvoltage;
    private LocalDateTime year;
    private String username;
    private Integer qualityverified;
    private String validator;
    private Integer winding;
    private String distributionstationcode;
    private Integer numphasesconstructed;
    private String tapchanger;
    private String fittingtype;
    private Integer terminaltype;

    public ElectricDeviceMediumVoltageTransformerTransfoHtBtDto() {}

    public ElectricDeviceMediumVoltageTransformerTransfoHtBtDto(ElectricDeviceMediumVoltageTransformerTransfoHtBt e) {
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
        this.ratedpower = e.getRatedpower();
        this.secondaryvoltagelinetoline = e.getSecondaryvoltagelinetoline();
        this.serialnumber = e.getSerialnumber();
        this.shortcircuitvoltage = e.getShortcircuitvoltage();
        this.year = e.getYear();
        this.username = e.getUsername();
        this.qualityverified = e.getQualityverified();
        this.validator = e.getValidator();
        this.winding = e.getWinding();
        this.distributionstationcode = e.getDistributionstationcode();
        this.numphasesconstructed = e.getNumphasesconstructed();
        this.tapchanger = e.getTapchanger();
        this.fittingtype = e.getFittingtype();
        this.terminaltype = e.getTerminaltype();
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
    public Integer getRatedpower() { return ratedpower; }
    public void setRatedpower(Integer ratedpower) { this.ratedpower = ratedpower; }
    public Integer getSecondaryvoltagelinetoline() { return secondaryvoltagelinetoline; }
    public void setSecondaryvoltagelinetoline(Integer secondaryvoltagelinetoline) { this.secondaryvoltagelinetoline = secondaryvoltagelinetoline; }
    public String getSerialnumber() { return serialnumber; }
    public void setSerialnumber(String serialnumber) { this.serialnumber = serialnumber; }
    public String getShortcircuitvoltage() { return shortcircuitvoltage; }
    public void setShortcircuitvoltage(String shortcircuitvoltage) { this.shortcircuitvoltage = shortcircuitvoltage; }
    public LocalDateTime getYear() { return year; }
    public void setYear(LocalDateTime year) { this.year = year; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }
    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }
    public Integer getWinding() { return winding; }
    public void setWinding(Integer winding) { this.winding = winding; }
    public String getDistributionstationcode() { return distributionstationcode; }
    public void setDistributionstationcode(String distributionstationcode) { this.distributionstationcode = distributionstationcode; }
    public Integer getNumphasesconstructed() { return numphasesconstructed; }
    public void setNumphasesconstructed(Integer numphasesconstructed) { this.numphasesconstructed = numphasesconstructed; }
    public String getTapchanger() { return tapchanger; }
    public void setTapchanger(String tapchanger) { this.tapchanger = tapchanger; }
    public String getFittingtype() { return fittingtype; }
    public void setFittingtype(String fittingtype) { this.fittingtype = fittingtype; }
    public Integer getTerminaltype() { return terminaltype; }
    public void setTerminaltype(Integer terminaltype) { this.terminaltype = terminaltype; }
}