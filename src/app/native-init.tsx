"use client";

import { useEffect } from "react";

export default function NativeInit() {
  useEffect(() => {
    import("@/lib/capacitor").then((m) => m.initNative());
  }, []);
  return null;
}
