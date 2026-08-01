import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hash Super Admin Dashboard",
  description: "Hash super admin control center for onboarding, verification, settlements, collaborators, products and subscriptions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
