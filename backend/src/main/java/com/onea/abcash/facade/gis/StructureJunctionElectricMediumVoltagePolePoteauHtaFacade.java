package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.StructureJunctionElectricMediumVoltagePolePoteauHta;
import com.onea.abcash.presentation.dto.gis.StructureJunctionElectricMediumVoltagePolePoteauHtaDto;
import com.onea.abcash.repository.gis.StructureJunctionElectricMediumVoltagePolePoteauHtaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class StructureJunctionElectricMediumVoltagePolePoteauHtaFacade {

    private final StructureJunctionElectricMediumVoltagePolePoteauHtaRepository repository;

    public StructureJunctionElectricMediumVoltagePolePoteauHtaFacade(StructureJunctionElectricMediumVoltagePolePoteauHtaRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<StructureJunctionElectricMediumVoltagePolePoteauHtaDto> lister() {
        return repository.findAll().stream().map(StructureJunctionElectricMediumVoltagePolePoteauHtaDto::new).toList();
    }

    @Transactional(readOnly = true)
    public StructureJunctionElectricMediumVoltagePolePoteauHtaDto getById(Integer id) {
        return repository.findById(id).map(StructureJunctionElectricMediumVoltagePolePoteauHtaDto::new).orElse(null);
    }

    @Transactional
    public StructureJunctionElectricMediumVoltagePolePoteauHtaDto enregistrer(StructureJunctionElectricMediumVoltagePolePoteauHtaDto dto) {
        StructureJunctionElectricMediumVoltagePolePoteauHta e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new StructureJunctionElectricMediumVoltagePolePoteauHta()) : new StructureJunctionElectricMediumVoltagePolePoteauHta();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setAccessoryfunction(dto.getAccessoryfunction());
                e.setAccessorymaterial(dto.getAccessorymaterial());
                e.setAccessorytype(dto.getAccessorytype());
                e.setAssembly(dto.getAssembly());
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
                e.setInsulatormaterial(dto.getInsulatormaterial());
                e.setInsulatortype(dto.getInsulatortype());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLifecyclestatus(dto.getLifecyclestatus());
                e.setMaintby(dto.getMaintby());
                e.setManufacturer(dto.getManufacturer());
                e.setMaterialcode(dto.getMaterialcode());
                e.setOwnedby(dto.getOwnedby());
                e.setTypeofinstallation(dto.getTypeofinstallation());
                e.setQualityverified(dto.getQualityverified());
                e.setEarthing(dto.getEarthing());
                e.setTemplate(dto.getTemplate());
                e.setEquipmenttypeorclass(dto.getEquipmenttypeorclass());
                e.setGrounding(dto.getGrounding());
                e.setAccessorylv(dto.getAccessorylv());
                e.setPresenceofastreetlamp(dto.getPresenceofastreetlamp());
                e.setValidator(dto.getValidator());
                e.setNotes(dto.getNotes());
                e.setFittingtype(dto.getFittingtype());
                e.setHeight(dto.getHeight());
                e.setUsername(dto.getUsername());
                e.setFlag(dto.getFlag());
                e.setArchedcrossarm(dto.getArchedcrossarm());
                e.setAlternatingorstaggered(dto.getAlternatingorstaggered());
                e.setTriangle(dto.getTriangle());
                e.setCanadianstylecrossarm(dto.getCanadianstylecrossarm());
                e.setHorizontalcrossarm(dto.getHorizontalcrossarm());
                e.setOthers(dto.getOthers());
                e.setPa25(dto.getPa25());
                e.setSuspensionclampwithbracket(dto.getSuspensionclampwithbracket());
                e.setTensionclampwithbracket(dto.getTensionclampwithbracket());
                e.setAnglechampra25(dto.getAnglechampra25());
                e.setCrossarm(dto.getCrossarm());
                e.setSidearm(dto.getSidearm());
                e.setInclinedarm(dto.getInclinedarm());
                e.setDeadendarm(dto.getDeadendarm());
                e.setAnglearm(dto.getAnglearm());
                e.setDoublearm(dto.getDoublearm());
        e = repository.save(e);
        return new StructureJunctionElectricMediumVoltagePolePoteauHtaDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}