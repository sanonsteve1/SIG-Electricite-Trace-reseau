package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.PointConnecteFacade;
import com.onea.abcash.presentation.dto.gis.PointConnecteDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/point-connecte")
@SecurityRequirement(name = "Authorization")
public class PointConnecteController {

    private final PointConnecteFacade facade;

    public PointConnecteController(PointConnecteFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<PointConnecteDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public PointConnecteDto getById(@PathVariable Long id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public PointConnecteDto enregistrer(@RequestBody PointConnecteDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Long id) {
        facade.supprimer(id);
    }
}