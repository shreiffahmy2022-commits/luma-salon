import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rg.salon",
  appName: "RG",
  webDir: "out",
  server: {
    url: "https://luma-salon.vercel.app",
  },
  ios: {
    scheme: "RG",
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
