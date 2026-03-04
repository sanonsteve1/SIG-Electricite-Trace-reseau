package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.MetersCompteur;
import java.time.LocalDateTime;

public class MetersCompteurDto {

    private Integer id;

    private Integer objectid;
    private String globalid;
    private String subscriptionnumber;
    private String counternumber;
    private String policeno;
    private String name;
    private String firstname;
    private String customernature;
    private String useofotherenergysource;
    private String otherenergysources;
    private String customertype;
    private Integer subscribedpower;
    private String use;
    private String administrationcategory;
    private String administrationtypeofbuilding;
    private String administrationequipment;
    private String institutioncategory;
    private String institutiontypeofbuilding;
    private String institutionequipment;
    private String socioprofessionalcategory;
    private String housekeepingtypeofbuilding;
    private String housekeepingequipment;
    private String secondaryuseforactivity;
    private String companytypeofbuilding;
    private String activities;
    private String createdUser;
    private LocalDateTime createdDate;
    private String lastEditedUser;
    private LocalDateTime lastEditedDate;
    private String meternumber;
    private String billing;
    private String stickercode;
    private String notes;
    private Integer metertype;
    private String username;
    private String validator;
    private Integer qualityverified;
    private Integer accessibility;

    public MetersCompteurDto() {}

    public MetersCompteurDto(MetersCompteur e) {
        if (e == null) return;
        this.id = e.getId();
        this.objectid = e.getObjectid();
        this.globalid = e.getGlobalid();
        this.subscriptionnumber = e.getSubscriptionnumber();
        this.counternumber = e.getCounternumber();
        this.policeno = e.getPoliceno();
        this.name = e.getName();
        this.firstname = e.getFirstname();
        this.customernature = e.getCustomernature();
        this.useofotherenergysource = e.getUseofotherenergysource();
        this.otherenergysources = e.getOtherenergysources();
        this.customertype = e.getCustomertype();
        this.subscribedpower = e.getSubscribedpower();
        this.use = e.getUse();
        this.administrationcategory = e.getAdministrationcategory();
        this.administrationtypeofbuilding = e.getAdministrationtypeofbuilding();
        this.administrationequipment = e.getAdministrationequipment();
        this.institutioncategory = e.getInstitutioncategory();
        this.institutiontypeofbuilding = e.getInstitutiontypeofbuilding();
        this.institutionequipment = e.getInstitutionequipment();
        this.socioprofessionalcategory = e.getSocioprofessionalcategory();
        this.housekeepingtypeofbuilding = e.getHousekeepingtypeofbuilding();
        this.housekeepingequipment = e.getHousekeepingequipment();
        this.secondaryuseforactivity = e.getSecondaryuseforactivity();
        this.companytypeofbuilding = e.getCompanytypeofbuilding();
        this.activities = e.getActivities();
        this.createdUser = e.getCreatedUser();
        this.createdDate = e.getCreatedDate();
        this.lastEditedUser = e.getLastEditedUser();
        this.lastEditedDate = e.getLastEditedDate();
        this.meternumber = e.getMeternumber();
        this.billing = e.getBilling();
        this.stickercode = e.getStickercode();
        this.notes = e.getNotes();
        this.metertype = e.getMetertype();
        this.username = e.getUsername();
        this.validator = e.getValidator();
        this.qualityverified = e.getQualityverified();
        this.accessibility = e.getAccessibility();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getObjectid() { return objectid; }
    public void setObjectid(Integer objectid) { this.objectid = objectid; }
    public String getGlobalid() { return globalid; }
    public void setGlobalid(String globalid) { this.globalid = globalid; }
    public String getSubscriptionnumber() { return subscriptionnumber; }
    public void setSubscriptionnumber(String subscriptionnumber) { this.subscriptionnumber = subscriptionnumber; }
    public String getCounternumber() { return counternumber; }
    public void setCounternumber(String counternumber) { this.counternumber = counternumber; }
    public String getPoliceno() { return policeno; }
    public void setPoliceno(String policeno) { this.policeno = policeno; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getFirstname() { return firstname; }
    public void setFirstname(String firstname) { this.firstname = firstname; }
    public String getCustomernature() { return customernature; }
    public void setCustomernature(String customernature) { this.customernature = customernature; }
    public String getUseofotherenergysource() { return useofotherenergysource; }
    public void setUseofotherenergysource(String useofotherenergysource) { this.useofotherenergysource = useofotherenergysource; }
    public String getOtherenergysources() { return otherenergysources; }
    public void setOtherenergysources(String otherenergysources) { this.otherenergysources = otherenergysources; }
    public String getCustomertype() { return customertype; }
    public void setCustomertype(String customertype) { this.customertype = customertype; }
    public Integer getSubscribedpower() { return subscribedpower; }
    public void setSubscribedpower(Integer subscribedpower) { this.subscribedpower = subscribedpower; }
    public String getUse() { return use; }
    public void setUse(String use) { this.use = use; }
    public String getAdministrationcategory() { return administrationcategory; }
    public void setAdministrationcategory(String administrationcategory) { this.administrationcategory = administrationcategory; }
    public String getAdministrationtypeofbuilding() { return administrationtypeofbuilding; }
    public void setAdministrationtypeofbuilding(String administrationtypeofbuilding) { this.administrationtypeofbuilding = administrationtypeofbuilding; }
    public String getAdministrationequipment() { return administrationequipment; }
    public void setAdministrationequipment(String administrationequipment) { this.administrationequipment = administrationequipment; }
    public String getInstitutioncategory() { return institutioncategory; }
    public void setInstitutioncategory(String institutioncategory) { this.institutioncategory = institutioncategory; }
    public String getInstitutiontypeofbuilding() { return institutiontypeofbuilding; }
    public void setInstitutiontypeofbuilding(String institutiontypeofbuilding) { this.institutiontypeofbuilding = institutiontypeofbuilding; }
    public String getInstitutionequipment() { return institutionequipment; }
    public void setInstitutionequipment(String institutionequipment) { this.institutionequipment = institutionequipment; }
    public String getSocioprofessionalcategory() { return socioprofessionalcategory; }
    public void setSocioprofessionalcategory(String socioprofessionalcategory) { this.socioprofessionalcategory = socioprofessionalcategory; }
    public String getHousekeepingtypeofbuilding() { return housekeepingtypeofbuilding; }
    public void setHousekeepingtypeofbuilding(String housekeepingtypeofbuilding) { this.housekeepingtypeofbuilding = housekeepingtypeofbuilding; }
    public String getHousekeepingequipment() { return housekeepingequipment; }
    public void setHousekeepingequipment(String housekeepingequipment) { this.housekeepingequipment = housekeepingequipment; }
    public String getSecondaryuseforactivity() { return secondaryuseforactivity; }
    public void setSecondaryuseforactivity(String secondaryuseforactivity) { this.secondaryuseforactivity = secondaryuseforactivity; }
    public String getCompanytypeofbuilding() { return companytypeofbuilding; }
    public void setCompanytypeofbuilding(String companytypeofbuilding) { this.companytypeofbuilding = companytypeofbuilding; }
    public String getActivities() { return activities; }
    public void setActivities(String activities) { this.activities = activities; }
    public String getCreatedUser() { return createdUser; }
    public void setCreatedUser(String createdUser) { this.createdUser = createdUser; }
    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
    public String getLastEditedUser() { return lastEditedUser; }
    public void setLastEditedUser(String lastEditedUser) { this.lastEditedUser = lastEditedUser; }
    public LocalDateTime getLastEditedDate() { return lastEditedDate; }
    public void setLastEditedDate(LocalDateTime lastEditedDate) { this.lastEditedDate = lastEditedDate; }
    public String getMeternumber() { return meternumber; }
    public void setMeternumber(String meternumber) { this.meternumber = meternumber; }
    public String getBilling() { return billing; }
    public void setBilling(String billing) { this.billing = billing; }
    public String getStickercode() { return stickercode; }
    public void setStickercode(String stickercode) { this.stickercode = stickercode; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Integer getMetertype() { return metertype; }
    public void setMetertype(Integer metertype) { this.metertype = metertype; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }
    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }
    public Integer getAccessibility() { return accessibility; }
    public void setAccessibility(Integer accessibility) { this.accessibility = accessibility; }
}