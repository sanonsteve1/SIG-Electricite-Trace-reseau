package com.onea.abcash.repository.gis;

import com.onea.abcash.domain.gis.Lignes;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LignesRepository extends JpaRepository<Lignes, Integer> {
}