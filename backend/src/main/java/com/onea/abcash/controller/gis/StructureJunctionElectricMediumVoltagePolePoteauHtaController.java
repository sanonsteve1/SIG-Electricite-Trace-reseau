package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.StructureJunctionElectricMediumVoltagePolePoteauHtaFacade;
import com.onea.abcash.presentation.dto.gis.StructureJunctionElectricMediumVoltagePolePoteauHtaDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/structurejunction-electricmediumvoltagepole-poteau-hta")
@SecurityRequirement(name = "Authorization")
public class StructureJunctionElectricMediumVoltagePolePoteauHtaController {

    private final StructureJunctionElectricMediumVoltagePolePoteauHtaFacade facade;

    public StructureJunctionElectricMediumVoltagePolePoteauHtaController(StructureJunctionElectricMediumVoltagePolePoteauHtaFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<StructureJunctionElectricMediumVoltagePolePoteauHtaDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public StructureJunctionElectricMediumVoltagePolePoteauHtaDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public StructureJunctionElectricMediumVoltagePolePoteauHtaDto enregistrer(@RequestBody StructureJunctionElectricMediumVoltagePolePoteauHtaDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}