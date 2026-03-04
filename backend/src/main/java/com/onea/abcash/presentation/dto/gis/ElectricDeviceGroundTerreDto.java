package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.ElectricDeviceGroundTerre;
import java.time.LocalDateTime;

public class ElectricDeviceGroundTerreDto {

    private Integer id;

    private Integer objectid;
    private Integer assetgroup;
    private String assetid;
    private Integer assettype;
    private Integer constructionstatus;
    private LocalDateTime createdDate;
    private String createdUser;
    private Integer designtype;
    private String globalid;
    private Integer grounding;
    private LocalDateTime installdate;
    private LocalDateTime lastEditedDate;
    private String lastEditedUser;
    private Integer lifecyclestatus;
    private Integer manufacturer;
    private String notes;
    private Integer phasesnormal;
    private Integer tapsandpoles;
    private Integer normaloperatingstatus;
    private Integer nominalvoltage;
    private Integer secondaryvoltagelinetoline;
    private Integer maxvoltage;
    private Integer maxoperatingvoltage;
    private Integer maximumpower;
    private Integer minimumpower;
    private Integer ratedpower;
    private Integer coolingtype;
    private Integer hasarrester;
    private String address;
    private String currentvaultpole;
    private String serialnumber;
    private Double totalmass;
    private LocalDateTime year;
    private String subnetworkcontrollername;
    private String anomaly;
    private String ocrtype;
    private Integer loadtapchangepercent;
    private String shortcircuitvoltage;
    private Integer peakload;
    private String voltagelevel;
    private Integer materialcode;
    private Integer height;
    private Integer ownedby;
    private Integer maintby;
    private Integer heightMetric;
    private String accessorybt;
    private String accessoryfunction;
    private String accessorymaterial;
    private String accessorytype;
    private String crossarmmaterial;
    private String crossarmposition;
    private String crossarmtype;
    private String hardwarematerial;
    private String hardwaretype;
    private String insulatormaterial;
    private String insulatortype;
    private String typeofimplantation;
    private Integer equipmenttypeorclass;
    private String assembly;
    private String typeofinstallation;
    private Integer commonconductortype;
    private String labeltext;
    private Double conductorsize;
    private Double conductorsizemetric;
    private String sourceoffunding;
    private Integer neutraltype;
    private String natureoftheline;

    public ElectricDeviceGroundTerreDto() {}

