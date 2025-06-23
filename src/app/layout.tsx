import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Uni Chat',
  description: 'A minimal, universal chat interface for your favorite LLM.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://placehold.co" />
      </head>
      <body className={`font-body antialiased h-full ${inter.variable}`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
