import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gjensidige Omtanke",
  description: "The first iteration of Gjensidige Omtanke.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <h1>Gjensidige Omtanke</h1>
        </header>
        {children}
      </body>
    </html>
  );
}
