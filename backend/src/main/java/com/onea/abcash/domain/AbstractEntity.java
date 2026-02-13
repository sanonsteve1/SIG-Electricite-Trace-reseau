package com.onea.abcash.domain;

import com.onea.abcash.security.SecurityUtils;
import com.onea.abcash.enums.JpaConstants;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@MappedSuperclass
public abstract class AbstractEntity implements JpaConstants {

    @Column(name = "create_by")
    private String createBy;
    @Column(name = "create_at")
    private LocalDateTime createAt;

    @Column(name = "update_by")
    private String updateBy;

    @Column(name = "update_at")
    private LocalDateTime updateAt;

    @Version
    private long version;

    public String getCreateBy() {
        return createBy;
    }

    public LocalDateTime getCreateAt() {
        return createAt;
    }

    public String getUpdateBy() {
        return updateBy;
    }

    public LocalDateTime getUpdateAt() {
        return updateAt;
    }

    public long getVersion() {
        return version;
    }

    @Transient
    public boolean isNew() {
        return getId() == null;
    }

    /**
     * recupère l'Id de l'entités
     *
     * @return travail sur
     */
    public abstract Long getId();

    @PreUpdate
    public void beforeUpdate() {
        updateAt = LocalDateTime.now();
        updateBy = SecurityUtils.lireLoginUtilisateurConnecte();
    }

    @PrePersist
    public void beforeInsert() {
        createAt = LocalDateTime.now();
        createBy = SecurityUtils.lireLoginUtilisateurConnecte();
    }
}
