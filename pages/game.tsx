"use client";
import PixiSprite from "@/components/PixiSprite";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Game sayfası bileşeni
export default function Game() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sayfa yüklendiğinde cüzdan bağlantısını kontrol et
    const checkWalletConnection = async () => {
      try {
        // Local storage'dan cüzdan adresini kontrol et
        const walletAddress = localStorage.getItem("walletAddress");

        if (!walletAddress) {
          // Cüzdan bağlı değilse ana sayfaya yönlendir
          console.log(
            "Cüzdan bağlı değil. Ana sayfaya yönlendiriliyor..."
          );
          router.replace("/");
          return; // İşlemi burada sonlandır
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error("Yetkilendirme hatası:", error);
        router.replace("/");
      } finally {
        setLoading(false);
      }
    };

    // Sayfa yüklendiğinde hemen kontrol et
    checkWalletConnection();

    // Sayfa görünür olduğunda tekrar kontrol et (tarayıcı sekmesi değiştiğinde)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkWalletConnection();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periyodik olarak cüzdan bağlantısını kontrol et (her 30 saniyede bir)
    const intervalId = setInterval(checkWalletConnection, 30000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [router]);

  // Yükleme durumunda veya yetkisiz erişimde içerik gösterme
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl">Yükleniyor...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    // Yetkisiz erişim durumunda hiçbir içerik gösterme
    return null;
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-4">Oyun Sayfası</h1>
      <button
        onClick={() => {
          // Cüzdan bağlantısını kes ve ana sayfaya dön
          localStorage.removeItem("walletAddress");
          router.push("/");
        }}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Ana Sayfaya Dön
      </button>
      <PixiSprite isGamePage={true} />
    </main>
  );
}
