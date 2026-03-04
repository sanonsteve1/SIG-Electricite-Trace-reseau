package com.onea.abcash.domain.gis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ElectricLine_LowVoltageService_ligne_branchement_bt")
public class ElectricLineLowVoltageServiceLigneBranchementBt {

    @Id
    @SequenceGenerator(name = "ElectricLine_LowVoltageService_ligne_branchement_bt_id_seq", sequenceName = "ElectricLine_LowVoltageService_ligne_branchement_bt_id_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ElectricLine_LowVoltageService_ligne_branchement_bt_id_seq")
    private Integer id;

    private Integer objectid;

    private Integer assetgroup;

    private Integer assettype;

    private Integer commonconductortype;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "created_user")
    private String createdUser;

    private String globalid;

    @Column(name = "last_edited_date")
    private LocalDateTime lastEditedDate;

    @Column(name = "last_edited_user")
    private String lastEditedUser;

    private Integer lifecyclestatus;

    private Integer phasesnormal;

    private String username;

    private Integer qualityverified;

    private String validator;

    private String nominalvoltage;

    private String conductorsize;

    private Integer typeofmaterial;

    private String notes;

    private String assetid;

    private Integer section;

    private Integer phasechange;

    private Integer phasesenergized;

    @Column(name = "shape_length")
    private Double shapeLength;

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

    public Integer getCommonconductortype() { return commonconductortype; }
    public void setCommonconductortype(Integer commonconductortype) { this.commonconductortype = commonconductortype; }

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

    public Integer getPhasesnormal() { return phasesnormal; }
    public void setPhasesnormal(Integer phasesnormal) { this.phasesnormal = phasesnormal; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }

    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }

    public String getNominalvoltage() { return nominalvoltage; }
    public void setNominalvoltage(String nominalvoltage) { this.nominalvoltage = nominalvoltage; }

    public String getConductorsize() { return conductorsize; }
    public void setConductorsize(String conductorsize) { this.conductorsize = conductorsize; }

    public Integer getTypeofmaterial() { return typeofmaterial; }
    public void setTypeofmaterial(Integer typeofmaterial) { this.typeofmaterial = typeofmaterial; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getAssetid() { return assetid; }
    public void setAssetid(String assetid) { this.assetid = assetid; }

    public Integer getSection() { return section; }
    public void setSection(Integer section) { this.section = section; }

    public Integer getPhasechange() { return phasechange; }
    public void setPhasechange(Integer phasechange) { this.phasechange = phasechange; }

    public Integer getPhasesenergized() { return phasesenergized; }
    public void setPhasesenergized(Integer phasesenergized) { this.phasesenergized = phasesenergized; }

    public Double getShapeLength() { return shapeLength; }
    public void setShapeLength(Double shapeLength) { this.shapeLength = shapeLength; }

}