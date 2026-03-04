package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.SpatialRefSys;
import com.onea.abcash.presentation.dto.gis.SpatialRefSysDto;
import com.onea.abcash.repository.gis.SpatialRefSysRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class SpatialRefSysFacade {

    private final SpatialRefSysRepository repository;

    public SpatialRefSysFacade(SpatialRefSysRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<SpatialRefSysDto> lister() {
        return repository.findAll().stream().map(SpatialRefSysDto::new).toList();
    }

    @Transactional(readOnly = true)
    public SpatialRefSysDto getById(Integer id) {
        return repository.findById(id).map(SpatialRefSysDto::new).orElse(null);
    }

    @Transactional
    public SpatialRefSysDto enregistrer(SpatialRefSysDto dto) {
        SpatialRefSys e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new SpatialRefSys()) : new SpatialRefSys();
        e.setId(dto.getId());
                e.setAuthName(dto.getAuthName());
                e.setAuthSrid(dto.getAuthSrid());
                e.setSrtext(dto.getSrtext());
                e.setProj4text(dto.getProj4text());
        e = repository.save(e);
        return new SpatialRefSysDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}