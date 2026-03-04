package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricDeviceHighVoltageTransformerTransfoPS;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceHighVoltageTransformerTransfoPSDto;
import com.onea.abcash.repository.gis.ElectricDeviceHighVoltageTransformerTransfoPSRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricDeviceHighVoltageTransformerTransfoPSFacade {

    private final ElectricDeviceHighVoltageTransformerTransfoPSRepository repository;

    public ElectricDeviceHighVoltageTransformerTransfoPSFacade(ElectricDeviceHighVoltageTransformerTransfoPSRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricDeviceHighVoltageTransformerTransfoPSDto> lister() {
        return repository.findAll().stream().map(ElectricDeviceHighVoltageTransformerTransfoPSDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricDeviceHighVoltageTransformerTransfoPSDto getById(Integer id) {
        return repository.findById(id).map(ElectricDeviceHighVoltageTransformerTransfoPSDto::new).orElse(null);
    }

    @Transactional
    public ElectricDeviceHighVoltageTransformerTransfoPSDto enregistrer(ElectricDeviceHighVoltageTransformerTransfoPSDto dto) {
        ElectricDeviceHighVoltageTransformerTransfoPS e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricDeviceHighVoltageTransformerTransfoPS()) : new ElectricDeviceHighVoltageTransformerTransfoPS();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setAssetgroup(dto.getAssetgroup());
                e.setAssetid(dto.getAssetid());
                e.setAssettype(dto.getAssettype());
                e.setConstructionstatus(dto.getConstructionstatus());
                e.setCoolingtype(dto.getCoolingtype());
                e.setCreatedDate(dto.getCreatedDate());
                e.setCreatedUser(dto.getCreatedUser());
                e.setGlobalid(dto.getGlobalid());
                e.setHasarrester(dto.getHasarrester());
                e.setInstalldate(dto.getInstalldate());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLifecyclestatus(dto.getLifecyclestatus());
                e.setManufacturer(dto.getManufacturer());
                e.setMaximumpower(dto.getMaximumpower());
                e.setMaxoperatingvoltage(dto.getMaxoperatingvoltage());
                e.setMaxvoltage(dto.getMaxvoltage());
                e.setNominalvoltage(dto.getNominalvoltage());
                e.setNormaloperatingstatus(dto.getNormaloperatingstatus());
                e.setNotes(dto.getNotes());
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setSerialnumber(dto.getSerialnumber());
                e.setTotalmass(dto.getTotalmass());
                e.setYear(dto.getYear());
                e.setUsername(dto.getUsername());
                e.setQualityverified(dto.getQualityverified());
                e.setValidator(dto.getValidator());
                e.setSecondaryvoltagelinetoline(dto.getSecondaryvoltagelinetoline());
                e.setRatedpower(dto.getRatedpower());
                e.setWinding(dto.getWinding());
                e.setShortcircuitvoltagepercentage(dto.getShortcircuitvoltagepercentage());
                e.setTerminaltype(dto.getTerminaltype());
                e.setTransformercode(dto.getTransformercode());
                e.setPolenumber(dto.getPolenumber());
        e = repository.save(e);
        return new ElectricDeviceHighVoltageTransformerTransfoPSDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}