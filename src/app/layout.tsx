import { AuthProvider } from "../context/authContext";
import AuthRedirect from "@/components/AuthRedirect";

import "./globals.css";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>
          <AuthProvider>
            <AuthRedirect>{children}</AuthRedirect>
          </AuthProvider>
        </main>
      </body>
    </html>
  );
}
