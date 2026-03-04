package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.PointsFacade;
import com.onea.abcash.presentation.dto.gis.PointsDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/points")
@SecurityRequirement(name = "Authorization")
public class PointsController {

    private final PointsFacade facade;

    public PointsController(PointsFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<PointsDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public PointsDto getById(@PathVariable Long id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public PointsDto enregistrer(@RequestBody PointsDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Long id) {
        facade.supprimer(id);
    }
}