import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./providers/auth-provider";

export const metadata: Metadata = {
  title: "WebNest — Your team, moving forward",
  description:
    "A thoughtful workspace for projects, tasks, and your team's next big thing.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
