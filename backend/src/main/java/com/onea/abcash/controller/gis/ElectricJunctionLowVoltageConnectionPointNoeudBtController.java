package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricJunctionLowVoltageConnectionPointNoeudBtFacade;
import com.onea.abcash.presentation.dto.gis.ElectricJunctionLowVoltageConnectionPointNoeudBtDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricjunction-lowvoltageconnection-point-noeud-bt")
@SecurityRequirement(name = "Authorization")
public class ElectricJunctionLowVoltageConnectionPointNoeudBtController {

    private final ElectricJunctionLowVoltageConnectionPointNoeudBtFacade facade;

    public ElectricJunctionLowVoltageConnectionPointNoeudBtController(ElectricJunctionLowVoltageConnectionPointNoeudBtFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricJunctionLowVoltageConnectionPointNoeudBtDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricJunctionLowVoltageConnectionPointNoeudBtDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricJunctionLowVoltageConnectionPointNoeudBtDto enregistrer(@RequestBody ElectricJunctionLowVoltageConnectionPointNoeudBtDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}