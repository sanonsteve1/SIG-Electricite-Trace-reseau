package com.onea.abcash.repository.gis;

import com.onea.abcash.domain.gis.ElectricDeviceGroundTerre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ElectricDeviceGroundTerreRepository extends JpaRepository<ElectricDeviceGroundTerre, Integer> {
}