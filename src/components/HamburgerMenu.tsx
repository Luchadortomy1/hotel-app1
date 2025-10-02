import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface HamburgerMenuProps {
  onShowFavorites: () => void;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ onShowFavorites }) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const { toggleTheme, isDark } = useTheme();

  const toggleMenu = () => {
    setIsMenuVisible(!isMenuVisible);
  };

  const handleThemeToggle = () => {
    toggleTheme();
    setIsMenuVisible(false);
  };

  const handleShowFavorites = () => {
    onShowFavorites();
    setIsMenuVisible(false);
  };

  return (
    <>
      {/* Botón hamburguesa */}
      <TouchableOpacity
        style={[
          styles.hamburgerButton,
          { backgroundColor: isDark ? '#333' : '#fff' }
        ]}
        onPress={toggleMenu}
      >
        <View style={[styles.line, { backgroundColor: isDark ? '#fff' : '#333' }]} />
        <View style={[styles.line, { backgroundColor: isDark ? '#fff' : '#333' }]} />
        <View style={[styles.line, { backgroundColor: isDark ? '#fff' : '#333' }]} />
      </TouchableOpacity>

      {/* Modal del menú */}
      <Modal
        transparent={true}
        visible={isMenuVisible}
        animationType="fade"
        onRequestClose={toggleMenu}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={toggleMenu}
        >
          <View style={[
            styles.menuContainer,
            { backgroundColor: isDark ? '#2c2c2c' : '#fff' }
          ]}>
            <TouchableOpacity
              style={[
                styles.menuItem,
                { borderBottomColor: isDark ? '#444' : '#eee' }
              ]}
              onPress={handleShowFavorites}
            >
              <Text style={[
                styles.menuText,
                { color: isDark ? '#fff' : '#333' }
              ]}>
                ⭐ Ver Favoritos
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.menuItem,
                { borderBottomColor: 'transparent' }
              ]}
              onPress={handleThemeToggle}
            >
              <Text style={[
                styles.menuText,
                { color: isDark ? '#fff' : '#333' }
              ]}>
                {isDark ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  hamburgerButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 1000,
  },
  line: {
    width: 20,
    height: 3,
    marginVertical: 2,
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    marginTop: 60,
    marginRight: 15,
    minWidth: 180,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  menuItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default HamburgerMenu;