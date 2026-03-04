package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricDeviceMediumVoltageArresterParafoudreFacade;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceMediumVoltageArresterParafoudreDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricdevice-mediumvoltagearrester-parafoudre")
@SecurityRequirement(name = "Authorization")
public class ElectricDeviceMediumVoltageArresterParafoudreController {

    private final ElectricDeviceMediumVoltageArresterParafoudreFacade facade;

    public ElectricDeviceMediumVoltageArresterParafoudreController(ElectricDeviceMediumVoltageArresterParafoudreFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricDeviceMediumVoltageArresterParafoudreDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceMediumVoltageArresterParafoudreDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceMediumVoltageArresterParafoudreDto enregistrer(@RequestBody ElectricDeviceMediumVoltageArresterParafoudreDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}