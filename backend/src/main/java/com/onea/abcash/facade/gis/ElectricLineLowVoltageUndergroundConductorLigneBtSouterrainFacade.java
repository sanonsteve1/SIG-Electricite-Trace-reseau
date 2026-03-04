package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricLineLowVoltageUndergroundConductorLigneBtSouterrain;
import com.onea.abcash.presentation.dto.gis.ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto;
import com.onea.abcash.repository.gis.ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainFacade {

    private final ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainRepository repository;

    public ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainFacade(ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto> lister() {
        return repository.findAll().stream().map(ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto getById(Integer id) {
        return repository.findById(id).map(ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto::new).orElse(null);
    }

    @Transactional
    public ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto enregistrer(ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto dto) {
        ElectricLineLowVoltageUndergroundConductorLigneBtSouterrain e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricLineLowVoltageUndergroundConductorLigneBtSouterrain()) : new ElectricLineLowVoltageUndergroundConductorLigneBtSouterrain();
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
                e.setNeutraltype(dto.getNeutraltype());
                e.setNominalvoltage(dto.getNominalvoltage());
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setSourceoffunding(dto.getSourceoffunding());
                e.setQualityverified(dto.getQualityverified());
                e.setConductorstatus(dto.getConductorstatus());
                e.setUsername(dto.getUsername());
                e.setValidator(dto.getValidator());
                e.setAssetid(dto.getAssetid());
                e.setLinetype(dto.getLinetype());
                e.setLowvoltagefeedercode(dto.getLowvoltagefeedercode());
                e.setNumphasesconstructed(dto.getNumphasesconstructed());
                e.setTypeofmaterial(dto.getTypeofmaterial());
                e.setValidatedby(dto.getValidatedby());
                e.setSection(dto.getSection());
                e.setConductorsize(dto.getConductorsize());
                e.setPhasechange(dto.getPhasechange());
                e.setPhasesenergized(dto.getPhasesenergized());
                e.setNotes(dto.getNotes());
                e.setShapeLength(dto.getShapeLength());
        e = repository.save(e);
        return new ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}