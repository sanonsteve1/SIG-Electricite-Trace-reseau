package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricLineLowVoltageServiceLigneBranchementBt;
import com.onea.abcash.presentation.dto.gis.ElectricLineLowVoltageServiceLigneBranchementBtDto;
import com.onea.abcash.repository.gis.ElectricLineLowVoltageServiceLigneBranchementBtRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricLineLowVoltageServiceLigneBranchementBtFacade {

    private final ElectricLineLowVoltageServiceLigneBranchementBtRepository repository;

    public ElectricLineLowVoltageServiceLigneBranchementBtFacade(ElectricLineLowVoltageServiceLigneBranchementBtRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricLineLowVoltageServiceLigneBranchementBtDto> lister() {
        return repository.findAll().stream().map(ElectricLineLowVoltageServiceLigneBranchementBtDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricLineLowVoltageServiceLigneBranchementBtDto getById(Integer id) {
        return repository.findById(id).map(ElectricLineLowVoltageServiceLigneBranchementBtDto::new).orElse(null);
    }

    @Transactional
    public ElectricLineLowVoltageServiceLigneBranchementBtDto enregistrer(ElectricLineLowVoltageServiceLigneBranchementBtDto dto) {
        ElectricLineLowVoltageServiceLigneBranchementBt e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricLineLowVoltageServiceLigneBranchementBt()) : new ElectricLineLowVoltageServiceLigneBranchementBt();
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
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setUsername(dto.getUsername());
                e.setQualityverified(dto.getQualityverified());
                e.setValidator(dto.getValidator());
                e.setNominalvoltage(dto.getNominalvoltage());
                e.setConductorsize(dto.getConductorsize());
                e.setTypeofmaterial(dto.getTypeofmaterial());
                e.setNotes(dto.getNotes());
                e.setAssetid(dto.getAssetid());
                e.setSection(dto.getSection());
                e.setPhasechange(dto.getPhasechange());
                e.setPhasesenergized(dto.getPhasesenergized());
                e.setShapeLength(dto.getShapeLength());
        e = repository.save(e);
        return new ElectricLineLowVoltageServiceLigneBranchementBtDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}