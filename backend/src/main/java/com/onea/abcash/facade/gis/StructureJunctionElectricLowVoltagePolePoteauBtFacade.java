package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.StructureJunctionElectricLowVoltagePolePoteauBt;
import com.onea.abcash.presentation.dto.gis.StructureJunctionElectricLowVoltagePolePoteauBtDto;
import com.onea.abcash.repository.gis.StructureJunctionElectricLowVoltagePolePoteauBtRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class StructureJunctionElectricLowVoltagePolePoteauBtFacade {

    private final StructureJunctionElectricLowVoltagePolePoteauBtRepository repository;

    public StructureJunctionElectricLowVoltagePolePoteauBtFacade(StructureJunctionElectricLowVoltagePolePoteauBtRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<StructureJunctionElectricLowVoltagePolePoteauBtDto> lister() {
        return repository.findAll().stream().map(StructureJunctionElectricLowVoltagePolePoteauBtDto::new).toList();
    }

    @Transactional(readOnly = true)
    public StructureJunctionElectricLowVoltagePolePoteauBtDto getById(Integer id) {
        return repository.findById(id).map(StructureJunctionElectricLowVoltagePolePoteauBtDto::new).orElse(null);
    }

    @Transactional
    public StructureJunctionElectricLowVoltagePolePoteauBtDto enregistrer(StructureJunctionElectricLowVoltagePolePoteauBtDto dto) {
        StructureJunctionElectricLowVoltagePolePoteauBt e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new StructureJunctionElectricLowVoltagePolePoteauBt()) : new StructureJunctionElectricLowVoltagePolePoteauBt();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setAccessoryfunction(dto.getAccessoryfunction());
                e.setAccessorymaterial(dto.getAccessorymaterial());
                e.setAccessorytype(dto.getAccessorytype());
                e.setAssetgroup(dto.getAssetgroup());
                e.setAssetid(dto.getAssetid());
                e.setAssettype(dto.getAssettype());
                e.setConstructionstatus(dto.getConstructionstatus());
                e.setCreatedDate(dto.getCreatedDate());
                e.setCreatedUser(dto.getCreatedUser());
                e.setCrossarmmaterial(dto.getCrossarmmaterial());
                e.setCrossarmposition(dto.getCrossarmposition());
                e.setCrossarmtype(dto.getCrossarmtype());
                e.setGlobalid(dto.getGlobalid());
                e.setHardwarematerial(dto.getHardwarematerial());
                e.setHardwaretype(dto.getHardwaretype());
                e.setHeightMetric(dto.getHeightMetric());
                e.setInsulatormaterial(dto.getInsulatormaterial());
                e.setInsulatortype(dto.getInsulatortype());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLifecyclestatus(dto.getLifecyclestatus());
                e.setMaintby(dto.getMaintby());
                e.setMaterialcode(dto.getMaterialcode());
                e.setOwnedby(dto.getOwnedby());
                e.setTypeofimplantation(dto.getTypeofimplantation());
                e.setQualityverified(dto.getQualityverified());
                e.setEarthing(dto.getEarthing());
                e.setEquipmenttypeorclass(dto.getEquipmenttypeorclass());
                e.setGrounding(dto.getGrounding());
                e.setPresenceofastreetlamp(dto.getPresenceofastreetlamp());
                e.setUsername(dto.getUsername());
                e.setValidator(dto.getValidator());
                e.setHeight(dto.getHeight());
                e.setNotes(dto.getNotes());
                e.setPa25(dto.getPa25());
                e.setSuspensionclampwithbracket(dto.getSuspensionclampwithbracket());
                e.setTensionclampwithbracket(dto.getTensionclampwithbracket());
                e.setAnglechampra25(dto.getAnglechampra25());
        e = repository.save(e);
        return new StructureJunctionElectricLowVoltagePolePoteauBtDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}