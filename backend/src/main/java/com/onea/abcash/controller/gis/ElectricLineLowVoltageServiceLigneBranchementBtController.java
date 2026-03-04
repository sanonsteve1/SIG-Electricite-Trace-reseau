package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricLineLowVoltageServiceLigneBranchementBtFacade;
import com.onea.abcash.presentation.dto.gis.ElectricLineLowVoltageServiceLigneBranchementBtDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricline-lowvoltageservice-ligne-branchement-bt")
@SecurityRequirement(name = "Authorization")
public class ElectricLineLowVoltageServiceLigneBranchementBtController {

    private final ElectricLineLowVoltageServiceLigneBranchementBtFacade facade;

    public ElectricLineLowVoltageServiceLigneBranchementBtController(ElectricLineLowVoltageServiceLigneBranchementBtFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricLineLowVoltageServiceLigneBranchementBtDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricLineLowVoltageServiceLigneBranchementBtDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricLineLowVoltageServiceLigneBranchementBtDto enregistrer(@RequestBody ElectricLineLowVoltageServiceLigneBranchementBtDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}