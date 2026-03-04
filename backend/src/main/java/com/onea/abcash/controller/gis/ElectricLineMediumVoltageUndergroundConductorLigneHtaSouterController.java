package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterFacade;
import com.onea.abcash.presentation.dto.gis.ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricline-mediumvoltageundergroundconductor-ligne-hta-souter")
@SecurityRequirement(name = "Authorization")
public class ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterController {

    private final ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterFacade facade;

    public ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterController(ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto enregistrer(@RequestBody ElectricLineMediumVoltageUndergroundConductorLigneHtaSouterDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}