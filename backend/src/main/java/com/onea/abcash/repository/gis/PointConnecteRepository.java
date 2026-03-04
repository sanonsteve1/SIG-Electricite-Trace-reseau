package com.onea.abcash.repository.gis;

import com.onea.abcash.domain.gis.PointConnecte;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PointConnecteRepository extends JpaRepository<PointConnecte, Long> {
}