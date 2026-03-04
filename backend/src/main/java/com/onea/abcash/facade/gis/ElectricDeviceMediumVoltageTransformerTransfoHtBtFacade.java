package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricDeviceMediumVoltageTransformerTransfoHtBt;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceMediumVoltageTransformerTransfoHtBtDto;
import com.onea.abcash.repository.gis.ElectricDeviceMediumVoltageTransformerTransfoHtBtRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricDeviceMediumVoltageTransformerTransfoHtBtFacade {

    private final ElectricDeviceMediumVoltageTransformerTransfoHtBtRepository repository;

    public ElectricDeviceMediumVoltageTransformerTransfoHtBtFacade(ElectricDeviceMediumVoltageTransformerTransfoHtBtRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricDeviceMediumVoltageTransformerTransfoHtBtDto> lister() {
        return repository.findAll().stream().map(ElectricDeviceMediumVoltageTransformerTransfoHtBtDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricDeviceMediumVoltageTransformerTransfoHtBtDto getById(Integer id) {
        return repository.findById(id).map(ElectricDeviceMediumVoltageTransformerTransfoHtBtDto::new).orElse(null);
    }

    @Transactional
    public ElectricDeviceMediumVoltageTransformerTransfoHtBtDto enregistrer(ElectricDeviceMediumVoltageTransformerTransfoHtBtDto dto) {
        ElectricDeviceMediumVoltageTransformerTransfoHtBt e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricDeviceMediumVoltageTransformerTransfoHtBt()) : new ElectricDeviceMediumVoltageTransformerTransfoHtBt();
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
                e.setRatedpower(dto.getRatedpower());
                e.setSecondaryvoltagelinetoline(dto.getSecondaryvoltagelinetoline());
                e.setSerialnumber(dto.getSerialnumber());
                e.setShortcircuitvoltage(dto.getShortcircuitvoltage());
                e.setYear(dto.getYear());
                e.setUsername(dto.getUsername());
                e.setQualityverified(dto.getQualityverified());
                e.setValidator(dto.getValidator());
                e.setWinding(dto.getWinding());
                e.setDistributionstationcode(dto.getDistributionstationcode());
                e.setNumphasesconstructed(dto.getNumphasesconstructed());
                e.setTapchanger(dto.getTapchanger());
                e.setFittingtype(dto.getFittingtype());
                e.setTerminaltype(dto.getTerminaltype());
        e = repository.save(e);
        return new ElectricDeviceMediumVoltageTransformerTransfoHtBtDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}