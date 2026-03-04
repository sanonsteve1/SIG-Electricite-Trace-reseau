package com.onea.abcash.repository.gis;

import com.onea.abcash.domain.gis.MetersCompteur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MetersCompteurRepository extends JpaRepository<MetersCompteur, Integer> {
}