import './globals.css';
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'TorFlix',
  description: 'Streaming illimité',
  manifest: '/manifest.json',
  themeColor: '#0D0D0D',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} bg-sp-darker text-white antialiased overscroll-none`}>
        {children}
      </body>
    </html>
  );
}
