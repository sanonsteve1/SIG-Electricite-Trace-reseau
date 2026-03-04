package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricLineMediumVoltageUndergroundConductorLigneHtaSouter;
import com.onea.abcash.presentation.dto.gis.ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto;
import com.onea.abcash.repository.gis.ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterFacade {

    private final ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterRepository repository;

    public ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterFacade(ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto> lister() {
        return repository.findAll().stream().map(ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto getById(Integer id) {
        return repository.findById(id).map(ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto::new).orElse(null);
    }

    @Transactional
    public ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto enregistrer(ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto dto) {
        ElectricLineMediumVoltageUndergroundConductorLigneHtaSouter e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricLineMediumVoltageUndergroundConductorLigneHtaSouter()) : new ElectricLineMediumVoltageUndergroundConductorLigneHtaSouter();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setAssetgroup(dto.getAssetgroup());
                e.setAssettype(dto.getAssettype());
                e.setCommonconductortype(dto.getCommonconductortype());
                e.setCreatedDate(dto.getCreatedDate());
                e.setCreatedUser(dto.getCreatedUser());
                e.setGlobalid(dto.getGlobalid());
                e.setInstalldate(dto.getInstalldate());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLifecyclestatus(dto.getLifecyclestatus());
                e.setNominalvoltage(dto.getNominalvoltage());
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setQualityverified(dto.getQualityverified());
                e.setConductorstatus(dto.getConductorstatus());
                e.setConductorsize(dto.getConductorsize());
                e.setOwnedby(dto.getOwnedby());
                e.setTypeofmaterial(dto.getTypeofmaterial());
                e.setUsername(dto.getUsername());
                e.setValidator(dto.getValidator());
                e.setSourceoffunding(dto.getSourceoffunding());
                e.setNotes(dto.getNotes());
                e.setAssetid(dto.getAssetid());
                e.setNumphasesconstructed(dto.getNumphasesconstructed());
                e.setSection(dto.getSection());
                e.setPhasechange(dto.getPhasechange());
                e.setPhasesenergized(dto.getPhasesenergized());
                e.setShapeLength(dto.getShapeLength());
        e = repository.save(e);
        return new ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}