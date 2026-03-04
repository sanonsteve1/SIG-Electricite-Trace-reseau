package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricDeviceGroundTerre;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceGroundTerreDto;
import com.onea.abcash.repository.gis.ElectricDeviceGroundTerreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricDeviceGroundTerreFacade {

    private final ElectricDeviceGroundTerreRepository repository;

    public ElectricDeviceGroundTerreFacade(ElectricDeviceGroundTerreRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricDeviceGroundTerreDto> lister() {
        return repository.findAll().stream().map(ElectricDeviceGroundTerreDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricDeviceGroundTerreDto getById(Integer id) {
        return repository.findById(id).map(ElectricDeviceGroundTerreDto::new).orElse(null);
    }

    @Transactional
    public ElectricDeviceGroundTerreDto enregistrer(ElectricDeviceGroundTerreDto dto) {
        ElectricDeviceGroundTerre e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricDeviceGroundTerre()) : new ElectricDeviceGroundTerre();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setAssetgroup(dto.getAssetgroup());
                e.setAssetid(dto.getAssetid());
                e.setAssettype(dto.getAssettype());
                e.setConstructionstatus(dto.getConstructionstatus());
                e.setCreatedDate(dto.getCreatedDate());
                e.setCreatedUser(dto.getCreatedUser());
                e.setDesigntype(dto.getDesigntype());
                e.setGlobalid(dto.getGlobalid());
                e.setGrounding(dto.getGrounding());
                e.setInstalldate(dto.getInstalldate());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLifecyclestatus(dto.getLifecyclestatus());
                e.setManufacturer(dto.getManufacturer());
                e.setNotes(dto.getNotes());
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setTapsandpoles(dto.getTapsandpoles());
                e.setNormaloperatingstatus(dto.getNormaloperatingstatus());
                e.setNominalvoltage(dto.getNominalvoltage());
                e.setSecondaryvoltagelinetoline(dto.getSecondaryvoltagelinetoline());
                e.setMaxvoltage(dto.getMaxvoltage());
                e.setMaxoperatingvoltage(dto.getMaxoperatingvoltage());
                e.setMaximumpower(dto.getMaximumpower());
                e.setMinimumpower(dto.getMinimumpower());
                e.setRatedpower(dto.getRatedpower());
                e.setCoolingtype(dto.getCoolingtype());
                e.setHasarrester(dto.getHasarrester());
                e.setAddress(dto.getAddress());
                e.setCurrentvaultpole(dto.getCurrentvaultpole());
                e.setSerialnumber(dto.getSerialnumber());
                e.setTotalmass(dto.getTotalmass());
                e.setYear(dto.getYear());
                e.setSubnetworkcontrollername(dto.getSubnetworkcontrollername());
                e.setAnomaly(dto.getAnomaly());
                e.setOcrtype(dto.getOcrtype());
                e.setLoadtapchangepercent(dto.getLoadtapchangepercent());
                e.setShortcircuitvoltage(dto.getShortcircuitvoltage());
                e.setPeakload(dto.getPeakload());
                e.setVoltagelevel(dto.getVoltagelevel());
                e.setMaterialcode(dto.getMaterialcode());
                e.setHeight(dto.getHeight());
                e.setOwnedby(dto.getOwnedby());
                e.setMaintby(dto.getMaintby());
                e.setHeightMetric(dto.getHeightMetric());
                e.setAccessorybt(dto.getAccessorybt());
                e.setAccessoryfunction(dto.getAccessoryfunction());
                e.setAccessorymaterial(dto.getAccessorymaterial());
                e.setAccessorytype(dto.getAccessorytype());
                e.setCrossarmmaterial(dto.getCrossarmmaterial());
                e.setCrossarmposition(dto.getCrossarmposition());
                e.setCrossarmtype(dto.getCrossarmtype());
                e.setHardwarematerial(dto.getHardwarematerial());
                e.setHardwaretype(dto.getHardwaretype());
                e.setInsulatormaterial(dto.getInsulatormaterial());
                e.setInsulatortype(dto.getInsulatortype());
                e.setTypeofimplantation(dto.getTypeofimplantation());
                e.setEquipmenttypeorclass(dto.getEquipmenttypeorclass());
                e.setAssembly(dto.getAssembly());
                e.setTypeofinstallation(dto.getTypeofinstallation());
                e.setCommonconductortype(dto.getCommonconductortype());
                e.setLabeltext(dto.getLabeltext());
                e.setConductorsize(dto.getConductorsize());
                e.setConductorsizemetric(dto.getConductorsizemetric());
                e.setSourceoffunding(dto.getSourceoffunding());
                e.setNeutraltype(dto.getNeutraltype());
                e.setNatureoftheline(dto.getNatureoftheline());
        e = repository.save(e);
        return new ElectricDeviceGroundTerreDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}