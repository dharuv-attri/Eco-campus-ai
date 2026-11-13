"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator &&
      window.location.protocol === "https:"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // PWA support is optional; ignore registration failures.
      });
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: { borderRadius: "14px", fontFamily: "inherit" },
        }}
      />
    </ThemeProvider>
  );
}
