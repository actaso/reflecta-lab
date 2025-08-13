import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { PHProvider } from '../lib/providers';
import FloatingNavigation from '../components/FloatingNavigation';
import { ErrorBoundary } from '../components/error-boundaries';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reflecta Labs",
  description: "Minimalist journal interface for rapid reflection and note-taking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  const content = (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary 
          level="root" 
          context="Application Root"
        >
          <PHProvider>
            {children}
            <ErrorBoundary 
              level="component" 
              context="Global Navigation"
              allowRecovery={false}
            >
              <FloatingNavigation />
            </ErrorBoundary>
          </PHProvider>
        </ErrorBoundary>
      </body>
    </html>
  );

  if (hasClerkKeys) {
    return (
      <ErrorBoundary 
        level="feature" 
        context="Authentication"
        allowRecovery={false}
      >
        <ClerkProvider>{content}</ClerkProvider>
      </ErrorBoundary>
    );
  }

  return content;
}
