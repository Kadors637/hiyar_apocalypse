import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from 'react';
import { startTransactionQueue } from '@/lib/web3';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Uygulama başladığında işlem kuyruğunu başlat
    const stopQueue = startTransactionQueue();
    
    // Uygulama kapandığında işlem kuyruğunu durdur
    return () => {
      stopQueue();
    };
  }, []);
  
  return <Component {...pageProps} />;
}
