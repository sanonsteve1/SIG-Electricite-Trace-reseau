package com.onea.abcash.domain.gis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ElectricDevice_MediumVoltageTransformer_transfo_ht_bt")
public class ElectricDeviceMediumVoltageTransformerTransfoHtBt {

    @Id
    @SequenceGenerator(name = "ElectricDevice_MediumVoltageTransformer_transfo_ht_bt_id_seq", sequenceName = "ElectricDevice_MediumVoltageTransformer_transfo_ht_bt_id_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ElectricDevice_MediumVoltageTransformer_transfo_ht_bt_id_seq")
    private Integer id;

    private Integer objectid;

    private Integer assetgroup;

    private String assetid;

    private Integer assettype;

    private Integer constructionstatus;

    private Integer coolingtype;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "created_user")
    private String createdUser;

    private String globalid;

    private Integer hasarrester;

    private LocalDateTime installdate;

    @Column(name = "last_edited_date")
    private LocalDateTime lastEditedDate;

    @Column(name = "last_edited_user")
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

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

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