package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricDeviceMediumVoltageTransformerTransfoHtBtFacade;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceMediumVoltageTransformerTransfoHtBtDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricdevice-mediumvoltagetransformer-transfo-ht-bt")
@SecurityRequirement(name = "Authorization")
public class ElectricDeviceMediumVoltageTransformerTransfoHtBtController {

    private final ElectricDeviceMediumVoltageTransformerTransfoHtBtFacade facade;

    public ElectricDeviceMediumVoltageTransformerTransfoHtBtController(ElectricDeviceMediumVoltageTransformerTransfoHtBtFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricDeviceMediumVoltageTransformerTransfoHtBtDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceMediumVoltageTransformerTransfoHtBtDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceMediumVoltageTransformerTransfoHtBtDto enregistrer(@RequestBody ElectricDeviceMediumVoltageTransformerTransfoHtBtDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}