package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricLineMediumVoltageOverheadConductorLigneHtaAerienFacade;
import com.onea.abcash.presentation.dto.gis.ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricline-mediumvoltageoverheadconductor-ligne-hta-aerien")
@SecurityRequirement(name = "Authorization")
public class ElectricLineMediumVoltageOverheadConductorLigneHtaAerienController {

    private final ElectricLineMediumVoltageOverheadConductorLigneHtaAerienFacade facade;

    public ElectricLineMediumVoltageOverheadConductorLigneHtaAerienController(ElectricLineMediumVoltageOverheadConductorLigneHtaAerienFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto enregistrer(@RequestBody ElectricLineMediumVoltageOverheadConductorLigneHtaAerienDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}