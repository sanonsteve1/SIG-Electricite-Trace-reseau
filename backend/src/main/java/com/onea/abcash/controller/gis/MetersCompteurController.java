package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.MetersCompteurFacade;
import com.onea.abcash.presentation.dto.gis.MetersCompteurDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/meters-compteur")
@SecurityRequirement(name = "Authorization")
public class MetersCompteurController {

    private final MetersCompteurFacade facade;

    public MetersCompteurController(MetersCompteurFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<MetersCompteurDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public MetersCompteurDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public MetersCompteurDto enregistrer(@RequestBody MetersCompteurDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}