package com.onea.abcash.controller.gis;

import com.onea.abcash.facade.gis.SubscriberFormAbonneFacade;
import com.onea.abcash.presentation.dto.gis.SubscriberFormAbonneDto;
import com.onea.abcash.configuration.logger.Logged;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/ws/gis/subscriberform-abonne")
@SecurityRequirement(name = "Authorization")
public class SubscriberFormAbonneController {

    private final SubscriberFormAbonneFacade facade;

    public SubscriberFormAbonneController(SubscriberFormAbonneFacade facade) {
        this.facade = facade;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public List<SubscriberFormAbonneDto> lister() {
        return facade.lister();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public SubscriberFormAbonneDto getById(@PathVariable Integer id) {
        return facade.getById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Logged
    public SubscriberFormAbonneDto enregistrer(@RequestBody SubscriberFormAbonneDto dto) {
        return facade.enregistrer(dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Logged
    public void supprimer(@PathVariable Integer id) {
        facade.supprimer(id);
    }
}