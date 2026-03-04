package com.onea.abcash.domain.gis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "StructureJunction_ElectricJunctionBox_coffret")
public class StructureJunctionElectricJunctionBoxCoffret {

    @Id
    @SequenceGenerator(name = "StructureJunction_ElectricJunctionBox_coffret_id_seq", sequenceName = "StructureJunction_ElectricJunctionBox_coffret_id_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "StructureJunction_ElectricJunctionBox_coffret_id_seq")
    private Integer id;

    private Integer objectid;

    private Integer assetgroup;

    private String assetid;

    private Integer assettype;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "created_user")
    private String createdUser;

    private String globalid;

    private Integer height;

    private LocalDateTime installdate;

    @Column(name = "last_edited_date")
    private LocalDateTime lastEditedDate;

    @Column(name = "last_edited_user")
    private String lastEditedUser;

    private Integer lifecyclestatus;

    private Integer materialcode;

    private Integer qualityverified;

    private Integer junctionhtatype;

    private String username;

    private String validator;

    private Integer boxtype;

    private Integer metetype;

    private Integer metermodel;

    private String distributionstationcode;

    private String metersize;

    private String meternumber;

    private Integer manufacturer;

    private String section;

    private Integer assignedvoltage;

    private Integer material;

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

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public String getCreatedUser() { return createdUser; }
    public void setCreatedUser(String createdUser) { this.createdUser = createdUser; }

    public String getGlobalid() { return globalid; }
    public void setGlobalid(String globalid) { this.globalid = globalid; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }

    public LocalDateTime getInstalldate() { return installdate; }
    public void setInstalldate(LocalDateTime installdate) { this.installdate = installdate; }

    public LocalDateTime getLastEditedDate() { return lastEditedDate; }
    public void setLastEditedDate(LocalDateTime lastEditedDate) { this.lastEditedDate = lastEditedDate; }

    public String getLastEditedUser() { return lastEditedUser; }
    public void setLastEditedUser(String lastEditedUser) { this.lastEditedUser = lastEditedUser; }

    public Integer getLifecyclestatus() { return lifecyclestatus; }
    public void setLifecyclestatus(Integer lifecyclestatus) { this.lifecyclestatus = lifecyclestatus; }

    public Integer getMaterialcode() { return materialcode; }
    public void setMaterialcode(Integer materialcode) { this.materialcode = materialcode; }

    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }

    public Integer getJunctionhtatype() { return junctionhtatype; }
    public void setJunctionhtatype(Integer junctionhtatype) { this.junctionhtatype = junctionhtatype; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }

    public Integer getBoxtype() { return boxtype; }
    public void setBoxtype(Integer boxtype) { this.boxtype = boxtype; }

    public Integer getMetetype() { return metetype; }
    public void setMetetype(Integer metetype) { this.metetype = metetype; }

    public Integer getMetermodel() { return metermodel; }
    public void setMetermodel(Integer metermodel) { this.metermodel = metermodel; }

    public String getDistributionstationcode() { return distributionstationcode; }
    public void setDistributionstationcode(String distributionstationcode) { this.distributionstationcode = distributionstationcode; }

    public String getMetersize() { return metersize; }
    public void setMetersize(String metersize) { this.metersize = metersize; }

    public String getMeternumber() { return meternumber; }
    public void setMeternumber(String meternumber) { this.meternumber = meternumber; }

    public Integer getManufacturer() { return manufacturer; }
    public void setManufacturer(Integer manufacturer) { this.manufacturer = manufacturer; }

    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }

    public Integer getAssignedvoltage() { return assignedvoltage; }
    public void setAssignedvoltage(Integer assignedvoltage) { this.assignedvoltage = assignedvoltage; }

    public Integer getMaterial() { return material; }
    public void setMaterial(Integer material) { this.material = material; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

}