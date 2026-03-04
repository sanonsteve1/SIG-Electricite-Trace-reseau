package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.ElectricDeviceMediumVoltageSwitchCelluleOcrFacade;
import com.onea.abcash.presentation.dto.gis.ElectricDeviceMediumVoltageSwitchCelluleOcrDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/electricdevice-mediumvoltageswitch-cellule-ocr")
@SecurityRequirement(name = "Authorization")
public class ElectricDeviceMediumVoltageSwitchCelluleOcrController {

    private final ElectricDeviceMediumVoltageSwitchCelluleOcrFacade facade;

    public ElectricDeviceMediumVoltageSwitchCelluleOcrController(ElectricDeviceMediumVoltageSwitchCelluleOcrFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<ElectricDeviceMediumVoltageSwitchCelluleOcrDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceMediumVoltageSwitchCelluleOcrDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public ElectricDeviceMediumVoltageSwitchCelluleOcrDto enregistrer(@RequestBody ElectricDeviceMediumVoltageSwitchCelluleOcrDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}