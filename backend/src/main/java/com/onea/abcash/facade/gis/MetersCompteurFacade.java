package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.MetersCompteur;
import com.onea.abcash.presentation.dto.gis.MetersCompteurDto;
import com.onea.abcash.repository.gis.MetersCompteurRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class MetersCompteurFacade {

    private final MetersCompteurRepository repository;

    public MetersCompteurFacade(MetersCompteurRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<MetersCompteurDto> lister() {
        return repository.findAll().stream().map(MetersCompteurDto::new).toList();
    }

    @Transactional(readOnly = true)
    public MetersCompteurDto getById(Integer id) {
        return repository.findById(id).map(MetersCompteurDto::new).orElse(null);
    }

    @Transactional
    public MetersCompteurDto enregistrer(MetersCompteurDto dto) {
        MetersCompteur e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new MetersCompteur()) : new MetersCompteur();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setGlobalid(dto.getGlobalid());
                e.setSubscriptionnumber(dto.getSubscriptionnumber());
                e.setCounternumber(dto.getCounternumber());
                e.setPoliceno(dto.getPoliceno());
                e.setName(dto.getName());
                e.setFirstname(dto.getFirstname());
                e.setCustomernature(dto.getCustomernature());
                e.setUseofotherenergysource(dto.getUseofotherenergysource());
                e.setOtherenergysources(dto.getOtherenergysources());
                e.setCustomertype(dto.getCustomertype());
                e.setSubscribedpower(dto.getSubscribedpower());
                e.setUse(dto.getUse());
                e.setAdministrationcategory(dto.getAdministrationcategory());
                e.setAdministrationtypeofbuilding(dto.getAdministrationtypeofbuilding());
                e.setAdministrationequipment(dto.getAdministrationequipment());
                e.setInstitutioncategory(dto.getInstitutioncategory());
                e.setInstitutiontypeofbuilding(dto.getInstitutiontypeofbuilding());
                e.setInstitutionequipment(dto.getInstitutionequipment());
                e.setSocioprofessionalcategory(dto.getSocioprofessionalcategory());
                e.setHousekeepingtypeofbuilding(dto.getHousekeepingtypeofbuilding());
                e.setHousekeepingequipment(dto.getHousekeepingequipment());
                e.setSecondaryuseforactivity(dto.getSecondaryuseforactivity());
                e.setCompanytypeofbuilding(dto.getCompanytypeofbuilding());
                e.setActivities(dto.getActivities());
                e.setCreatedUser(dto.getCreatedUser());
                e.setCreatedDate(dto.getCreatedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setMeternumber(dto.getMeternumber());
                e.setBilling(dto.getBilling());
                e.setStickercode(dto.getStickercode());
                e.setNotes(dto.getNotes());
                e.setMetertype(dto.getMetertype());
                e.setUsername(dto.getUsername());
                e.setValidator(dto.getValidator());
                e.setQualityverified(dto.getQualityverified());
                e.setAccessibility(dto.getAccessibility());
        e = repository.save(e);
        return new MetersCompteurDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}