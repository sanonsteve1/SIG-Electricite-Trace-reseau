package com.onea.abcash.repository.gis;

import com.onea.abcash.domain.gis.ElectricDeviceMediumVoltageArresterParafoudre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ElectricDeviceMediumVoltageArresterParafoudreRepository extends JpaRepository<ElectricDeviceMediumVoltageArresterParafoudre, Integer> {
}