package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricDeviceLowVoltageControlUnitTUR;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceLowVoltageControlUnitTURDto;
import com.onea.abcash.repository.gis.ElectricDeviceLowVoltageControlUnitTURRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricDeviceLowVoltageControlUnitTURFacade {

    private final ElectricDeviceLowVoltageControlUnitTURRepository repository;

    public ElectricDeviceLowVoltageControlUnitTURFacade(ElectricDeviceLowVoltageControlUnitTURRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricDeviceLowVoltageControlUnitTURDto> lister() {
        return repository.findAll().stream().map(ElectricDeviceLowVoltageControlUnitTURDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricDeviceLowVoltageControlUnitTURDto getById(Integer id) {
        return repository.findById(id).map(ElectricDeviceLowVoltageControlUnitTURDto::new).orElse(null);
    }

    @Transactional
    public ElectricDeviceLowVoltageControlUnitTURDto enregistrer(ElectricDeviceLowVoltageControlUnitTURDto dto) {
        ElectricDeviceLowVoltageControlUnitTUR e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricDeviceLowVoltageControlUnitTUR()) : new ElectricDeviceLowVoltageControlUnitTUR();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setAssetgroup(dto.getAssetgroup());
                e.setAssetid(dto.getAssetid());
                e.setAssettype(dto.getAssettype());
                e.setConstructionstatus(dto.getConstructionstatus());
                e.setCreatedDate(dto.getCreatedDate());
                e.setCreatedUser(dto.getCreatedUser());
                e.setGlobalid(dto.getGlobalid());
                e.setInstalldate(dto.getInstalldate());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLifecyclestatus(dto.getLifecyclestatus());
                e.setManufacturer(dto.getManufacturer());
                e.setMaxoperatingvoltage(dto.getMaxoperatingvoltage());
                e.setMaxvoltage(dto.getMaxvoltage());
                e.setNominalvoltage(dto.getNominalvoltage());
                e.setLowvoltagefeederscode(dto.getLowvoltagefeederscode());
                e.setLoadtapchangepercent(dto.getLoadtapchangepercent());
                e.setBreakingcapacity(dto.getBreakingcapacity());
                e.setDistributionboardpanelstype(dto.getDistributionboardpanelstype());
                e.setQualityverified(dto.getQualityverified());
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setUsername(dto.getUsername());
                e.setValidator(dto.getValidator());
                e.setNotes(dto.getNotes());
        e = repository.save(e);
        return new ElectricDeviceLowVoltageControlUnitTURDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}