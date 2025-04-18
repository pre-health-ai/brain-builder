import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/lib/providers/theme-provider";
import { AuthProvider } from "@/lib/providers/auth-provider";

import "./globals.css";

const figtree = Figtree({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BrainBuilder",
  description: "Visual node-based editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body className={figtree.className}>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </AuthProvider>

          <Toaster invert position="top-center" />
        </body>
      </html>
    </>
  );
}
