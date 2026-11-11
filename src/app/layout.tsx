import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gjensidige Omtanke",
  description: "The first iteration of Gjensidige Omtanke.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
