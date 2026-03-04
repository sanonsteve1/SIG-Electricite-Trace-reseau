package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.StructueBoundaryElectricdistributionstationBoundaryLimitePo;
import com.onea.abcash.presentation.dto.gis.StructueBoundaryElectricdistributionstationBoundaryLimitePoDto;
import com.onea.abcash.repository.gis.StructueBoundaryElectricdistributionstationBoundaryLimitePoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class StructueBoundaryElectricdistributionstationBoundaryLimitePoFacade {

    private final StructueBoundaryElectricdistributionstationBoundaryLimitePoRepository repository;

    public StructueBoundaryElectricdistributionstationBoundaryLimitePoFacade(StructueBoundaryElectricdistributionstationBoundaryLimitePoRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<StructueBoundaryElectricdistributionstationBoundaryLimitePoDto> lister() {
        return repository.findAll().stream().map(StructueBoundaryElectricdistributionstationBoundaryLimitePoDto::new).toList();
    }

    @Transactional(readOnly = true)
    public StructueBoundaryElectricdistributionstationBoundaryLimitePoDto getById(Integer id) {
        return repository.findById(id).map(StructueBoundaryElectricdistributionstationBoundaryLimitePoDto::new).orElse(null);
    }

    @Transactional
    public StructueBoundaryElectricdistributionstationBoundaryLimitePoDto enregistrer(StructueBoundaryElectricdistributionstationBoundaryLimitePoDto dto) {
        StructueBoundaryElectricdistributionstationBoundaryLimitePo e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new StructueBoundaryElectricdistributionstationBoundaryLimitePo()) : new StructueBoundaryElectricdistributionstationBoundaryLimitePo();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setGlobalid(dto.getGlobalid());
                e.setAssetgroup(dto.getAssetgroup());
                e.setAssetid(dto.getAssetid());
                e.setAssettype(dto.getAssettype());
                e.setConstructionstatus(dto.getConstructionstatus());
                e.setCreatedDate(dto.getCreatedDate());
                e.setCreatedUser(dto.getCreatedUser());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLifecyclestatus(dto.getLifecyclestatus());
                e.setMaterialcode(dto.getMaterialcode());
                e.setUsername(dto.getUsername());
                e.setQualityverified(dto.getQualityverified());
                e.setValidator(dto.getValidator());
                e.setOwnedby(dto.getOwnedby());
                e.setMaintby(dto.getMaintby());
                e.setGrouding(dto.getGrouding());
                e.setNotes(dto.getNotes());
                e.setShapeLength(dto.getShapeLength());
                e.setShapeArea(dto.getShapeArea());
        e = repository.save(e);
        return new StructueBoundaryElectricdistributionstationBoundaryLimitePoDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}