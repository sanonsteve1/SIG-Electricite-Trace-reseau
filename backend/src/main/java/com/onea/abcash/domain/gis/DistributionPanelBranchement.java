package com.onea.abcash.domain.gis;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "DistributionPanel_branchement")
public class DistributionPanelBranchement {

    @Id
    @SequenceGenerator(name = "DistributionPanel_branchement_id_seq", sequenceName = "DistributionPanel_branchement_id_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "DistributionPanel_branchement_id_seq")
    private Integer id;

    private Integer objectid;

    private String subscribername;

    private Integer connectiontype;

    private Integer transformationreport;

    private String codesticker;

    private String existencedecompteur;

    private String customercode;

    private String name;

    private String firstname;

    private String phone;

    @Column(name = "n_cnib")
    private String nCnib;

    private String globalid;

    @Column(name = "created_user")
    private String createdUser;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "last_edited_user")
    private String lastEditedUser;

    @Column(name = "last_edited_date")
    private LocalDateTime lastEditedDate;

    private String notes;

    private String username;

    private String validator;

    private Integer qualityverified;

    private Integer accessibility;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getObjectid() { return objectid; }
    public void setObjectid(Integer objectid) { this.objectid = objectid; }

    public String getSubscribername() { return subscribername; }
    public void setSubscribername(String subscribername) { this.subscribername = subscribername; }

    public Integer getConnectiontype() { return connectiontype; }
    public void setConnectiontype(Integer connectiontype) { this.connectiontype = connectiontype; }

    public Integer getTransformationreport() { return transformationreport; }
    public void setTransformationreport(Integer transformationreport) { this.transformationreport = transformationreport; }

    public String getCodesticker() { return codesticker; }
    public void setCodesticker(String codesticker) { this.codesticker = codesticker; }

    public String getExistencedecompteur() { return existencedecompteur; }
    public void setExistencedecompteur(String existencedecompteur) { this.existencedecompteur = existencedecompteur; }

    public String getCustomercode() { return customercode; }
    public void setCustomercode(String customercode) { this.customercode = customercode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getFirstname() { return firstname; }
    public void setFirstname(String firstname) { this.firstname = firstname; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getNCnib() { return nCnib; }
    public void setNCnib(String nCnib) { this.nCnib = nCnib; }

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

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getValidator() { return validator; }
    public void setValidator(String validator) { this.validator = validator; }

    public Integer getQualityverified() { return qualityverified; }
    public void setQualityverified(Integer qualityverified) { this.qualityverified = qualityverified; }

    public Integer getAccessibility() { return accessibility; }
    public void setAccessibility(Integer accessibility) { this.accessibility = accessibility; }

}