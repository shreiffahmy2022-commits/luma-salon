import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.luma.salon",
  appName: "Luma",
  webDir: "out",
  server: {
    // In production, point to your deployed URL:
    // url: "https://your-domain.com",
    // For development, use the local dev server:
    url: "http://localhost:3000",
    cleartext: true,
  },
  ios: {
    scheme: "Luma",
    contentInset: "automatic",
    backgroundColor: "#2c2138",
  },
  android: {
    backgroundColor: "#2c2138",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: "#2c2138",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#2c2138",
    },
  },
};

export default config;
