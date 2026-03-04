package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.StructureJunctionElectricJunctionBoxCoffretFacade;
import com.onea.abcash.presentation.dto.gis.StructureJunctionElectricJunctionBoxCoffretDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/structurejunction-electricjunctionbox-coffret")
@SecurityRequirement(name = "Authorization")
public class StructureJunctionElectricJunctionBoxCoffretController {

    private final StructureJunctionElectricJunctionBoxCoffretFacade facade;

    public StructureJunctionElectricJunctionBoxCoffretController(StructureJunctionElectricJunctionBoxCoffretFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<StructureJunctionElectricJunctionBoxCoffretDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public StructureJunctionElectricJunctionBoxCoffretDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public StructureJunctionElectricJunctionBoxCoffretDto enregistrer(@RequestBody StructureJunctionElectricJunctionBoxCoffretDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}