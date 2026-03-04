package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricDeviceHighVoltageTransformerTransfoPSFacade;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceHighVoltageTransformerTransfoPSDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricdevice-highvoltagetransformer-transfo-ps")
@SecurityRequirement(name = "Authorization")
public class ElectricDeviceHighVoltageTransformerTransfoPSController {

    private final ElectricDeviceHighVoltageTransformerTransfoPSFacade facade;

    public ElectricDeviceHighVoltageTransformerTransfoPSController(ElectricDeviceHighVoltageTransformerTransfoPSFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricDeviceHighVoltageTransformerTransfoPSDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceHighVoltageTransformerTransfoPSDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceHighVoltageTransformerTransfoPSDto enregistrer(@RequestBody ElectricDeviceHighVoltageTransformerTransfoPSDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}