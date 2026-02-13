package com.onea.abcash.utils;

import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Stream;

/**
 * Fonctions utilitaires de manipulations de collections.
 */
public final class CollectionUtils {

	private CollectionUtils() {
	}

	/**
	 * Crée un HashSet à partir des objets donnés en paramètres.<br/>
	 * Cette méthode est directement inspirée de Guava.
	 *
	 * @param values Les objets du set.
	 * @param <T>    Le type des objets.
	 * @return Le set.
	 */
	public static <T> Set<T> newHashSet(T... values) {
		return new HashSet<>(Arrays.asList(values));
	}

	/**
	 * Crée une HashMap à partir de ses clés et valeurs.<br/>
	 * Cette méthode est directement inspirée de Guava.
	 *
	 * @param key   La clé.
	 * @param value La valeur.
	 * @param <K>   Le type des clés.
	 * @param <V>   Le type des valeurs.
	 * @return La map.
	 */
	public static <K, V> Map<K, V> newHashMap(K key, V value) {
		Map<K, V> map = new HashMap<>();
		map.put(key, value);
		return map;
	}

	/**
	 * Crée une HashMap à partir de ses clés et valeurs.<br/>
	 * Cette méthode est directement inspirée de Guava.
	 *
	 * @param key1   La clé 1.
	 * @param value1 La valeur pour key1.
	 * @param key2   La clé 2.
	 * @param value2 La valeur pour key2.
	 * @param <K>    Le type des clés.
	 * @param <V>    Le type des valeurs.
	 * @return La map.
	 */
	public static <K, V> Map<K, V> newHashMap(K key1, V value1, K key2, V value2) {
		Map<K, V> map = newHashMap(key1, value1);
		map.put(key2, value2);
		return map;
	}

	/**
	 * Crée une HashMap à partir de ses clés et valeurs.<br/>
	 * Cette méthode est directement inspirée de Guava.
	 *
	 * @param key1   La clé 1.
	 * @param value1 La valeur pour key1.
	 * @param key2   La clé 2.
	 * @param value2 La valeur pour key2.
	 * @param key3   La clé 3.
	 * @param value3 La valeur pour key3.
	 * @param <K>    Le type des clés.
	 * @param <V>    Le type des valeurs.
	 * @return La map.
	 */
	public static <K, V> Map<K, V> newHashMap(K key1, V value1, K key2, V value2, K key3, V value3) {
		Map<K, V> map = newHashMap(key1, value1, key2, value2);
		map.put(key3, value3);
		return map;
	}

	/**
	 * Crée une HashMap à partir de ses clés et valeurs.<br/>
	 * Cette méthode est directement inspirée de Guava.
	 *
	 * @param key1   La clé 1.
	 * @param value1 La valeur pour key1.
	 * @param key2   La clé 2.
	 * @param value2 La valeur pour key2.
	 * @param key3   La clé 3.
	 * @param value3 La valeur pour key3.
	 * @param key4   La clé 4.
	 * @param value4 La valeur pour key4.
	 * @param <K>    Le type des clés.
	 * @param <V>    Le type des valeurs.
	 * @return La map.
	 */
	public static <K, V> Map<K, V> newHashMap(K key1, V value1, K key2, V value2, K key3, V value3, K key4, V value4) {
		Map<K, V> map = newHashMap(key1, value1, key2, value2, key3, value3);
		map.put(key4, value4);
		return map;
	}

	/**
	 * Fais un diff des deux sets et renvoie les valeurs présente dans le set2 et absente du set1.
	 *
	 * @param set1 Premier set.
	 * @param set2 Deuxième set.
	 * @param <T>  Le type des objets.
	 * @return Le diff.
	 */
	public static <T> Set<T> diff(Collection<T> set1, Collection<T> set2) {
		Set<T> newSet = new HashSet<>(set2);
		newSet.removeAll(set1);
		return newSet;
	}

	/**
	 * Retourne le premier élément de la collection.
	 *
	 * @param collection La collection.
	 * @param <T>        Le type des objets.
	 * @return Le premier élément, null si la collection est vide.
	 */
	public static <T> T first(Collection<T> collection) {
		return collection == null || collection.isEmpty() ? null : collection.iterator().next();
	}

	/**
	 * Retourne le dernier élément de la collection.
	 *
	 * @param collection La collection.
	 * @param <T>        Le type des objets.
	 * @return Le dernier élément, null si la collection est vide.
	 */
	public static <T> T last(Collection<T> collection) {
		if (collection == null || collection.isEmpty()) {
			return null;
		}
		List<T> liste = new ArrayList<>(collection);
		return liste.get(liste.size() - 1);
	}

	/**
	 * Vérifie si la collection est null ou empty.
	 *
	 * @param collection la collection.
	 * @return true si la collection est null ou empty, false sinon.
	 */
	public static boolean isNullOrEmpty(Collection<?> collection) {
		return collection == null || collection.isEmpty();
	}

	/**
	 * Vérifie si la stream est null ou empty.
	 *
	 * @param stream le stream.
	 * @return true si le stream est null ou empty, false sinon.
	 */
	public static boolean isNullOrEmpty(Stream<?> stream) {
		Supplier<Stream<?>> tempStream = () -> stream;
		return stream == null || !tempStream.get().findAny().isPresent();
	}

	/**
	 * Vérifie si la collection n'est pas null ou empty.
	 *
	 * @param collection la collection.
	 * @return true si la collection n'est pas null ou empty, false sinon.
	 */
	public static boolean isNotNullOrEmpty(Collection<?> collection) {
		return !isNullOrEmpty(collection);
	}

	/**
	 * Vérifie si au moins une collection est null ou empty.
	 *
	 * @param collections les collections.
	 * @return true si au moins une collection est null ou empty, false sinon.
	 */
	public static boolean isAnyNullOrEmpty(Collection<?>... collections) {
		for (Collection<?> collection : collections) {
			if (isNullOrEmpty(collection)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Vérifie si la map est null ou empty.
	 *
	 * @param map la map.
	 * @return true si la map est null ou empty, false sinon.
	 */
	public static boolean isNullOrEmpty(Map<?, ?> map) {
		return map == null || map.entrySet().isEmpty();
	}

	/**
	 * Vérifie si la map n'est pas null ou empty.
	 *
	 * @param map la map.
	 * @return true si la map n'est pas null ou empty, false sinon.
	 */
	public static boolean isNotNullOrEmpty(Map<?, ?> map) {
		return !isNullOrEmpty(map);
	}

	/**
	 * Vérifie si au moins une map est null ou empty.
	 *
	 * @param maps les maps.
	 * @return true si au moins une map est null ou empty, false sinon.
	 */
	public static boolean isAnyNullOrEmpty(Map<?, ?>... maps) {
		for (Map<?, ?> map : maps) {
			if (isNullOrEmpty(map)) {
				return true;
			}
		}
		return false;
	}
}
