import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Indian Education Loan Calculator",
  description: "Calculate your education loan EMI with moratorium period",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
