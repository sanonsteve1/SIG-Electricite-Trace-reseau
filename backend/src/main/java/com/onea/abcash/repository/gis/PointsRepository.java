package com.onea.abcash.repository.gis;

import com.onea.abcash.domain.gis.Points;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PointsRepository extends JpaRepository<Points, Long> {
}