package com.onea.abcash.repository.gis;

import com.onea.abcash.domain.gis.ElectricJunctionLowVoltageLineEndFindeligne;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ElectricJunctionLowVoltageLineEndFindeligneRepository extends JpaRepository<ElectricJunctionLowVoltageLineEndFindeligne, Integer> {
}