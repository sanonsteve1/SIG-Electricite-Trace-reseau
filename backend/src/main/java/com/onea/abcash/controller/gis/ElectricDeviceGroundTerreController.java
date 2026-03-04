package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricDeviceGroundTerreFacade;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceGroundTerreDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricdevice-ground-terre")
@SecurityRequirement(name = "Authorization")
public class ElectricDeviceGroundTerreController {

    private final ElectricDeviceGroundTerreFacade facade;

    public ElectricDeviceGroundTerreController(ElectricDeviceGroundTerreFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricDeviceGroundTerreDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceGroundTerreDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceGroundTerreDto enregistrer(@RequestBody ElectricDeviceGroundTerreDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}