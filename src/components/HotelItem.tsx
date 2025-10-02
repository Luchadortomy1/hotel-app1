import React from "react";
import { TouchableOpacity, Text, Linking } from "react-native";
import { styles } from "../styles/styles";

interface Props {
  hotel: {
    name: string;
    vicinity: string;
    geometry: {
      location: { lat: number; lng: number };
    };
  };
}

export default function HotelItem({ hotel }: Readonly<Props>) {
  const abrirEnMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hotel.geometry.location.lat},${hotel.geometry.location.lng}`;
    Linking.openURL(url);
  };

  return (
    <TouchableOpacity style={styles.item} onPress={abrirEnMaps}>
      <Text style={styles.itemTitle}>{hotel.name}</Text>
      <Text>{hotel.vicinity}</Text>
    </TouchableOpacity>
  );
}
