import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ThemeProvider } from "@/context/ThemeContext";
import LoginPanel from "@/components/auth/LoginPanel";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:p-0" style={{ ['--dark-bg' as string]: '#000000' }}>
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col bg-white dark:bg-[#000000] sm:p-0">
          {children}

          <LoginPanel />

          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
