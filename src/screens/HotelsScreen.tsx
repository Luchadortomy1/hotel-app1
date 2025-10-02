import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Share,
  LayoutAnimation,
  Platform,
  UIManager,
  StatusBar,
  Modal,
} from "react-native";
import { WebView } from 'react-native-webview';
import * as Location from "expo-location";
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from "../context/ThemeContext";
import HamburgerMenu from "../components/HamburgerMenu";
import { createStyles } from "../styles/styles";

const GOOGLE_API_KEY = "AIzaSyA_k9wLZR9G_6ZX93FFuSotolCz9uzrX4o";

// Activar animaciones en Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HotelScreen() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<any>(null);

  const [distanceAsc, setDistanceAsc] = useState(true);
  const [ratingAsc, setRatingAsc] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedCityLocation, setSelectedCityLocation] = useState<{latitude: number, longitude: number} | null>(null);

  // Obtener tema y crear estilos dinámicos
  const { isDark } = useTheme();
  const styles = createStyles(isDark);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
      }
    })();
  }, []);

  // Cargar favoritos al iniciar la app
  useEffect(() => {
    loadFavorites();
  }, []);

  // Función para limpiar favoritos corruptos (solo para desarrollo/debug)
  const clearFavorites = async () => {
    try {
      await AsyncStorage.removeItem('hotelFavorites');
      setFavorites([]);
      console.log('Favoritos limpiados');
    } catch (error) {
      console.log('Error limpiando favoritos:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem('hotelFavorites');
      if (savedFavorites) {
        const parsedFavorites = JSON.parse(savedFavorites);
        // Filtrar favoritos válidos para evitar errores
        const validFavorites = parsedFavorites.filter((fav: any) => 
          fav?.place_id && fav?.geometry?.location
        );
        setFavorites(validFavorites);
      }
    } catch (error) {
      console.log('Error cargando favoritos:', error);
      setFavorites([]); // En caso de error, inicializar con array vacío
    }
  };

  const saveFavorites = async (newFavorites: any[]) => {
    try {
      await AsyncStorage.setItem('hotelFavorites', JSON.stringify(newFavorites));
    } catch (error) {
      console.log('Error guardando favoritos:', error);
    }
  };

  const searchCity = async (text: string) => {
    setQuery(text);
    if (text.length < 3) return;

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${text}&types=(cities)&key=${GOOGLE_API_KEY}`;
    const res = await axios.get(url);
    setSuggestions(res.data.predictions);
  };

  const selectCity = async (placeId: string, description: string) => {
    setLoading(true);
    setSuggestions([]);
    setQuery(description);

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`;
    const details = await axios.get(detailsUrl);
    const { lat, lng } = details.data.result.geometry.location;

    // Guardar las coordenadas de la ciudad para el mapa
    setSelectedCityLocation({ latitude: lat, longitude: lng });

    const hotelsUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=15000&type=lodging&key=${GOOGLE_API_KEY}`;
    const hotelsRes = await axios.get(hotelsUrl);

    const filtered = hotelsRes.data.results.filter(
      (h: any) =>
        h.types?.includes("lodging") && h.business_status === "OPERATIONAL"
    );

    setHotels(filtered);
    setLoading(false);
  };

  const getDistance = (lat: number, lng: number) => {
    if (!userLocation) return 0;

    const R = 6371e3;
    const φ1 = (userLocation.latitude * Math.PI) / 180;
    const φ2 = (lat * Math.PI) / 180;
    const Δφ = ((lat - userLocation.latitude) * Math.PI) / 180;
    const Δλ = ((lng - userLocation.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c;
    return d;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) return (meters / 1000).toFixed(2) + " km";
    if (meters >= 1) return meters.toFixed(0) + " m";
    return (meters * 100).toFixed(0) + " cm";
  };

  const sortByDistance = () => {
    if (!userLocation) return;
    const sorted = [...hotels].sort((a, b) => {
      const distA = getDistance(
        a.geometry.location.lat,
        a.geometry.location.lng
      );
      const distB = getDistance(
        b.geometry.location.lat,
        b.geometry.location.lng
      );
      return distanceAsc ? distA - distB : distB - distA;
    });
    setHotels(sorted);
    setDistanceAsc(!distanceAsc);
  };

  const sortByRating = () => {
    const sorted = [...hotels].sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingAsc ? ratingA - ratingB : ratingB - ratingA;
    });
    setHotels(sorted);
    setRatingAsc(!ratingAsc);
  };

  const getPhotoUrl = (photoRef: string) =>
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${GOOGLE_API_KEY}`;

  const clearInput = () => {
    setQuery("");
    setSuggestions([]);
    setHotels([]);
  };

  const shareHotel = async (hotel: any) => {
    try {
      // Obtener el teléfono del hotel
      const phoneNumber = await getHotelPhone(hotel.place_id);
      
      // Crear el link de Google Maps
      const mapsLink = `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${hotel.place_id}`;
      
      // Construir el mensaje completo
      let message = `🏨 ${hotel.name}\n\n`;
      message += `📍 Dirección: ${hotel.vicinity || "No disponible"}\n`;
      message += `⭐ Rating: ${hotel.rating || "N/A"}`;
      
      if (hotel.user_ratings_total) {
        message += ` (${hotel.user_ratings_total} reseñas)`;
      }
      
      if (phoneNumber) {
        message += `\n📞 Teléfono: ${phoneNumber}`;
      }
      
      message += `\n\n🗺️ Ver en Google Maps:\n${mapsLink}`;
      message += `\n\n¡Encontrado con la app Busca Hoteles! 🚀`;

      await Share.share({
        message: message,
        title: `Hotel: ${hotel.name}`,
      });
    } catch (error) {
      console.log("Error al compartir:", error);
    }
  };

  const toggleExpand = (placeId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(expanded === placeId ? null : placeId);
  };

  const toggleFavorite = (placeId: string) => {
    const hotel = hotels.find(h => h.place_id === placeId);
    if (!hotel) return;

    setFavorites(prev => {
      const existingIndex = prev.findIndex(fav => fav.place_id === placeId);
      const newFavorites = existingIndex >= 0
        ? prev.filter(fav => fav.place_id !== placeId)
        : [...prev, hotel];
      
      saveFavorites(newFavorites);
      return newFavorites;
    });
  };

  const isFavorite = (placeId: string) => {
    return favorites.some(fav => fav?.place_id === placeId);
  };

  const removeFavorite = (placeId: string) => {
    // Cerrar el hotel expandido si es el que se está quitando
    if (expanded === placeId) {
      setExpanded(null);
    }
    
    setFavorites(prev => {
      const newFavorites = prev.filter(fav => fav.place_id !== placeId);
      saveFavorites(newFavorites);
      return newFavorites;
    });
  };

  const getHotelPhone = async (placeId: string) => {
    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number&key=${GOOGLE_API_KEY}`;
      const response = await axios.get(detailsUrl);
      return response.data.result?.formatted_phone_number;
    } catch (error) {
      console.log("Error obteniendo teléfono:", error);
      return null;
    }
  };

  const makeReservation = async (item: any) => {
    const phoneNumber = await getHotelPhone(item.place_id);
    if (phoneNumber) {
      const url = `tel:${phoneNumber}`;
      Linking.openURL(url);
    } else {
      // Si no hay teléfono, abrir en Google Maps como alternativa
      const url = `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${item.place_id}`;
      Linking.openURL(url);
    }
  };

  const generateMapHTML = () => {
    if (!selectedCityLocation || hotels.length === 0) return '';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            function initMap() {
              const map = new google.maps.Map(document.getElementById("map"), {
                zoom: 13,
                center: { lat: ${selectedCityLocation.latitude}, lng: ${selectedCityLocation.longitude} },
                mapTypeControl: true,
                streetViewControl: true,
                fullscreenControl: false
              });
              
              ${hotels.map((hotel, index) => `
                const marker${index} = new google.maps.Marker({
                  position: { lat: ${hotel.geometry.location.lat}, lng: ${hotel.geometry.location.lng} },
                  map: map,
                  title: "${hotel.name.replace(/"/g, '\\"')}",
                  icon: {
                    url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                    scaledSize: new google.maps.Size(35, 35)
                  }
                });
                
                const infoWindow${index} = new google.maps.InfoWindow({
                  content: \`
                    <div style="max-width: 200px; font-family: Arial, sans-serif;">
                      <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #333;">${hotel.name.replace(/"/g, '\\"')}</h3>
                      <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${(hotel.vicinity || 'Ubicación no disponible').replace(/"/g, '\\"')}</p>
                      <p style="margin: 0; font-size: 12px; color: #ff9800;">⭐ ${hotel.rating || 'N/A'}</p>
                      <p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">${hotel.user_ratings_total || 0} reseñas</p>
                    </div>
                  \`
                });
                
                marker${index}.addListener('click', () => {
                  infoWindow${index}.open(map, marker${index});
                });
              `).join('')}
            }
          </script>
          <script async defer
            src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&callback=initMap">
          </script>
        </body>
      </html>
    `;
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={isDark ? "#121212" : "#F5F5F5"}
      />
      <View style={styles.container}>
        {/* Menú hamburguesa */}
        <HamburgerMenu onShowFavorites={() => setShowFavorites(true)} />
        
        {/* Título fijo */}
        <Text style={styles.appTitle}>Busca Hoteles</Text>
      
      {/* Barra de búsqueda */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Escribe tu ciudad..."
          placeholderTextColor={isDark ? "#b3b3b3" : "#666"}
          value={query}
          onChangeText={searchCity}
          style={styles.inputWithClear}
        />
        {query.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearInput}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sugerencias */}
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.place_id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.suggestionItem}
            onPress={() => selectCity(item.place_id, item.description)}
          >
            <Text style={styles.suggestionText}>{item.description}</Text>
          </TouchableOpacity>
        )}
      />

      {loading && <ActivityIndicator size="large" color="#007BFF" />}

      {/* Botones de orden y mapa */}
      {hotels.length > 0 && (
        <View style={styles.sortButtonsRow}>
          <TouchableOpacity style={styles.sortButton} onPress={sortByDistance}>
            <Text style={styles.sortButtonText}>
              {distanceAsc ? "Cerca → Lejos" : "Lejos → Cerca"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortButton} onPress={sortByRating}>
            <Text style={styles.sortButtonText}>
              {ratingAsc ? "⭐ Menor → Mayor" : "⭐ Mayor → Menor"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapViewButton} onPress={() => setShowMap(true)}>
            <Text style={styles.mapViewButtonText}>
              Ver Mapa
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hoteles */}
      <FlatList
        data={hotels}
        keyExtractor={(item) => item.place_id}
        renderItem={({ item }) => {
          const distance = formatDistance(
            getDistance(item.geometry.location.lat, item.geometry.location.lng)
          );
          const isExpanded = expanded === item.place_id;

          return (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => toggleExpand(item.place_id)}
            >
              {/* Imagen */}
              <Image
                source={{
                  uri: item.photos
                    ? getPhotoUrl(item.photos[0].photo_reference)
                    : "https://via.placeholder.com/100x100.png?text=No+Image",
                }}
                style={styles.image}
              />

              <View style={styles.cardContent}>
                <Text style={styles.hotelName}>{item.name}</Text>
                <Text style={styles.hotelVicinity}>{item.vicinity}</Text>
                {item.rating && (
                  <Text style={styles.hotelRating}>
                    ⭐ {item.rating} • {distance}
                  </Text>
                )}

                {/* Detalles expandibles */}
                {isExpanded && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.expandedText}>📍 Dirección: {item.vicinity || "No disponible"}</Text>
                    <Text style={styles.expandedText}>⭐ Rating: {item.rating || "N/A"}</Text>
                    <Text style={styles.expandedText}>💬 Reseñas: {item.user_ratings_total || 0}</Text>

                    <View style={styles.buttonsRow}>
                      <TouchableOpacity
                        style={[styles.favoriteButton, isFavorite(item.place_id) && styles.favoriteButtonActive]}
                        onPress={() => toggleFavorite(item.place_id)}
                      >
                        <Text style={styles.favoriteButtonText}>
                          {isFavorite(item.place_id) ? "★" : "☆"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.reserveButton}
                        onPress={() => makeReservation(item)}
                      >
                        <Text style={styles.reserveButtonText}>Reservar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => {
                          const url = `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${item.place_id}`;
                          Linking.openURL(url);
                        }}
                      >
                        <Text style={styles.mapButtonText}>Abrir en Maps</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => shareHotel(item)}
                      >
                        <Text style={styles.mapButtonText}>Compartir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
      
      {/* Modal del Mapa */}
      <Modal
        visible={showMap}
        animationType="slide"
        onRequestClose={() => setShowMap(false)}
      >
        <View style={styles.safeArea}>
          <StatusBar 
            barStyle={isDark ? "light-content" : "dark-content"} 
            backgroundColor={isDark ? "#121212" : "#F5F5F5"}
          />
          <View style={styles.container}>
            <View style={styles.favoritesHeader}>
              <Text style={styles.appTitle}>Mapa de Hoteles</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMap(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedCityLocation && hotels.length > 0 && (
              <WebView
                style={styles.webView}
                source={{ html: generateMapHTML() }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007BFF" />
                    <Text style={styles.loadingText}>Cargando mapa...</Text>
                  </View>
                )}
              />
            )}
            
            {(!selectedCityLocation || hotels.length === 0) && (
              <View style={styles.emptyMap}>
                <Text style={styles.emptyMapText}>
                  Busca hoteles en una ciudad para ver el mapa
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Favoritos */}
      <Modal
        visible={showFavorites}
        animationType="slide"
        onRequestClose={() => setShowFavorites(false)}
      >
        <View style={styles.safeArea}>
          <StatusBar 
            barStyle={isDark ? "light-content" : "dark-content"} 
            backgroundColor={isDark ? "#121212" : "#F5F5F5"}
          />
          <View style={styles.container}>
            <View style={styles.favoritesHeader}>
              <Text style={styles.appTitle}>Mis Favoritos</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFavorites(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={favorites}
              keyExtractor={(item, index) => item.place_id || `favorite-${index}`}
              renderItem={({ item }) => {
                // Validar que el item tenga la estructura necesaria
                if (!item?.geometry?.location) {
                  return null;
                }
                
                const distance = userLocation ? formatDistance(
                  getDistance(item.geometry.location.lat, item.geometry.location.lng)
                ) : 'Distancia no disponible';
                
                return (
                  <TouchableOpacity 
                    style={styles.card}
                    onPress={() => toggleExpand(item.place_id)}
                  >
                    <Image
                      source={{
                        uri: item.photos?.[0]
                          ? getPhotoUrl(item.photos[0].photo_reference)
                          : "https://via.placeholder.com/100x100.png?text=No+Image",
                      }}
                      style={styles.image}
                    />
                    <View style={styles.cardContent}>
                      <Text style={styles.hotelName}>{item.name || 'Hotel sin nombre'}</Text>
                      <Text style={styles.hotelVicinity}>{item.vicinity || 'Ubicación no disponible'}</Text>
                      {item.rating && (
                        <Text style={styles.hotelRating}>
                          ⭐ {item.rating} • {distance}
                        </Text>
                      )}
                      
                      {/* Detalles expandibles en favoritos */}
                      {expanded === item.place_id && (
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.expandedText}>📍 Dirección: {item.vicinity || "No disponible"}</Text>
                          <Text style={styles.expandedText}>⭐ Rating: {item.rating || "N/A"}</Text>
                          <Text style={styles.expandedText}>💬 Reseñas: {item.user_ratings_total || 0}</Text>

                          <View style={styles.buttonsRow}>
                            <TouchableOpacity
                              style={[styles.favoriteButton, styles.favoriteButtonActive]}
                              onPress={() => removeFavorite(item.place_id)}
                            >
                              <Text style={styles.favoriteButtonText}>
                                ★
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.reserveButton}
                              onPress={() => makeReservation(item)}
                            >
                              <Text style={styles.reserveButtonText}>Reservar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.mapButton}
                              onPress={() => {
                                const url = `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${item.place_id}`;
                                Linking.openURL(url);
                              }}
                            >
                              <Text style={styles.mapButtonText}>Abrir en Maps</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.mapButton}
                              onPress={() => shareHotel(item)}
                            >
                              <Text style={styles.mapButtonText}>Compartir</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyFavorites}>
                  <Text style={styles.emptyFavoritesText}>
                    No tienes hoteles favoritos aún
                  </Text>
                  <Text style={styles.emptyFavoritesSubtext}>
                    Busca hoteles en cualquier ciudad y márcalos como favoritos para verlos siempre aquí
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
    </View>
  );
}
