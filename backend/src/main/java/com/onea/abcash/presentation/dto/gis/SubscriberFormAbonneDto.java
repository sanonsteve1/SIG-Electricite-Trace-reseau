package com.onea.abcash.presentation.dto.gis;

import com.onea.abcash.domain.gis.SubscriberFormAbonne;
import java.time.LocalDateTime;

public class SubscriberFormAbonneDto {

    private Integer id;

    private Integer objectid;
    private String section;
    private String batch;
    private String plot;
    private String rank;
    private String meternumber;
    private String subscribernumber;
    private Integer gpsposition;
    private Integer phonenumber;
    private Integer codesticker;
    private Integer subscribedpower;
    private Integer amperage;
    private String exploitation;
    private String customernature;
    private String useofotherenergysource;
    private String otherenergysource;
    private String customertype;
    private String use;
    private String institutioncategory;
    private String typeofframe;
    private String administrationcategory;
    private String activities;
    private String globalid;
    private String createdUser;
    private LocalDateTime createdDate;
    private String lastEditedUser;
    private LocalDateTime lastEditedDate;
    private String notes;
    private Integer lot;
    private Integer secondaryueofactivity;
    private String username;
    private String validator;
    private Integer qualityverified;
    private Integer accessibility;
    private String nameofsubcriber;
    private String policeno;
    private String firstname;
    private String socioprofessionalcategory;
    private String administrationequipment;
    private String institutionequipment;
    private String housekeepingequipment;

    public SubscriberFormAbonneDto() {}

