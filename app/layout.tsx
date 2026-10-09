import type {Metadata} from 'next';
import { Inter, Orbitron } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: "Blackbook",
  description: "Plataforma para tatuadores criarem e venderem cursos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="pt-BR" className="dark">
        <body className={`${inter.variable} ${orbitron.variable} font-sans antialiased min-h-screen bg-background text-foreground`} suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