    public ElectricDeviceGroundTerreDto(ElectricDeviceGroundTerre e) {
        if (e == null) return;
        this.id = e.getId();
        this.objectid = e.getObjectid();
        this.assetgroup = e.getAssetgroup();
        this.assetid = e.getAssetid();
        this.assettype = e.getAssettype();
        this.constructionstatus = e.getConstructionstatus();
        this.createdDate = e.getCreatedDate();
        this.createdUser = e.getCreatedUser();
        this.designtype = e.getDesigntype();
        this.globalid = e.getGlobalid();
        this.grounding = e.getGrounding();
        this.installdate = e.getInstalldate();
        this.lastEditedDate = e.getLastEditedDate();
        this.lastEditedUser = e.getLastEditedUser();
        this.lifecyclestatus = e.getLifecyclestatus();
        this.manufacturer = e.getManufacturer();
        this.notes = e.getNotes();
        this.phasesnormal = e.getPhasesnormal();
        this.tapsandpoles = e.getTapsandpoles();
        this.normaloperatingstatus = e.getNormaloperatingstatus();
        this.nominalvoltage = e.getNominalvoltage();
        this.secondaryvoltagelinetoline = e.getSecondaryvoltagelinetoline();
        this.maxvoltage = e.getMaxvoltage();
        this.maxoperatingvoltage = e.getMaxoperatingvoltage();
        this.maximumpower = e.getMaximumpower();
        this.minimumpower = e.getMinimumpower();
        this.ratedpower = e.getRatedpower();
        this.coolingtype = e.getCoolingtype();
        this.hasarrester = e.getHasarrester();
        this.address = e.getAddress();
        this.currentvaultpole = e.getCurrentvaultpole();
        this.serialnumber = e.getSerialnumber();
        this.totalmass = e.getTotalmass();
        this.year = e.getYear();
        this.subnetworkcontrollername = e.getSubnetworkcontrollername();
        this.anomaly = e.getAnomaly();
        this.ocrtype = e.getOcrtype();
        this.loadtapchangepercent = e.getLoadtapchangepercent();
        this.shortcircuitvoltage = e.getShortcircuitvoltage();
        this.peakload = e.getPeakload();
        this.voltagelevel = e.getVoltagelevel();
        this.materialcode = e.getMaterialcode();
        this.height = e.getHeight();
        this.ownedby = e.getOwnedby();
        this.maintby = e.getMaintby();
        this.heightMetric = e.getHeightMetric();
        this.accessorybt = e.getAccessorybt();
        this.accessoryfunction = e.getAccessoryfunction();
        this.accessorymaterial = e.getAccessorymaterial();
        this.accessorytype = e.getAccessorytype();
        this.crossarmmaterial = e.getCrossarmmaterial();
        this.crossarmposition = e.getCrossarmposition();
        this.crossarmtype = e.getCrossarmtype();
        this.hardwarematerial = e.getHardwarematerial();
        this.hardwaretype = e.getHardwaretype();
        this.insulatormaterial = e.getInsulatormaterial();
        this.insulatortype = e.getInsulatortype();
        this.typeofimplantation = e.getTypeofimplantation();
        this.equipmenttypeorclass = e.getEquipmenttypeorclass();
        this.assembly = e.getAssembly();
        this.typeofinstallation = e.getTypeofinstallation();
        this.commonconductortype = e.getCommonconductortype();
        this.labeltext = e.getLabeltext();
        this.conductorsize = e.getConductorsize();
        this.conductorsizemetric = e.getConductorsizemetric();
        this.sourceoffunding = e.getSourceoffunding();
        this.neutraltype = e.getNeutraltype();
        this.natureoftheline = e.getNatureoftheline();
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
    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
    public String getCreatedUser() { return createdUser; }
    public void setCreatedUser(String createdUser) { this.createdUser = createdUser; }
    public Integer getDesigntype() { return designtype; }
    public void setDesigntype(Integer designtype) { this.designtype = designtype; }
    public String getGlobalid() { return globalid; }
    public void setGlobalid(String globalid) { this.globalid = globalid; }
    public Integer getGrounding() { return grounding; }
    public void setGrounding(Integer grounding) { this.grounding = grounding; }
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
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Integer getPhasesnormal() { return phasesnormal; }
    public void setPhasesnormal(Integer phasesnormal) { this.phasesnormal = phasesnormal; }
    public Integer getTapsandpoles() { return tapsandpoles; }
    public void setTapsandpoles(Integer tapsandpoles) { this.tapsandpoles = tapsandpoles; }
    public Integer getNormaloperatingstatus() { return normaloperatingstatus; }
    public void setNormaloperatingstatus(Integer normaloperatingstatus) { this.normaloperatingstatus = normaloperatingstatus; }
    public Integer getNominalvoltage() { return nominalvoltage; }
    public void setNominalvoltage(Integer nominalvoltage) { this.nominalvoltage = nominalvoltage; }
    public Integer getSecondaryvoltagelinetoline() { return secondaryvoltagelinetoline; }
    public void setSecondaryvoltagelinetoline(Integer secondaryvoltagelinetoline) { this.secondaryvoltagelinetoline = secondaryvoltagelinetoline; }
    public Integer getMaxvoltage() { return maxvoltage; }
    public void setMaxvoltage(Integer maxvoltage) { this.maxvoltage = maxvoltage; }
    public Integer getMaxoperatingvoltage() { return maxoperatingvoltage; }
    public void setMaxoperatingvoltage(Integer maxoperatingvoltage) { this.maxoperatingvoltage = maxoperatingvoltage; }
    public Integer getMaximumpower() { return maximumpower; }
    public void setMaximumpower(Integer maximumpower) { this.maximumpower = maximumpower; }
    public Integer getMinimumpower() { return minimumpower; }
    public void setMinimumpower(Integer minimumpower) { this.minimumpower = minimumpower; }
    public Integer getRatedpower() { return ratedpower; }
    public void setRatedpower(Integer ratedpower) { this.ratedpower = ratedpower; }
    public Integer getCoolingtype() { return coolingtype; }
    public void setCoolingtype(Integer coolingtype) { this.coolingtype = coolingtype; }
    public Integer getHasarrester() { return hasarrester; }
    public void setHasarrester(Integer hasarrester) { this.hasarrester = hasarrester; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCurrentvaultpole() { return currentvaultpole; }
    public void setCurrentvaultpole(String currentvaultpole) { this.currentvaultpole = currentvaultpole; }
    public String getSerialnumber() { return serialnumber; }
    public void setSerialnumber(String serialnumber) { this.serialnumber = serialnumber; }
    public Double getTotalmass() { return totalmass; }
    public void setTotalmass(Double totalmass) { this.totalmass = totalmass; }
    public LocalDateTime getYear() { return year; }
    public void setYear(LocalDateTime year) { this.year = year; }
    public String getSubnetworkcontrollername() { return subnetworkcontrollername; }
    public void setSubnetworkcontrollername(String subnetworkcontrollername) { this.subnetworkcontrollername = subnetworkcontrollername; }
    public String getAnomaly() { return anomaly; }
    public void setAnomaly(String anomaly) { this.anomaly = anomaly; }
    public String getOcrtype() { return ocrtype; }
    public void setOcrtype(String ocrtype) { this.ocrtype = ocrtype; }
    public Integer getLoadtapchangepercent() { return loadtapchangepercent; }
    public void setLoadtapchangepercent(Integer loadtapchangepercent) { this.loadtapchangepercent = loadtapchangepercent; }
    public String getShortcircuitvoltage() { return shortcircuitvoltage; }
    public void setShortcircuitvoltage(String shortcircuitvoltage) { this.shortcircuitvoltage = shortcircuitvoltage; }
    public Integer getPeakload() { return peakload; }
    public void setPeakload(Integer peakload) { this.peakload = peakload; }
    public String getVoltagelevel() { return voltagelevel; }
    public void setVoltagelevel(String voltagelevel) { this.voltagelevel = voltagelevel; }
    public Integer getMaterialcode() { return materialcode; }
    public void setMaterialcode(Integer materialcode) { this.materialcode = materialcode; }
    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }
    public Integer getOwnedby() { return ownedby; }
    public void setOwnedby(Integer ownedby) { this.ownedby = ownedby; }
    public Integer getMaintby() { return maintby; }
    public void setMaintby(Integer maintby) { this.maintby = maintby; }
    public Integer getHeightMetric() { return heightMetric; }
    public void setHeightMetric(Integer heightMetric) { this.heightMetric = heightMetric; }
    public String getAccessorybt() { return accessorybt; }
    public void setAccessorybt(String accessorybt) { this.accessorybt = accessorybt; }
    public String getAccessoryfunction() { return accessoryfunction; }
    public void setAccessoryfunction(String accessoryfunction) { this.accessoryfunction = accessoryfunction; }
    public String getAccessorymaterial() { return accessorymaterial; }
    public void setAccessorymaterial(String accessorymaterial) { this.accessorymaterial = accessorymaterial; }
    public String getAccessorytype() { return accessorytype; }
    public void setAccessorytype(String accessorytype) { this.accessorytype = accessorytype; }
    public String getCrossarmmaterial() { return crossarmmaterial; }
    public void setCrossarmmaterial(String crossarmmaterial) { this.crossarmmaterial = crossarmmaterial; }
    public String getCrossarmposition() { return crossarmposition; }
    public void setCrossarmposition(String crossarmposition) { this.crossarmposition = crossarmposition; }
    public String getCrossarmtype() { return crossarmtype; }
    public void setCrossarmtype(String crossarmtype) { this.crossarmtype = crossarmtype; }
    public String getHardwarematerial() { return hardwarematerial; }
    public void setHardwarematerial(String hardwarematerial) { this.hardwarematerial = hardwarematerial; }
    public String getHardwaretype() { return hardwaretype; }
    public void setHardwaretype(String hardwaretype) { this.hardwaretype = hardwaretype; }
    public String getInsulatormaterial() { return insulatormaterial; }
    public void setInsulatormaterial(String insulatormaterial) { this.insulatormaterial = insulatormaterial; }
    public String getInsulatortype() { return insulatortype; }
    public void setInsulatortype(String insulatortype) { this.insulatortype = insulatortype; }
    public String getTypeofimplantation() { return typeofimplantation; }
    public void setTypeofimplantation(String typeofimplantation) { this.typeofimplantation = typeofimplantation; }
    public Integer getEquipmenttypeorclass() { return equipmenttypeorclass; }
    public void setEquipmenttypeorclass(Integer equipmenttypeorclass) { this.equipmenttypeorclass = equipmenttypeorclass; }
    public String getAssembly() { return assembly; }
    public void setAssembly(String assembly) { this.assembly = assembly; }
    public String getTypeofinstallation() { return typeofinstallation; }
    public void setTypeofinstallation(String typeofinstallation) { this.typeofinstallation = typeofinstallation; }
    public Integer getCommonconductortype() { return commonconductortype; }
    public void setCommonconductortype(Integer commonconductortype) { this.commonconductortype = commonconductortype; }
    public String getLabeltext() { return labeltext; }
    public void setLabeltext(String labeltext) { this.labeltext = labeltext; }
    public Double getConductorsize() { return conductorsize; }
    public void setConductorsize(Double conductorsize) { this.conductorsize = conductorsize; }
    public Double getConductorsizemetric() { return conductorsizemetric; }
    public void setConductorsizemetric(Double conductorsizemetric) { this.conductorsizemetric = conductorsizemetric; }
    public String getSourceoffunding() { return sourceoffunding; }
    public void setSourceoffunding(String sourceoffunding) { this.sourceoffunding = sourceoffunding; }
    public Integer getNeutraltype() { return neutraltype; }
    public void setNeutraltype(Integer neutraltype) { this.neutraltype = neutraltype; }
    public String getNatureoftheline() { return natureoftheline; }
    public void setNatureoftheline(String natureoftheline) { this.natureoftheline = natureoftheline; }
}