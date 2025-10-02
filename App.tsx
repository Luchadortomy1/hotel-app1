import React from "react";
import HotelsScreen from "./src/screens/HotelsScreen";
import { ThemeProvider } from "./src/context/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <HotelsScreen />
    </ThemeProvider>
  );
}
