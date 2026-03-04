package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.Points;
import com.onea.abcash.presentation.dto.gis.PointsDto;
import com.onea.abcash.repository.gis.PointsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class PointsFacade {

    private final PointsRepository repository;

    public PointsFacade(PointsRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<PointsDto> lister() {
        return repository.findAll().stream().map(PointsDto::new).toList();
    }

    @Transactional(readOnly = true)
    public PointsDto getById(Long id) {
        return repository.findById(id).map(PointsDto::new).orElse(null);
    }

    @Transactional
    public PointsDto enregistrer(PointsDto dto) {
        Points e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new Points()) : new Points();
        e.setId(dto.getId());
                e.setT(dto.getT());
        e = repository.save(e);
        return new PointsDto(e);
    }

    @Transactional
    public void supprimer(Long id) {
        repository.deleteById(id);
    }
}