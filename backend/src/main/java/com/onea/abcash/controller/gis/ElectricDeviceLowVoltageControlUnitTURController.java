package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricDeviceLowVoltageControlUnitTURFacade;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceLowVoltageControlUnitTURDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricdevice-lowvoltagecontrolunit-tur")
@SecurityRequirement(name = "Authorization")
public class ElectricDeviceLowVoltageControlUnitTURController {

    private final ElectricDeviceLowVoltageControlUnitTURFacade facade;

    public ElectricDeviceLowVoltageControlUnitTURController(ElectricDeviceLowVoltageControlUnitTURFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricDeviceLowVoltageControlUnitTURDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceLowVoltageControlUnitTURDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceLowVoltageControlUnitTURDto enregistrer(@RequestBody ElectricDeviceLowVoltageControlUnitTURDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}