package com.onea.abcash.domain.gis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ElectricJunction_LowVoltageLineEnd_findeligne")
public class ElectricJunctionLowVoltageLineEndFindeligne {

    @Id
    @SequenceGenerator(name = "ElectricJunction_LowVoltageLineEnd_findeligne_id_seq", sequenceName = "ElectricJunction_LowVoltageLineEnd_findeligne_id_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ElectricJunction_LowVoltageLineEnd_findeligne_id_seq")
    private Integer id;

    private Integer objectid;

    private Integer assetgroup;

    private Integer assettype;

    private String globalid;

    private Integer phasesnormal;

    @Column(name = "created_user")
    private String createdUser;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "last_edited_user")
    private String lastEditedUser;

    @Column(name = "last_edited_date")
    private LocalDateTime lastEditedDate;

    private Integer qualityverified;

    private Integer manufacturer;

    private String username;

    private String validator;

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