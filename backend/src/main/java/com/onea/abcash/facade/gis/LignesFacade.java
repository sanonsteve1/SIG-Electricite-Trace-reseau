package com.onea.abcash.facade.gis;

import com.onea.abcash.domain.gis.Lignes;
import com.onea.abcash.presentation.dto.gis.LignesDto;
import com.onea.abcash.repository.gis.LignesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class LignesFacade {

    private final LignesRepository repository;

    public LignesFacade(LignesRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<LignesDto> lister() {
        return repository.findAll().stream().map(LignesDto::new).toList();
    }

    @Transactional(readOnly = true)
    public LignesDto getById(Integer id) {
        return repository.findById(id).map(LignesDto::new).orElse(null);
    }

    @Transactional
    public LignesDto enregistrer(LignesDto dto) {
        Lignes e = dto.getId() != null ? repository.findById(dto.getId()).orElse(new Lignes()) : new Lignes();
        e.setId(dto.getId());
                e.setT(dto.getT());
        e = repository.save(e);
        return new LignesDto(e);
    }

    @Transactional
    public void supprimer(Integer id) {
        repository.deleteById(id);
    }
}