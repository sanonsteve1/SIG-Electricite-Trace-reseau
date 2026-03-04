package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricJunctionLowVoltageLineEndFindeligneFacade;
import com.onea.abcash.presentation.dto.gis.ElectricJunctionLowVoltageLineEndFindeligneDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricjunction-lowvoltagelineend-findeligne")
@SecurityRequirement(name = "Authorization")
public class ElectricJunctionLowVoltageLineEndFindeligneController {

    private final ElectricJunctionLowVoltageLineEndFindeligneFacade facade;

    public ElectricJunctionLowVoltageLineEndFindeligneController(ElectricJunctionLowVoltageLineEndFindeligneFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricJunctionLowVoltageLineEndFindeligneDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricJunctionLowVoltageLineEndFindeligneDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricJunctionLowVoltageLineEndFindeligneDto enregistrer(@RequestBody ElectricJunctionLowVoltageLineEndFindeligneDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}