package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.DistributionPanelBranchement;
import com.onea.abcash.presentation.dto.gis.DistributionPanelBranchementDto;
import com.onea.abcash.repository.gis.DistributionPanelBranchementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class DistributionPanelBranchementFacade {

    private final DistributionPanelBranchementRepository repository;

    public DistributionPanelBranchementFacade(DistributionPanelBranchementRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<DistributionPanelBranchementDto> lister() {
        return repository.findAll().stream().map(DistributionPanelBranchementDto::new).toList();
    }

    @Transactional(readOnly = true)
    public DistributionPanelBranchementDto getById(Integer id) {
        return repository.findById(id).map(DistributionPanelBranchementDto::new).orElse(null);
    }

    @Transactional
    public DistributionPanelBranchementDto enregistrer(DistributionPanelBranchementDto dto) {
        DistributionPanelBranchement e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new DistributionPanelBranchement()) : new DistributionPanelBranchement();
        e.setId(dto.getId());
                e.setObjectid(dto.getObjectid());
                e.setSubscribername(dto.getSubscribername());
                e.setConnectiontype(dto.getConnectiontype());
                e.setTransformationreport(dto.getTransformationreport());
                e.setCodesticker(dto.getCodesticker());
                e.setExistencedecompteur(dto.getExistencedecompteur());
                e.setCustomercode(dto.getCustomercode());
                e.setName(dto.getName());
                e.setFirstname(dto.getFirstname());
                e.setPhone(dto.getPhone());
                e.setNCnib(dto.getNCnib());
                e.setGlobalid(dto.getGlobalid());
                e.setCreatedUser(dto.getCreatedUser());
                e.setCreatedDate(dto.getCreatedDate());
                e.setLastEditedUser(dto.getLastEditedUser());
                e.setLastEditedDate(dto.getLastEditedDate());
                e.setNotes(dto.getNotes());
                e.setUsername(dto.getUsername());
                e.setValidator(dto.getValidator());
                e.setQualityverified(dto.getQualityverified());
                e.setAccessibility(dto.getAccessibility());
        e = repository.save(e);
        return new DistributionPanelBranchementDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}