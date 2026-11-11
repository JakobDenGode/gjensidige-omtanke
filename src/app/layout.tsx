import type { Metadata, Viewport } from "next";
import { Flex, Title } from "@gjensidige/builders-components";
import "@gjensidige/builders-components/dist/style.css";
import "@gjensidige/builders-fonts/dist/fonts.css";
import "@gjensidige/builders-tokens/dist/tokens.css";
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
          <Flex center layout={1}>
            <Title as="h1" size="2">
              Gjensidige Omtanke
            </Title>
          </Flex>
        </header>
        {children}
      </body>
    </html>
  );
}
