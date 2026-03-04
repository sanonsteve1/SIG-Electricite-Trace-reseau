package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricDeviceMediumVoltageSwitchCelluleOcr;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceMediumVoltageSwitchCelluleOcrDto;
import com.onea.abcash.repository.gis.ElectricDeviceMediumVoltageSwitchCelluleOcrRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricDeviceMediumVoltageSwitchCelluleOcrFacade {

    private final ElectricDeviceMediumVoltageSwitchCelluleOcrRepository repository;

    public ElectricDeviceMediumVoltageSwitchCelluleOcrFacade(ElectricDeviceMediumVoltageSwitchCelluleOcrRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricDeviceMediumVoltageSwitchCelluleOcrDto> lister() {
        return repository.findAll().stream().map(ElectricDeviceMediumVoltageSwitchCelluleOcrDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricDeviceMediumVoltageSwitchCelluleOcrDto getById(Integer id) {
        return repository.findById(id).map(ElectricDeviceMediumVoltageSwitchCelluleOcrDto::new).orElse(null);
    }

    @Transactional
    public ElectricDeviceMediumVoltageSwitchCelluleOcrDto enregistrer(ElectricDeviceMediumVoltageSwitchCelluleOcrDto dto) {
        ElectricDeviceMediumVoltageSwitchCelluleOcr e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricDeviceMediumVoltageSwitchCelluleOcr()) : new ElectricDeviceMediumVoltageSwitchCelluleOcr();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setAnomaly(dto.getAnomaly());
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
                e.setNormaloperatingstatus(dto.getNormaloperatingstatus());
                e.setNotes(dto.getNotes());
                e.setOcrtype(dto.getOcrtype());
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setUsername(dto.getUsername());
                e.setQualityverified(dto.getQualityverified());
                e.setValidator(dto.getValidator());
                e.setSwitchtype(dto.getSwitchtype());
                e.setFeederscode(dto.getFeederscode());
        e = repository.save(e);
        return new ElectricDeviceMediumVoltageSwitchCelluleOcrDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}