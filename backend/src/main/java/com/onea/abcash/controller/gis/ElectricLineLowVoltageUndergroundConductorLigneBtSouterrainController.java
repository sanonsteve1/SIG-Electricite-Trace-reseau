package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainFacade;
import com.onea.abcash.presentation.dto.gis.ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricline-lowvoltageundergroundconductor-ligne-bt-souterrain")
@SecurityRequirement(name = "Authorization")
public class ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainController {

    private final ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainFacade facade;

    public ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainController(ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto enregistrer(@RequestBody ElectricLineLowVoltageUndergroundConductorLigneBtSouterrainDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}