package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricDeviceLowVoltageNetworkProtectionDisjoncteurFacade;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricdevice-lowvoltagenetworkprotection-disjoncteur")
@SecurityRequirement(name = "Authorization")
public class ElectricDeviceLowVoltageNetworkProtectionDisjoncteurController {

    private final ElectricDeviceLowVoltageNetworkProtectionDisjoncteurFacade facade;

    public ElectricDeviceLowVoltageNetworkProtectionDisjoncteurController(ElectricDeviceLowVoltageNetworkProtectionDisjoncteurFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto enregistrer(@RequestBody ElectricDeviceLowVoltageNetworkProtectionDisjoncteurDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}