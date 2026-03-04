package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricDeviceLowVoltageNetworkProtectionDisjoncteur;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto;
import com.onea.abcash.repository.gis.ElectricDeviceLowVoltageNetworkProtectionDisjoncteurRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricDeviceLowVoltageNetworkProtectionDisjoncteurFacade {

    private final ElectricDeviceLowVoltageNetworkProtectionDisjoncteurRepository repository;

    public ElectricDeviceLowVoltageNetworkProtectionDisjoncteurFacade(ElectricDeviceLowVoltageNetworkProtectionDisjoncteurRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto> lister() {
        return repository.findAll().stream().map(ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto getById(Integer id) {
        return repository.findById(id).map(ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto::new).orElse(null);
    }

    @Transactional
    public ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto enregistrer(ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto dto) {
        ElectricDeviceLowVoltageNetworkProtectionDisjoncteur e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricDeviceLowVoltageNetworkProtectionDisjoncteur()) : new ElectricDeviceLowVoltageNetworkProtectionDisjoncteur();
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
                e.setNominalvoltage(dto.getNominalvoltage());
                e.setNormaloperatingstatus(dto.getNormaloperatingstatus());
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setUsername(dto.getUsername());
                e.setQualityverified(dto.getQualityverified());
                e.setValidator(dto.getValidator());
                e.setDhptype(dto.getDhptype());
                e.setPhasechange(dto.getPhasechange());
                e.setMaintby(dto.getMaintby());
                e.setOwnedby(dto.getOwnedby());
                e.setNumphasesconstructed(dto.getNumphasesconstructed());
                e.setAccessorytype(dto.getAccessorytype());
                e.setNotes(dto.getNotes());
        e = repository.save(e);
        return new ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}