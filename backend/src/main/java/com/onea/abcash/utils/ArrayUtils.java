package com.onea.abcash.utils;

import java.lang.reflect.Array;
import java.util.Collection;

/**
 * Fonctions utilitaires de manipulations des tableaux.
 */
public final class ArrayUtils {

	private ArrayUtils() {
	}

	/**
	 * Retourne un tableau contenant les éléments de la collection.
	 *
	 * @param clazz  Classe des éléments.
	 * @param values Collection d'éléments.
	 * @param <T>    Type des éléments.
	 * @return Tableau.
	 */
	public static <T> T[] toArray(Class<T> clazz, Collection<T> values) {
		if (values == null) {
			return null;
		}
		T[] array = (T[]) Array.newInstance(clazz, values.size());
		return values.toArray(array);
	}

	/**
	 * Retourne un tableau contenant les éléments de la collection.
	 *
	 * @param values Collection d'éléments.
	 * @return Tableau.
	 */
	public static String[] toArray(Collection<String> values) {
		return toArray(String.class, values);
	}

	/**
	 * Vérifie si le tableau est null ou empty.
	 *
	 * @param array le tableau
	 * @return true si le tableau est null ou empty, false sinon.
	 */
	public static boolean isNullOrEmpty(Object[] array) {
		return array == null || array.length == 0;
	}

	/**
	 * Vérifie si au moins un tableau est null ou empty.
	 *
	 * @param arrays les tableaux.
	 * @return true si au moins un tableau est null ou empty, false sinon.
	 */
	public static boolean isAnyNullOrEmpty(Object[]... arrays) {
		for (Object[] array : arrays) {
			if (isNullOrEmpty(array)) {
				return true;
			}
		}
		return false;
	}
}
