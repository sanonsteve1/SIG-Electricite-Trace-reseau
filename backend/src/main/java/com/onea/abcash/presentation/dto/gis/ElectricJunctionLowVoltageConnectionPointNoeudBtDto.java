package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.ElectricJunctionLowVoltageConnectionPointNoeudBt;
import java.time.LocalDateTime;

public class ElectricJunctionLowVoltageConnectionPointNoeudBtDto {

    private Integer id;

    private Integer objectid;
    private Integer assetgroup;
    private Integer assettype;
    private String globalid;
    private Integer phasesnormal;
    private String createdUser;
    private LocalDateTime createdDate;
    private String lastEditedUser;
    private LocalDateTime lastEditedDate;
    private String username;
    private Integer qualityverified;
    private String validator;
    private Integer manufacturer;
    private String cadastresection;
    private String cadastrelot;
    private String cadastreparcel;
    private String sonabelsection;
    private String sonabelparcel;
    private Integer phasesenergized;
    private Integer connectiondevice;
    private String operation;
    private Integer otherequipments;
    private Integer accessibility;
    private String sonabellot;
    private String notes;

    public ElectricJunctionLowVoltageConnectionPointNoeudBtDto() {}

    public ElectricJunctionLowVoltageConnectionPointNoeudBtDto(ElectricJunctionLowVoltageConnectionPointNoeudBt e) {
        if (e == null) return;
        this.id = e.getId();
        this.objectid = e.getObjectid();
        this.assetgroup = e.getAssetgroup();
        this.assettype = e.getAssettype();
        this.globalid = e.getGlobalid();
        this.phasesnormal = e.getPhasesnormal();
        this.createdUser = e.getCreatedUser();
        this.createdDate = e.getCreatedDate();
        this.lastEditedUser = e.getLastEditedUser();
        this.lastEditedDate = e.getLastEditedDate();
        this.username = e.getUsername();
        this.qualityverified = e.getQualityverified();
        this.validator = e.getValidator();
        this.manufacturer = e.getManufacturer();
        this.cadastresection = e.getCadastresection();
        this.cadastrelot = e.getCadastrelot();
        this.cadastreparcel = e.getCadastreparcel();
        this.sonabelsection = e.getSonabelsection();
        this.sonabelparcel = e.getSonabelparcel();
        this.phasesenergized = e.getPhasesenergized();
        this.connectiondevice = e.getConnectiondevice();
        this.operation = e.getOperation();
        this.otherequipments = e.getOtherequipments();
        this.accessibility = e.getAccessibility();
        this.sonabellot = e.getSonabellot();
        this.notes = e.getNotes();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
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
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }
    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }
    public Integer getManufacturer() { return manufacturer; }
    public void setManufacturer(Integer manufacturer) { this.manufacturer = manufacturer; }
    public String getCadastresection() { return cadastresection; }
    public void setCadastresection(String cadastresection) { this.cadastresection = cadastresection; }
    public String getCadastrelot() { return cadastrelot; }
    public void setCadastrelot(String cadastrelot) { this.cadastrelot = cadastrelot; }
    public String getCadastreparcel() { return cadastreparcel; }
    public void setCadastreparcel(String cadastreparcel) { this.cadastreparcel = cadastreparcel; }
    public String getSonabelsection() { return sonabelsection; }
    public void setSonabelsection(String sonabelsection) { this.sonabelsection = sonabelsection; }
    public String getSonabelparcel() { return sonabelparcel; }
    public void setSonabelparcel(String sonabelparcel) { this.sonabelparcel = sonabelparcel; }
    public Integer getPhasesenergized() { return phasesenergized; }
    public void setPhasesenergized(Integer phasesenergized) { this.phasesenergized = phasesenergized; }
    public Integer getConnectiondevice() { return connectiondevice; }
    public void setConnectiondevice(Integer connectiondevice) { this.connectiondevice = connectiondevice; }
    public String getOperation() { return operation; }
    public void setOperation(String operation) { this.operation = operation; }
    public Integer getOtherequipments() { return otherequipments; }
    public void setOtherequipments(Integer otherequipments) { this.otherequipments = otherequipments; }
    public Integer getAccessibility() { return accessibility; }
    public void setAccessibility(Integer accessibility) { this.accessibility = accessibility; }
    public String getSonabellot() { return sonabellot; }
    public void setSonabellot(String sonabellot) { this.sonabellot = sonabellot; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}