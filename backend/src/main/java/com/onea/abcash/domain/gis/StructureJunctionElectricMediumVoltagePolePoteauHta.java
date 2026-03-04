package com.onea.abcash.domain.gis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "StructureJunction_ElectricMediumVoltagePole_poteau_hta")
public class StructureJunctionElectricMediumVoltagePolePoteauHta {

    @Id
    @SequenceGenerator(name = "StructureJunction_ElectricMediumVoltagePole_poteau_hta_id_seq", sequenceName = "StructureJunction_ElectricMediumVoltagePole_poteau_hta_id_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "StructureJunction_ElectricMediumVoltagePole_poteau_hta_id_seq")
    private Integer id;

    private Integer objectid;

    private String accessoryfunction;

    private String accessorymaterial;

    private String accessorytype;

    private String assembly;

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

    private String insulatormaterial;

    private String insulatortype;

    @Column(name = "last_edited_date")
    private LocalDateTime lastEditedDate;

    @Column(name = "last_edited_user")
    private String lastEditedUser;

    private Integer lifecyclestatus;

    private Integer maintby;

    private Integer manufacturer;

    private Integer materialcode;

    private Integer ownedby;

    private String typeofinstallation;

    private Integer qualityverified;

    private Integer earthing;

    private Double template;

    private Integer equipmenttypeorclass;

    private Integer grounding;

    private String accessorylv;

    private Integer presenceofastreetlamp;

    private String validator;

    private String notes;

    private String fittingtype;

    private Integer height;

    private String username;

    private Integer flag;

    private Integer archedcrossarm;

    private Integer alternatingorstaggered;

    private Integer triangle;

    private Integer canadianstylecrossarm;

    private Integer horizontalcrossarm;

    private Integer others;

    private Integer pa25;

    private Integer suspensionclampwithbracket;

    private Integer tensionclampwithbracket;

    private Integer anglechampra25;

    private Integer crossarm;

    private Integer sidearm;

    private Integer inclinedarm;

    private Integer deadendarm;

    private Integer anglearm;

    private Integer doublearm;

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

    public String getAssembly() { return assembly; }
    public void setAssembly(String assembly) { this.assembly = assembly; }

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

    public Integer getManufacturer() { return manufacturer; }
    public void setManufacturer(Integer manufacturer) { this.manufacturer = manufacturer; }

    public Integer getMaterialcode() { return materialcode; }
    public void setMaterialcode(Integer materialcode) { this.materialcode = materialcode; }

    public Integer getOwnedby() { return ownedby; }
    public void setOwnedby(Integer ownedby) { this.ownedby = ownedby; }

    public String getTypeofinstallation() { return typeofinstallation; }
    public void setTypeofinstallation(String typeofinstallation) { this.typeofinstallation = typeofinstallation; }

    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }

    public Integer getEarthing() { return earthing; }
    public void setEarthing(Integer earthing) { this.earthing = earthing; }

    public Double getTemplate() { return template; }
    public void setTemplate(Double template) { this.template = template; }

    public Integer getEquipmenttypeorclass() { return equipmenttypeorclass; }
    public void setEquipmenttypeorclass(Integer equipmenttypeorclass) { this.equipmenttypeorclass = equipmenttypeorclass; }

    public Integer getGrounding() { return grounding; }
    public void setGrounding(Integer grounding) { this.grounding = grounding; }

    public String getAccessorylv() { return accessorylv; }
    public void setAccessorylv(String accessorylv) { this.accessorylv = accessorylv; }

    public Integer getPresenceofastreetlamp() { return presenceofastreetlamp; }
    public void setPresenceofastreetlamp(Integer presenceofastreetlamp) { this.presenceofastreetlamp = presenceofastreetlamp; }

    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getFittingtype() { return fittingtype; }
    public void setFittingtype(String fittingtype) { this.fittingtype = fittingtype; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Integer getFlag() { return flag; }
    public void setFlag(Integer flag) { this.flag = flag; }

    public Integer getArchedcrossarm() { return archedcrossarm; }
    public void setArchedcrossarm(Integer archedcrossarm) { this.archedcrossarm = archedcrossarm; }

    public Integer getAlternatingorstaggered() { return alternatingorstaggered; }
    public void setAlternatingorstaggered(Integer alternatingorstaggered) { this.alternatingorstaggered = alternatingorstaggered; }

    public Integer getTriangle() { return triangle; }
    public void setTriangle(Integer triangle) { this.triangle = triangle; }

    public Integer getCanadianstylecrossarm() { return canadianstylecrossarm; }
    public void setCanadianstylecrossarm(Integer canadianstylecrossarm) { this.canadianstylecrossarm = canadianstylecrossarm; }

    public Integer getHorizontalcrossarm() { return horizontalcrossarm; }
    public void setHorizontalcrossarm(Integer horizontalcrossarm) { this.horizontalcrossarm = horizontalcrossarm; }

    public Integer getOthers() { return others; }
    public void setOthers(Integer others) { this.others = others; }

    public Integer getPa25() { return pa25; }
    public void setPa25(Integer pa25) { this.pa25 = pa25; }

    public Integer getSuspensionclampwithbracket() { return suspensionclampwithbracket; }
    public void setSuspensionclampwithbracket(Integer suspensionclampwithbracket) { this.suspensionclampwithbracket = suspensionclampwithbracket; }

    public Integer getTensionclampwithbracket() { return tensionclampwithbracket; }
    public void setTensionclampwithbracket(Integer tensionclampwithbracket) { this.tensionclampwithbracket = tensionclampwithbracket; }

    public Integer getAnglechampra25() { return anglechampra25; }
    public void setAnglechampra25(Integer anglechampra25) { this.anglechampra25 = anglechampra25; }

    public Integer getCrossarm() { return crossarm; }
    public void setCrossarm(Integer crossarm) { this.crossarm = crossarm; }

    public Integer getSidearm() { return sidearm; }
    public void setSidearm(Integer sidearm) { this.sidearm = sidearm; }

    public Integer getInclinedarm() { return inclinedarm; }
    public void setInclinedarm(Integer inclinedarm) { this.inclinedarm = inclinedarm; }

    public Integer getDeadendarm() { return deadendarm; }
    public void setDeadendarm(Integer deadendarm) { this.deadendarm = deadendarm; }

    public Integer getAnglearm() { return anglearm; }
    public void setAnglearm(Integer anglearm) { this.anglearm = anglearm; }

    public Integer getDoublearm() { return doublearm; }
    public void setDoublearm(Integer doublearm) { this.doublearm = doublearm; }

}