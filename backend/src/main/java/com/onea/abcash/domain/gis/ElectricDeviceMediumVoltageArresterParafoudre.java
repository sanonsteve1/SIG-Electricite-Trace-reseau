package com.onea.abcash.domain.gis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ElectricDevice_MediumVoltageArrester_Parafoudre")
public class ElectricDeviceMediumVoltageArresterParafoudre {

    @Id
    @SequenceGenerator(name = "ElectricDevice_MediumVoltageArrester_Parafoudre_id_seq", sequenceName = "ElectricDevice_MediumVoltageArrester_Parafoudre_id_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ElectricDevice_MediumVoltageArrester_Parafoudre_id_seq")
    private Integer id;

    private Integer objectid;

    private Integer assetgroup;

    private String assetid;

    private Integer assettype;

    private Integer constructionstatus;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "created_user")
    private String createdUser;

    private String globalid;

    private LocalDateTime installdate;

    @Column(name = "last_edited_date")
    private LocalDateTime lastEditedDate;

    @Column(name = "last_edited_user")
    private String lastEditedUser;

    private Integer lifecyclestatus;

    private Integer manufacturer;

    private Integer nominalvoltage;

    private Integer phasesnormal;

    private String username;

    private Integer qualityverified;

    private String validator;

    private Integer currentdevicestatus;

    private Integer arrestertype;

    private Integer numphasesconstructed;

    private String notes;

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

    public Integer getPhasesnormal() { return phasesnormal; }
    public void setPhasesnormal(Integer phasesnormal) { this.phasesnormal = phasesnormal; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }

    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }

    public Integer getCurrentdevicestatus() { return currentdevicestatus; }
    public void setCurrentdevicestatus(Integer currentdevicestatus) { this.currentdevicestatus = currentdevicestatus; }

    public Integer getArrestertype() { return arrestertype; }
    public void setArrestertype(Integer arrestertype) { this.arrestertype = arrestertype; }

    public Integer getNumphasesconstructed() { return numphasesconstructed; }
    public void setNumphasesconstructed(Integer numphasesconstructed) { this.numphasesconstructed = numphasesconstructed; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

}