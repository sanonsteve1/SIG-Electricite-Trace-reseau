package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricLineLowVoltageOverheadConductorLigneBtAerien;
import com.onea.abcash.presentation.dto.gis.ElectricLineLowVoltageOverheadConductorLigneBtAerienDto;
import com.onea.abcash.repository.gis.ElectricLineLowVoltageOverheadConductorLigneBtAerienRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricLineLowVoltageOverheadConductorLigneBtAerienFacade {

    private final ElectricLineLowVoltageOverheadConductorLigneBtAerienRepository repository;

    public ElectricLineLowVoltageOverheadConductorLigneBtAerienFacade(ElectricLineLowVoltageOverheadConductorLigneBtAerienRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricLineLowVoltageOverheadConductorLigneBtAerienDto> lister() {
        return repository.findAll().stream().map(ElectricLineLowVoltageOverheadConductorLigneBtAerienDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricLineLowVoltageOverheadConductorLigneBtAerienDto getById(Integer id) {
        return repository.findById(id).map(ElectricLineLowVoltageOverheadConductorLigneBtAerienDto::new).orElse(null);
    }

    @Transactional
    public ElectricLineLowVoltageOverheadConductorLigneBtAerienDto enregistrer(ElectricLineLowVoltageOverheadConductorLigneBtAerienDto dto) {
        ElectricLineLowVoltageOverheadConductorLigneBtAerien e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricLineLowVoltageOverheadConductorLigneBtAerien()) : new ElectricLineLowVoltageOverheadConductorLigneBtAerien();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setGlobalid(dto.getGlobalid());
                e.setAssetgroup(dto.getAssetgroup());
                e.setAssettype(dto.getAssettype());
                e.setCommonconductortype(dto.getCommonconductortype());
                e.setCreatedDate(dto.getCreatedDate());
                e.setCreatedUser(dto.getCreatedUser());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLifecyclestatus(dto.getLifecyclestatus());
                e.setNeutraltype(dto.getNeutraltype());
                e.setNominalvoltage(dto.getNominalvoltage());
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setSourceoffunding(dto.getSourceoffunding());
                e.setUsername(dto.getUsername());
                e.setQualityverified(dto.getQualityverified());
                e.setValidator(dto.getValidator());
                e.setLinetype(dto.getLinetype());
                e.setConductorsize(dto.getConductorsize());
                e.setConductorstatus(dto.getConductorstatus());
                e.setAssetid(dto.getAssetid());
                e.setLowvoltagefeedercode(dto.getLowvoltagefeedercode());
                e.setNotes(dto.getNotes());
                e.setTypeofmaterial(dto.getTypeofmaterial());
                e.setSection(dto.getSection());
                e.setPhasechange(dto.getPhasechange());
                e.setPhasesenergized(dto.getPhasesenergized());
                e.setShapeLength(dto.getShapeLength());
        e = repository.save(e);
        return new ElectricLineLowVoltageOverheadConductorLigneBtAerienDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}