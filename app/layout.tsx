import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// Fuentes self-hosted (sin dependencia de Google Fonts en build).
// Son variable fonts subset latin: un solo archivo cubre el rango de pesos.
const inter = localFont({
  src: "./fonts/inter-latin-var.woff2",
  variable: "--font-body",
  weight: "400 700",
  style: "normal",
  display: "swap",
});

const montserrat = localFont({
  src: "./fonts/montserrat-latin-var.woff2",
  variable: "--font-heading",
  weight: "400 800",
  style: "normal",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin-var.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SCACR - Sistema de Gestión de Torrefacción",
  description: "Centro Agrícola Cantonal de Desamparados",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#32170d",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${montserrat.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function stripBisSkinChecked(node) {
                  if (node.nodeType === 1) {
                    node.removeAttribute("bis_skin_checked");
                    node.childNodes.forEach(stripBisSkinChecked);
                  }
                }
                if (typeof document !== "undefined") {
                  stripBisSkinChecked(document.documentElement);
                  var observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                      if (mutation.type === "attributes" && mutation.attributeName === "bis_skin_checked") {
                        mutation.target.removeAttribute("bis_skin_checked");
                      } else {
                        mutation.addedNodes.forEach(stripBisSkinChecked);
                      }
                    });
                  });
                  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["bis_skin_checked"] });
                }
              })();
            `,
          }}
        />
        {children}
        <Toaster />
        {process.env.NODE_ENV === "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
