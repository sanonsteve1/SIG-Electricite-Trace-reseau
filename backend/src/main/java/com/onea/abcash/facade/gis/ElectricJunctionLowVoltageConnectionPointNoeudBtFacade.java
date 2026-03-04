package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.ElectricJunctionLowVoltageConnectionPointNoeudBt;
import com.onea.abcash.presentation.dto.gis.ElectricJunctionLowVoltageConnectionPointNoeudBtDto;
import com.onea.abcash.repository.gis.ElectricJunctionLowVoltageConnectionPointNoeudBtRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ElectricJunctionLowVoltageConnectionPointNoeudBtFacade {

    private final ElectricJunctionLowVoltageConnectionPointNoeudBtRepository repository;

    public ElectricJunctionLowVoltageConnectionPointNoeudBtFacade(ElectricJunctionLowVoltageConnectionPointNoeudBtRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ElectricJunctionLowVoltageConnectionPointNoeudBtDto> lister() {
        return repository.findAll().stream().map(ElectricJunctionLowVoltageConnectionPointNoeudBtDto::new).toList();
    }

    @Transactional(readOnly = true)
    public ElectricJunctionLowVoltageConnectionPointNoeudBtDto getById(Integer id) {
        return repository.findById(id).map(ElectricJunctionLowVoltageConnectionPointNoeudBtDto::new).orElse(null);
    }

    @Transactional
    public ElectricJunctionLowVoltageConnectionPointNoeudBtDto enregistrer(ElectricJunctionLowVoltageConnectionPointNoeudBtDto dto) {
        ElectricJunctionLowVoltageConnectionPointNoeudBt e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new ElectricJunctionLowVoltageConnectionPointNoeudBt()) : new ElectricJunctionLowVoltageConnectionPointNoeudBt();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setAssetgroup(dto.getAssetgroup());
                e.setAssettype(dto.getAssettype());
                e.setGlobalid(dto.getGlobalid());
                e.setPhasesnormal(dto.getPhasesnormal());
                e.setCreatedUser(dto.getCreatedUser());
                e.setCreatedDate(dto.getCreatedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setUsername(dto.getUsername());
                e.setQualityverified(dto.getQualityverified());
                e.setValidator(dto.getValidator());
                e.setManufacturer(dto.getManufacturer());
                e.setCadastresection(dto.getCadastresection());
                e.setCadastrelot(dto.getCadastrelot());
                e.setCadastreparcel(dto.getCadastreparcel());
                e.setSonabelsection(dto.getSonabelsection());
                e.setSonabelparcel(dto.getSonabelparcel());
                e.setPhasesenergized(dto.getPhasesenergized());
                e.setConnectiondevice(dto.getConnectiondevice());
                e.setOperation(dto.getOperation());
                e.setOtherequipments(dto.getOtherequipments());
                e.setAccessibility(dto.getAccessibility());
                e.setSonabellot(dto.getSonabellot());
                e.setNotes(dto.getNotes());
        e = repository.save(e);
        return new ElectricJunctionLowVoltageConnectionPointNoeudBtDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}