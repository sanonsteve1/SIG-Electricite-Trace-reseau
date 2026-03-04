package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.PointConnecte;
import com.onea.abcash.presentation.dto.gis.PointConnecteDto;
import com.onea.abcash.repository.gis.PointConnecteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class PointConnecteFacade {

    private final PointConnecteRepository repository;

    public PointConnecteFacade(PointConnecteRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<PointConnecteDto> lister() {
        return repository.findAll().stream().map(PointConnecteDto::new).toList();
    }

    @Transactional(readOnly = true)
    public PointConnecteDto getById(Long id) {
        return repository.findById(id).map(PointConnecteDto::new).orElse(null);
    }

    @Transactional
    public PointConnecteDto enregistrer(PointConnecteDto dto) {
        PointConnecte e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new PointConnecte()) : new PointConnecte();
        e.setId(dto.getId());
                e.setT(dto.getT());
        e = repository.save(e);
        return new PointConnecteDto(e);
    }

    @Transactional
    public void supprimer(Long id) {
        repository.deleteById(id);
    }
}