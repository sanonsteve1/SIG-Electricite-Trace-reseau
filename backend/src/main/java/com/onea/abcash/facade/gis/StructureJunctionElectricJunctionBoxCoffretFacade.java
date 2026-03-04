package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.StructureJunctionElectricJunctionBoxCoffret;
import com.onea.abcash.presentation.dto.gis.StructureJunctionElectricJunctionBoxCoffretDto;
import com.onea.abcash.repository.gis.StructureJunctionElectricJunctionBoxCoffretRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class StructureJunctionElectricJunctionBoxCoffretFacade {

    private final StructureJunctionElectricJunctionBoxCoffretRepository repository;

    public StructureJunctionElectricJunctionBoxCoffretFacade(StructureJunctionElectricJunctionBoxCoffretRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<StructureJunctionElectricJunctionBoxCoffretDto> lister() {
        return repository.findAll().stream().map(StructureJunctionElectricJunctionBoxCoffretDto::new).toList();
    }

    @Transactional(readOnly = true)
    public StructureJunctionElectricJunctionBoxCoffretDto getById(Integer id) {
        return repository.findById(id).map(StructureJunctionElectricJunctionBoxCoffretDto::new).orElse(null);
    }

    @Transactional
    public StructureJunctionElectricJunctionBoxCoffretDto enregistrer(StructureJunctionElectricJunctionBoxCoffretDto dto) {
        StructureJunctionElectricJunctionBoxCoffret e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new StructureJunctionElectricJunctionBoxCoffret()) : new StructureJunctionElectricJunctionBoxCoffret();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setAssetgroup(dto.getAssetgroup());
                e.setAssetid(dto.getAssetid());
                e.setAssettype(dto.getAssettype());
                e.setCreatedDate(dto.getCreatedDate());
                e.setCreatedUser(dto.getCreatedUser());
                e.setGlobalid(dto.getGlobalid());
                e.setHeight(dto.getHeight());
                e.setInstalldate(dto.getInstalldate());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLifecyclestatus(dto.getLifecyclestatus());
                e.setMaterialcode(dto.getMaterialcode());
                e.setQualityverified(dto.getQualityverified());
                e.setJunctionhtatype(dto.getJunctionhtatype());
                e.setUsername(dto.getUsername());
                e.setValidator(dto.getValidator());
                e.setBoxtype(dto.getBoxtype());
                e.setMetetype(dto.getMetetype());
                e.setMetermodel(dto.getMetermodel());
                e.setDistributionstationcode(dto.getDistributionstationcode());
                e.setMetersize(dto.getMetersize());
                e.setMeternumber(dto.getMeternumber());
                e.setManufacturer(dto.getManufacturer());
                e.setSection(dto.getSection());
                e.setAssignedvoltage(dto.getAssignedvoltage());
                e.setMaterial(dto.getMaterial());
                e.setNotes(dto.getNotes());
        e = repository.save(e);
        return new StructureJunctionElectricJunctionBoxCoffretDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}