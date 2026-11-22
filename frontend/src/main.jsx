import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import { MotionConfig } from "motion/react";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>
);
