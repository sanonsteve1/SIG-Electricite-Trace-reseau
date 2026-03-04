package com.onea.abcash.repository.gis;

import com.onea.abcash.domain.gis.SpatialRefSys;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SpatialRefSysRepository extends JpaRepository<SpatialRefSys, Integer> {
}