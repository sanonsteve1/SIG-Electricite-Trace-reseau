package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.SpatialRefSysFacade;
import com.onea.abcash.presentation.dto.gis.SpatialRefSysDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/spatial-ref-sys")
@SecurityRequirement(name = "Authorization")
public class SpatialRefSysController {

    private final SpatialRefSysFacade facade;

    public SpatialRefSysController(SpatialRefSysFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<SpatialRefSysDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public SpatialRefSysDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public SpatialRefSysDto enregistrer(@RequestBody SpatialRefSysDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}