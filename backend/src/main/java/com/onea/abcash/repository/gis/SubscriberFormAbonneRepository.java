package com.onea.abcash.repository.gis;

import com.onea.abcash.domain.gis.SubscriberFormAbonne;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubscriberFormAbonneRepository extends JpaRepository<SubscriberFormAbonne, Integer> {
}