    public SubscriberFormAbonneDto(SubscriberFormAbonne e) {
        if (e == null) return;
        this.id = e.getId();
        this.objectid = e.getObjectid();
        this.section = e.getSection();
        this.batch = e.getBatch();
        this.plot = e.getPlot();
        this.rank = e.getRank();
        this.meternumber = e.getMeternumber();
        this.subscribernumber = e.getSubscribernumber();
        this.gpsposition = e.getGpsposition();
        this.phonenumber = e.getPhonenumber();
        this.codesticker = e.getCodesticker();
        this.subscribedpower = e.getSubscribedpower();
        this.amperage = e.getAmperage();
        this.exploitation = e.getExploitation();
        this.customernature = e.getCustomernature();
        this.useofotherenergysource = e.getUseofotherenergysource();
        this.otherenergysource = e.getOtherenergysource();
        this.customertype = e.getCustomertype();
        this.use = e.getUse();
        this.institutioncategory = e.getInstitutioncategory();
        this.typeofframe = e.getTypeofframe();
        this.administrationcategory = e.getAdministrationcategory();
        this.activities = e.getActivities();
        this.globalid = e.getGlobalid();
        this.createdUser = e.getCreatedUser();
        this.createdDate = e.getCreatedDate();
        this.lastEditedUser = e.getLastEditedUser();
        this.lastEditedDate = e.getLastEditedDate();
        this.notes = e.getNotes();
        this.lot = e.getLot();
        this.secondaryueofactivity = e.getSecondaryueofactivity();
        this.username = e.getUsername();
        this.validator = e.getValidator();
        this.qualityverified = e.getQualityverified();
        this.accessibility = e.getAccessibility();
        this.nameofsubcriber = e.getNameofsubcriber();
        this.policeno = e.getPoliceno();
        this.firstname = e.getFirstname();
        this.socioprofessionalcategory = e.getSocioprofessionalcategory();
        this.administrationequipment = e.getAdministrationequipment();
        this.institutionequipment = e.getInstitutionequipment();
        this.housekeepingequipment = e.getHousekeepingequipment();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getObjectid() { return objectid; }
    public void setObjectid(Integer objectid) { this.objectid = objectid; }
    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }
    public String getBatch() { return batch; }
    public void setBatch(String batch) { this.batch = batch; }
    public String getPlot() { return plot; }
    public void setPlot(String plot) { this.plot = plot; }
    public String getRank() { return rank; }
    public void setRank(String rank) { this.rank = rank; }
    public String getMeternumber() { return meternumber; }
    public void setMeternumber(String meternumber) { this.meternumber = meternumber; }
    public String getSubscribernumber() { return subscribernumber; }
    public void setSubscribernumber(String subscribernumber) { this.subscribernumber = subscribernumber; }
    public Integer getGpsposition() { return gpsposition; }
    public void setGpsposition(Integer gpsposition) { this.gpsposition = gpsposition; }
    public Integer getPhonenumber() { return phonenumber; }
    public void setPhonenumber(Integer phonenumber) { this.phonenumber = phonenumber; }
    public Integer getCodesticker() { return codesticker; }
    public void setCodesticker(Integer codesticker) { this.codesticker = codesticker; }
    public Integer getSubscribedpower() { return subscribedpower; }
    public void setSubscribedpower(Integer subscribedpower) { this.subscribedpower = subscribedpower; }
    public Integer getAmperage() { return amperage; }
    public void setAmperage(Integer amperage) { this.amperage = amperage; }
    public String getExploitation() { return exploitation; }
    public void setExploitation(String exploitation) { this.exploitation = exploitation; }
    public String getCustomernature() { return customernature; }
    public void setCustomernature(String customernature) { this.customernature = customernature; }
    public String getUseofotherenergysource() { return useofotherenergysource; }
    public void setUseofotherenergysource(String useofotherenergysource) { this.useofotherenergysource = useofotherenergysource; }
    public String getOtherenergysource() { return otherenergysource; }
    public void setOtherenergysource(String otherenergysource) { this.otherenergysource = otherenergysource; }
    public String getCustomertype() { return customertype; }
    public void setCustomertype(String customertype) { this.customertype = customertype; }
    public String getUse() { return use; }
    public void setUse(String use) { this.use = use; }
    public String getInstitutioncategory() { return institutioncategory; }
    public void setInstitutioncategory(String institutioncategory) { this.institutioncategory = institutioncategory; }
    public String getTypeofframe() { return typeofframe; }
    public void setTypeofframe(String typeofframe) { this.typeofframe = typeofframe; }
    public String getAdministrationcategory() { return administrationcategory; }
    public void setAdministrationcategory(String administrationcategory) { this.administrationcategory = administrationcategory; }
    public String getActivities() { return activities; }
    public void setActivities(String activities) { this.activities = activities; }
    public String getGlobalid() { return globalid; }
    public void setGlobalid(String globalid) { this.globalid = globalid; }
    public String getCreatedUser() { return createdUser; }
    public void setCreatedUser(String createdUser) { this.createdUser = createdUser; }
    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
    public String getLastEditedUser() { return lastEditedUser; }
    public void setLastEditedUser(String lastEditedUser) { this.lastEditedUser = lastEditedUser; }
    public LocalDateTime getLastEditedDate() { return lastEditedDate; }
    public void setLastEditedDate(LocalDateTime lastEditedDate) { this.lastEditedDate = lastEditedDate; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Integer getLot() { return lot; }
    public void setLot(Integer lot) { this.lot = lot; }
    public Integer getSecondaryueofactivity() { return secondaryueofactivity; }
    public void setSecondaryueofactivity(Integer secondaryueofactivity) { this.secondaryueofactivity = secondaryueofactivity; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }
    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }
    public Integer getAccessibility() { return accessibility; }
    public void setAccessibility(Integer accessibility) { this.accessibility = accessibility; }
    public String getNameofsubcriber() { return nameofsubcriber; }
    public void setNameofsubcriber(String nameofsubcriber) { this.nameofsubcriber = nameofsubcriber; }
    public String getPoliceno() { return policeno; }
    public void setPoliceno(String policeno) { this.policeno = policeno; }
    public String getFirstname() { return firstname; }
    public void setFirstname(String firstname) { this.firstname = firstname; }
    public String getSocioprofessionalcategory() { return socioprofessionalcategory; }
    public void setSocioprofessionalcategory(String socioprofessionalcategory) { this.socioprofessionalcategory = socioprofessionalcategory; }
    public String getAdministrationequipment() { return administrationequipment; }
    public void setAdministrationequipment(String administrationequipment) { this.administrationequipment = administrationequipment; }
    public String getInstitutionequipment() { return institutionequipment; }
    public void setInstitutionequipment(String institutionequipment) { this.institutionequipment = institutionequipment; }
    public String getHousekeepingequipment() { return housekeepingequipment; }
    public void setHousekeepingequipment(String housekeepingequipment) { this.housekeepingequipment = housekeepingequipment; }
}