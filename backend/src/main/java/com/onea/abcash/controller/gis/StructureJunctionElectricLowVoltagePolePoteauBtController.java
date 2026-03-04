package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.StructureJunctionElectricLowVoltagePolePoteauBtFacade;
import com.onea.abcash.presentation.dto.gis.StructureJunctionElectricLowVoltagePolePoteauBtDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/structurejunction-electriclowvoltagepole-poteau-bt")
@SecurityRequirement(name = "Authorization")
public class StructureJunctionElectricLowVoltagePolePoteauBtController {

    private final StructureJunctionElectricLowVoltagePolePoteauBtFacade facade;

    public StructureJunctionElectricLowVoltagePolePoteauBtController(StructureJunctionElectricLowVoltagePolePoteauBtFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<StructureJunctionElectricLowVoltagePolePoteauBtDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public StructureJunctionElectricLowVoltagePolePoteauBtDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public StructureJunctionElectricLowVoltagePolePoteauBtDto enregistrer(@RequestBody StructureJunctionElectricLowVoltagePolePoteauBtDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}