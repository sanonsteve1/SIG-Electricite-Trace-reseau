package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.StructureBoundaryElectricSubstationBoundaryLimitePosteSourcFacade;
import com.onea.abcash.presentation.dto.gis.StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/structureboundary-electricsubstationboundary-limite-poste-sourc")
@SecurityRequirement(name = "Authorization")
public class StructureBoundaryElectricSubstationBoundaryLimitePosteSourcController {

    private final StructureBoundaryElectricSubstationBoundaryLimitePosteSourcFacade facade;

    public StructureBoundaryElectricSubstationBoundaryLimitePosteSourcController(StructureBoundaryElectricSubstationBoundaryLimitePosteSourcFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto enregistrer(@RequestBody StructureBoundaryElectricSubstationBoundaryLimitePosteSourcDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}