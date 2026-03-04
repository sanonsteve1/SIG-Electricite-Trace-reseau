package com.onea.abcash.repository.gis;

import com.onea.abcash.domain.gis.ElectricDeviceHighVoltageTransformerTransfoPS;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ElectricDeviceHighVoltageTransformerTransfoPSRepository extends JpaRepository<ElectricDeviceHighVoltageTransformerTransfoPS, Integer> {
}