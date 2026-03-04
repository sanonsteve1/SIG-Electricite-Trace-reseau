package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricLineMediumVoltageOverheadConductorLigneHtaAerien;
import com.onea.abcash.presentation.dto.gis.ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto;
import com.onea.abcash.repository.gis.ElectricLineMediumVoltageOverheadConductorLigneHtaAerienRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricLineMediumVoltageOverheadConductorLigneHtaAerienFacade {

    private final ElectricLineMediumVoltageOverheadConductorLigneHtaAerienRepository repository;

    public ElectricLineMediumVoltageOverheadConductorLigneHtaAerienFacade(ElectricLineMediumVoltageOverheadConductorLigneHtaAerienRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto> lister() {
        return repository.findAll().stream().map(ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto getById(Integer id) {
        return repository.findById(id).map(ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto::new).orElse(null);
    }

    @Transactional
    public ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto enregistrer(ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto dto) {
        ElectricLineMediumVoltageOverheadConductorLigneHtaAerien e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricLineMediumVoltageOverheadConductorLigneHtaAerien()) : new ElectricLineMediumVoltageOverheadConductorLigneHtaAerien();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setAssetgroup(dto.getAssetgroup());
                e.setAssettype(dto.getAssettype());
                e.setCommonconductortype(dto.getCommonconductortype());
                e.setCreatedDate(dto.getCreatedDate());
                e.setCreatedUser(dto.getCreatedUser());
                e.setGlobalid(dto.getGlobalid());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLifecyclestatus(dto.getLifecyclestatus());
                e.setNominalvoltage(dto.getNominalvoltage());
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setQualityverified(dto.getQualityverified());
                e.setSourceoffunding(dto.getSourceoffunding());
                e.setConductorstatus(dto.getConductorstatus());
                e.setTypeofmaterial(dto.getTypeofmaterial());
                e.setUsername(dto.getUsername());
                e.setValidator(dto.getValidator());
                e.setFeederscode(dto.getFeederscode());
                e.setNotes(dto.getNotes());
                e.setAssetid(dto.getAssetid());
                e.setNumphasesconstructed(dto.getNumphasesconstructed());
                e.setConstructionstatus(dto.getConstructionstatus());
                e.setSection(dto.getSection());
                e.setConductorsize(dto.getConductorsize());
                e.setInstalldate(dto.getInstalldate());
                e.setPhasechange(dto.getPhasechange());
                e.setPhasesenergized(dto.getPhasesenergized());
                e.setShapeLength(dto.getShapeLength());
        e = repository.save(e);
        return new ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}