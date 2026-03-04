package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricLineLowVoltageOverheadConductorLigneBtAerienFacade;
import com.onea.abcash.presentation.dto.gis.ElectricLineLowVoltageOverheadConductorLigneBtAerienDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricline-lowvoltageoverheadconductor-ligne-bt-aerien")
@SecurityRequirement(name = "Authorization")
public class ElectricLineLowVoltageOverheadConductorLigneBtAerienController {

    private final ElectricLineLowVoltageOverheadConductorLigneBtAerienFacade facade;

    public ElectricLineLowVoltageOverheadConductorLigneBtAerienController(ElectricLineLowVoltageOverheadConductorLigneBtAerienFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricLineLowVoltageOverheadConductorLigneBtAerienDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricLineLowVoltageOverheadConductorLigneBtAerienDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricLineLowVoltageOverheadConductorLigneBtAerienDto enregistrer(@RequestBody ElectricLineLowVoltageOverheadConductorLigneBtAerienDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}