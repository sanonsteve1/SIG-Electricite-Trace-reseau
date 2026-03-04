package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricDeviceMediumVoltageArresterParafoudre;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceMediumVoltageArresterParafoudreDto;
import com.onea.abcash.repository.gis.ElectricDeviceMediumVoltageArresterParafoudreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricDeviceMediumVoltageArresterParafoudreFacade {

    private final ElectricDeviceMediumVoltageArresterParafoudreRepository repository;

    public ElectricDeviceMediumVoltageArresterParafoudreFacade(ElectricDeviceMediumVoltageArresterParafoudreRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricDeviceMediumVoltageArresterParafoudreDto> lister() {
        return repository.findAll().stream().map(ElectricDeviceMediumVoltageArresterParafoudreDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricDeviceMediumVoltageArresterParafoudreDto getById(Integer id) {
        return repository.findById(id).map(ElectricDeviceMediumVoltageArresterParafoudreDto::new).orElse(null);
    }

    @Transactional
    public ElectricDeviceMediumVoltageArresterParafoudreDto enregistrer(ElectricDeviceMediumVoltageArresterParafoudreDto dto) {
        ElectricDeviceMediumVoltageArresterParafoudre e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricDeviceMediumVoltageArresterParafoudre()) : new ElectricDeviceMediumVoltageArresterParafoudre();
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
                e.setNominalvoltage(dto.getNominalvoltage());
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setUsername(dto.getUsername());
                e.setQualityverified(dto.getQualityverified());
                e.setValidator(dto.getValidator());
                e.setCurrentdevicestatus(dto.getCurrentdevicestatus());
                e.setArrestertype(dto.getArrestertype());
                e.setNumphasesconstructed(dto.getNumphasesconstructed());
                e.setNotes(dto.getNotes());
        e = repository.save(e);
        return new ElectricDeviceMediumVoltageArresterParafoudreDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}