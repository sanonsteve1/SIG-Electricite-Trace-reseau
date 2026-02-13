package com.onea.abcash.security;

import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

public class SecurityUtils {
    /**
     * Login par défaut lorsqu'aucun utilisateur n'est connecté
     */
    public static final String DEFAULT_LOGIN = "ANONYMOUS";

    public SecurityUtils() {
    }

    /**
     * @return le login de l'utilisateur connecté
     */
    public static String lireLoginUtilisateurConnecte() {
        SecurityContext context = SecurityContextHolder.getContext();
        if (context != null && context.getAuthentication() != null) {
            if (context.getAuthentication().getPrincipal() instanceof String) {
                return (String) context.getAuthentication().getPrincipal();
            }

            UserDetails principal = (UserDetails) context.getAuthentication().getPrincipal();
            return principal.getUsername();
        }
        return DEFAULT_LOGIN;
    }
}
