import { useEffect, useState } from "react";
import WalletConnect from "../components/WalletConnect";
import ThemeToggle from "../components/ThemeToggle";
import TokenSender from "../components/TokenSender";
import { useRouter } from "next/router";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [theme, setTheme] = useState("light");
  const [isClient, setIsClient] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    // Sayfa yüklendiğinde mevcut temayı kontrol et
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
    setIsClient(true);

    // Cüzdan adresini localStorage'dan al
    const storedAddress = localStorage.getItem("walletAddress");
    if (storedAddress) {
      setWalletAddress(storedAddress);
    }
  }, []);

  function handleSignIn() {
    // Oyun sayfasına yönlendir
    router.push("/game");
  }

  function handleThemeChange(newTheme: string) {
    setTheme(newTheme);
  }

  // Cüzdan bağlandığında çağrılacak fonksiyon
  function handleWalletConnect(address: string) {
    setWalletAddress(address);
  }

  // Cüzdan bağlantısı kesildiğinde çağrılacak fonksiyon
  function handleWalletDisconnect() {
    setWalletAddress(null);
  }

  // Animasyonlu arka plan bileşenini oluştur
  const AnimatedBackground = () => {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => {
          // Her animasyon için sabit seed değerleri kullan
          const width = 50 + ((i * 7919) % 100); // Asal sayı kullanarak daha iyi dağılım
          const height = 50 + ((i * 6997) % 100);
          const left = ((i * 8191) % 100);
          const top = ((i * 7307) % 100);
          const delay = ((i * 6151) % 10);
          const duration = 10 + ((i * 7523) % 20);
          
          return (
            <div 
              key={i}
              className={`absolute rounded-full ${theme === "light" ? "bg-green-300/30" : "bg-green-500/20"} animate-float`}
              style={{
                width: `${width}px`,
                height: `${height}px`,
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${theme === "light" ? "bg-gradient-to-r from-green-100 to-emerald-100" : "bg-gradient-to-r from-gray-900 to-green-900"} transition-colors duration-500`}>
      {/* Animasyonlu arka planı sadece istemci tarafında render et */}
      {isClient && <AnimatedBackground />}
      
      <div className="flex flex-col items-center gap-8 mb-50">
        <Image 
          src="/LOGO.png"
          alt="Logo"
          width={500}
          height={500}
          priority
          className="z-500"
        />
              
        {/* Card içeriği */}
        <div className={`relative z-10 p-8 rounded-xl shadow-xl ${theme === "light" ? "bg-green-50 text-gray-800/90" : "bg-gray-800/90 text-green-50"} transition-colors duration-300 w-full max-w-md`}>
          <div className="absolute top-4 right-4">
            <ThemeToggle onThemeChange={handleThemeChange} />
          </div>
          
          <div className="flex flex-col items-center space-y-8 mt-8">
            <p className="text-center">
             Connect your Ethereum wallet and start our exciting game!
            </p>
            
            <div className="w-full max-w-xs">
              <WalletConnect 
                onSignIn={handleSignIn} 
                onConnect={handleWalletConnect}
                onDisconnect={handleWalletDisconnect}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
