package com.onea.abcash.domain.gis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "StructureJunction_ElectricLowVoltagePole_poteau_bt")
public class StructureJunctionElectricLowVoltagePolePoteauBt {

    @Id
    @SequenceGenerator(name = "StructureJunction_ElectricLowVoltagePole_poteau_bt_id_seq", sequenceName = "StructureJunction_ElectricLowVoltagePole_poteau_bt_id_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "StructureJunction_ElectricLowVoltagePole_poteau_bt_id_seq")
    private Integer id;

    private Integer objectid;

    private String accessoryfunction;

    private String accessorymaterial;

    private String accessorytype;

    private Integer assetgroup;

    private String assetid;

    private Integer assettype;

    private Integer constructionstatus;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "created_user")
    private String createdUser;

    private String crossarmmaterial;

    private String crossarmposition;

    private String crossarmtype;

    private String globalid;

    private String hardwarematerial;

    private String hardwaretype;

    @Column(name = "height_metric")
    private Integer heightMetric;

    private String insulatormaterial;

    private String insulatortype;

    @Column(name = "last_edited_date")
    private LocalDateTime lastEditedDate;

    @Column(name = "last_edited_user")
    private String lastEditedUser;

    private Integer lifecyclestatus;

    private Integer maintby;

    private Integer materialcode;

    private Integer ownedby;

    private String typeofimplantation;

    private Integer qualityverified;

    private Integer earthing;

    private Integer equipmenttypeorclass;

    private Integer grounding;

    private Integer presenceofastreetlamp;

    private String username;

    private String validator;

    private Integer height;

    private String notes;

    private String pa25;

    private String suspensionclampwithbracket;

    private String tensionclampwithbracket;

    private String anglechampra25;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getObjectid() { return objectid; }
    public void setObjectid(Integer objectid) { this.objectid = objectid; }

    public String getAccessoryfunction() { return accessoryfunction; }
    public void setAccessoryfunction(String accessoryfunction) { this.accessoryfunction = accessoryfunction; }

    public String getAccessorymaterial() { return accessorymaterial; }
    public void setAccessorymaterial(String accessorymaterial) { this.accessorymaterial = accessorymaterial; }

    public String getAccessorytype() { return accessorytype; }
    public void setAccessorytype(String accessorytype) { this.accessorytype = accessorytype; }

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

    public String getCrossarmmaterial() { return crossarmmaterial; }
    public void setCrossarmmaterial(String crossarmmaterial) { this.crossarmmaterial = crossarmmaterial; }

    public String getCrossarmposition() { return crossarmposition; }
    public void setCrossarmposition(String crossarmposition) { this.crossarmposition = crossarmposition; }

    public String getCrossarmtype() { return crossarmtype; }
    public void setCrossarmtype(String crossarmtype) { this.crossarmtype = crossarmtype; }

    public String getGlobalid() { return globalid; }
    public void setGlobalid(String globalid) { this.globalid = globalid; }

    public String getHardwarematerial() { return hardwarematerial; }
    public void setHardwarematerial(String hardwarematerial) { this.hardwarematerial = hardwarematerial; }

    public String getHardwaretype() { return hardwaretype; }
    public void setHardwaretype(String hardwaretype) { this.hardwaretype = hardwaretype; }

    public Integer getHeightMetric() { return heightMetric; }
    public void setHeightMetric(Integer heightMetric) { this.heightMetric = heightMetric; }

    public String getInsulatormaterial() { return insulatormaterial; }
    public void setInsulatormaterial(String insulatormaterial) { this.insulatormaterial = insulatormaterial; }

    public String getInsulatortype() { return insulatortype; }
    public void setInsulatortype(String insulatortype) { this.insulatortype = insulatortype; }

    public LocalDateTime getLastEditedDate() { return lastEditedDate; }
    public void setLastEditedDate(LocalDateTime lastEditedDate) { this.lastEditedDate = lastEditedDate; }

    public String getLastEditedUser() { return lastEditedUser; }
    public void setLastEditedUser(String lastEditedUser) { this.lastEditedUser = lastEditedUser; }

    public Integer getLifecyclestatus() { return lifecyclestatus; }
    public void setLifecyclestatus(Integer lifecyclestatus) { this.lifecyclestatus = lifecyclestatus; }

    public Integer getMaintby() { return maintby; }
    public void setMaintby(Integer maintby) { this.maintby = maintby; }

    public Integer getMaterialcode() { return materialcode; }
    public void setMaterialcode(Integer materialcode) { this.materialcode = materialcode; }

    public Integer getOwnedby() { return ownedby; }
    public void setOwnedby(Integer ownedby) { this.ownedby = ownedby; }

    public String getTypeofimplantation() { return typeofimplantation; }
    public void setTypeofimplantation(String typeofimplantation) { this.typeofimplantation = typeofimplantation; }

    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }

    public Integer getEarthing() { return earthing; }
    public void setEarthing(Integer earthing) { this.earthing = earthing; }

    public Integer getEquipmenttypeorclass() { return equipmenttypeorclass; }
    public void setEquipmenttypeorclass(Integer equipmenttypeorclass) { this.equipmenttypeorclass = equipmenttypeorclass; }

    public Integer getGrounding() { return grounding; }
    public void setGrounding(Integer grounding) { this.grounding = grounding; }

    public Integer getPresenceofastreetlamp() { return presenceofastreetlamp; }
    public void setPresenceofastreetlamp(Integer presenceofastreetlamp) { this.presenceofastreetlamp = presenceofastreetlamp; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getPa25() { return pa25; }
    public void setPa25(String pa25) { this.pa25 = pa25; }

    public String getSuspensionclampwithbracket() { return suspensionclampwithbracket; }
    public void setSuspensionclampwithbracket(String suspensionclampwithbracket) { this.suspensionclampwithbracket = suspensionclampwithbracket; }

    public String getTensionclampwithbracket() { return tensionclampwithbracket; }
    public void setTensionclampwithbracket(String tensionclampwithbracket) { this.tensionclampwithbracket = tensionclampwithbracket; }

    public String getAnglechampra25() { return anglechampra25; }
    public void setAnglechampra25(String anglechampra25) { this.anglechampra25 = anglechampra25; }

}