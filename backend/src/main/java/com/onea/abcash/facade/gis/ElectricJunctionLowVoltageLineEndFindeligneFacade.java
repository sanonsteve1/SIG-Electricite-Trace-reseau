package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricJunctionLowVoltageLineEndFindeligne;
import com.onea.abcash.presentation.dto.gis.ElectricJunctionLowVoltageLineEndFindeligneDto;
import com.onea.abcash.repository.gis.ElectricJunctionLowVoltageLineEndFindeligneRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricJunctionLowVoltageLineEndFindeligneFacade {

    private final ElectricJunctionLowVoltageLineEndFindeligneRepository repository;

    public ElectricJunctionLowVoltageLineEndFindeligneFacade(ElectricJunctionLowVoltageLineEndFindeligneRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricJunctionLowVoltageLineEndFindeligneDto> lister() {
        return repository.findAll().stream().map(ElectricJunctionLowVoltageLineEndFindeligneDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricJunctionLowVoltageLineEndFindeligneDto getById(Integer id) {
        return repository.findById(id).map(ElectricJunctionLowVoltageLineEndFindeligneDto::new).orElse(null);
    }

    @Transactional
    public ElectricJunctionLowVoltageLineEndFindeligneDto enregistrer(ElectricJunctionLowVoltageLineEndFindeligneDto dto) {
        ElectricJunctionLowVoltageLineEndFindeligne e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricJunctionLowVoltageLineEndFindeligne()) : new ElectricJunctionLowVoltageLineEndFindeligne();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setAssetgroup(dto.getAssetgroup());
                e.setAssettype(dto.getAssettype());
                e.setGlobalid(dto.getGlobalid());
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setCreatedUser(dto.getCreatedUser());
                e.setCreatedDate(dto.getCreatedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setQualityverified(dto.getQualityverified());
                e.setManufacturer(dto.getManufacturer());
                e.setUsername(dto.getUsername());
                e.setValidator(dto.getValidator());
                e.setNumphasesconstructed(dto.getNumphasesconstructed());
                e.setNotes(dto.getNotes());
        e = repository.save(e);
        return new ElectricJunctionLowVoltageLineEndFindeligneDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}