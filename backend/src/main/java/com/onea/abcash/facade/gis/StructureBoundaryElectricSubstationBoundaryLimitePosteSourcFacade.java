package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.StructureBoundaryElectricSubstationBoundaryLimitePosteSourc;
import com.onea.abcash.presentation.dto.gis.StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto;
import com.onea.abcash.repository.gis.StructureBoundaryElectricSubstationBoundaryLimitePosteSourcRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class StructureBoundaryElectricSubstationBoundaryLimitePosteSourcFacade {

    private final StructureBoundaryElectricSubstationBoundaryLimitePosteSourcRepository repository;

    public StructureBoundaryElectricSubstationBoundaryLimitePosteSourcFacade(StructureBoundaryElectricSubstationBoundaryLimitePosteSourcRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto> lister() {
        return repository.findAll().stream().map(StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto::new).toList();
    }

    @Transactional(readOnly = true)
    public StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto getById(Integer id) {
        return repository.findById(id).map(StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto::new).orElse(null);
    }

    @Transactional
    public StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto enregistrer(StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto dto) {
        StructureBoundaryElectricSubstationBoundaryLimitePosteSourc e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new StructureBoundaryElectricSubstationBoundaryLimitePosteSourc()) : new StructureBoundaryElectricSubstationBoundaryLimitePosteSourc();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setAssetgroup(dto.getAssetgroup());
                e.setAssetid(dto.getAssetid());
                e.setAssettype(dto.getAssettype());
                e.setConstructionstatus(dto.getConstructionstatus());
                e.setCreatedDate(dto.getCreatedDate());
                e.setCreatedUser(dto.getCreatedUser());
                e.setGlobalid(dto.getGlobalid());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLifecyclestatus(dto.getLifecyclestatus());
                e.setMaterialcode(dto.getMaterialcode());
                e.setUsername(dto.getUsername());
                e.setQualityverified(dto.getQualityverified());
                e.setValidator(dto.getValidator());
                e.setMaintby(dto.getMaintby());
                e.setOwnedby(dto.getOwnedby());
                e.setNotes(dto.getNotes());
                e.setOperation(dto.getOperation());
                e.setOtherequipments(dto.getOtherequipments());
                e.setShapeLength(dto.getShapeLength());
                e.setShapeArea(dto.getShapeArea());
        e = repository.save(e);
        return new StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}