package com.onea.abcash.repository.gis;

import com.onea.abcash.domain.gis.ElectricDeviceLowVoltageControlUnitTUR;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ElectricDeviceLowVoltageControlUnitTURRepository extends JpaRepository<ElectricDeviceLowVoltageControlUnitTUR, Integer> {
}