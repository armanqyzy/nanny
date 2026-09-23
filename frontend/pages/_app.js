import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import Head from 'next/head';
import { LanguageProvider } from '../lib/i18n';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Nanny</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Nanny — find verified pet sitters in Almaty" />
        <link rel="icon" href="/nanny-logo.png" />
        <link rel="apple-touch-icon" href="/nanny-logo.png" />
      </Head>
      <LanguageProvider>
        <Component {...pageProps} />
      </LanguageProvider>
    </>
  );
}