package com.onea.abcash.security;

import com.onea.abcash.domain.Utilisateur;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.io.Serializable;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtTokenUtils implements Serializable {

    private static final long serialVersionUID = -2550185165626007488L;

    @Value("${application.security.jwt.secret-key}")
    private String secret;

    @Value("${application.security.jwt.expiration}")
    private long jwtTokenExpiration;

    @Value("${application.security.jwt.refresh-token.expiration}")
    private long jwtTokenRefreshTokenExpiration;

    /**
     * Retourne le nom de l'utilisateur compris dans le Token JWT.
     *
     * @param token Le Token JWT.
     * @return le nom de l'utilisateur.
     */
    public String getUsernameFromToken(String token) {
        return getClaimFromToken(token, Claims::getSubject);
    }

    /**
     * Retourne la date d'expiration du Token JWT.
     *
     * @param token Le Token JWT.
     * @return La date d'expiration du Token JWT.
     */
    public Date getExpirationDateFromToken(String token) {
        return getClaimFromToken(token, Claims::getExpiration);
    }

    public <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Retourne les les toutes informations du Token JWT.
     *
     * @param token Le Token JWT.
     * @return le nom de l'utilisateur.
     */
    private Claims getAllClaimsFromToken(String token) {
        return Jwts.parser().setSigningKey(secret).parseClaimsJws(token).getBody();
    }

    /**
     * Vérifie si le Token JWT a expiré
     *
     * @param token Le Token JWT.
     * @return true si le token a expiré
     */
    public boolean isTokenExpired(String token) {
        final Date expiration = getExpirationDateFromToken(token);
        return expiration.before(new Date());
    }

    /**
     * Verifie que le token est valid
     *
     * @param token le token
     * @param userDetails les informations de l'utilisateur
     * @return true si le token est valide sinon false
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = getUsernameFromToken(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    /**
     * Génère le Token JWT de l'utilisateur renseigné.
     *
     * @param utilisateur l'utilisateur.
     * @return le Token JWT.
     */
    public String generateToken(Utilisateur utilisateur) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", utilisateur.getId());
        claims.put("nom", utilisateur.getNom());
        claims.put("prenoms", utilisateur.getPrenoms());
        claims.put("username", utilisateur.getUsername());
        claims.put("role", utilisateur.getRole().name());
        claims.put("statut", utilisateur.getStatut());
        return doGenerateToken(claims, utilisateur.getUsername());
    }


    /**
     * Permet de comptacter les attituts de l'utilisateur pour la génération du Token JWT.
     *
     * @param claims Les attributs.
     * @param subject le username de l'utilisateur.
     * @return Les attributs formatés.
     */
    private String doGenerateToken(Map<String, Object> claims, String subject) {

        return Jwts.builder().setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + this.jwtTokenExpiration))
                .signWith(SignatureAlgorithm.HS256, secret).compact();
    }
}

