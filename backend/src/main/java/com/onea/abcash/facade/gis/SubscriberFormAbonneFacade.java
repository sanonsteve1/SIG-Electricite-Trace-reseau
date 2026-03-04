package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.SubscriberFormAbonne;
import com.onea.abcash.presentation.dto.gis.SubscriberFormAbonneDto;
import com.onea.abcash.repository.gis.SubscriberFormAbonneRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class SubscriberFormAbonneFacade {

    private final SubscriberFormAbonneRepository repository;

    public SubscriberFormAbonneFacade(SubscriberFormAbonneRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<SubscriberFormAbonneDto> lister() {
        return repository.findAll().stream().map(SubscriberFormAbonneDto::new).toList();
    }

    @Transactional(readOnly = true)
    public SubscriberFormAbonneDto getById(Integer id) {
        return repository.findById(id).map(SubscriberFormAbonneDto::new).orElse(null);
    }

    @Transactional
    public SubscriberFormAbonneDto enregistrer(SubscriberFormAbonneDto dto) {
        SubscriberFormAbonne e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new SubscriberFormAbonne()) : new SubscriberFormAbonne();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setSection(dto.getSection());
                e.setBatch(dto.getBatch());
                e.setPlot(dto.getPlot());
                e.setRank(dto.getRank());
                e.setMeternumber(dto.getMeternumber());
                e.setSubscribernumber(dto.getSubscribernumber());
                e.setGpsposition(dto.getGpsposition());
                e.setPhonenumber(dto.getPhonenumber());
                e.setCodesticker(dto.getCodesticker());
                e.setSubscribedpower(dto.getSubscribedpower());
                e.setAmperage(dto.getAmperage());
                e.setExploitation(dto.getExploitation());
                e.setCustomernature(dto.getCustomernature());
                e.setUseofotherenergysource(dto.getUseofotherenergysource());
                e.setOtherenergysource(dto.getOtherenergysource());
                e.setCustomertype(dto.getCustomertype());
                e.setUse(dto.getUse());
                e.setInstitutioncategory(dto.getInstitutioncategory());
                e.setTypeofframe(dto.getTypeofframe());
                e.setAdministrationcategory(dto.getAdministrationcategory());
                e.setActivities(dto.getActivities());
                e.setGlobalid(dto.getGlobalid());
                e.setCreatedUser(dto.getCreatedUser());
                e.setCreatedDate(dto.getCreatedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setNotes(dto.getNotes());
                e.setLot(dto.getLot());
                e.setSecondaryueofactivity(dto.getSecondaryueofactivity());
                e.setUsername(dto.getUsername());
                e.setValidator(dto.getValidator());
                e.setQualityverified(dto.getQualityverified());
                e.setAccessibility(dto.getAccessibility());
                e.setNameofsubcriber(dto.getNameofsubcriber());
                e.setPoliceno(dto.getPoliceno());
                e.setFirstname(dto.getFirstname());
                e.setSocioprofessionalcategory(dto.getSocioprofessionalcategory());
                e.setAdministrationequipment(dto.getAdministrationequipment());
                e.setInstitutionequipment(dto.getInstitutionequipment());
                e.setHousekeepingequipment(dto.getHousekeepingequipment());
        e = repository.save(e);
        return new SubscriberFormAbonneDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}