package com.onea.abcash.repository.gis;

import com.onea.abcash.domain.gis.ElectricDeviceLowVoltageNetworkProtectionDisjoncteur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ElectricDeviceLowVoltageNetworkProtectionDisjoncteurRepository extends JpaRepository<ElectricDeviceLowVoltageNetworkProtectionDisjoncteur, Integer> {
}