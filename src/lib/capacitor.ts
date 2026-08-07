import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();

export async function initNative() {
  if (!isNative) return;

  const { StatusBar, Style } = await import("@capacitor/status-bar");
  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setBackgroundColor({ color: "#2c2138" });

  const { SplashScreen } = await import("@capacitor/splash-screen");
  await SplashScreen.hide();

  const { App } = await import("@capacitor/app");
  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });
}
