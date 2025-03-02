import { useState, useEffect } from 'react';
import { createWalletClient, custom } from 'viem';
import { monadTestnet } from 'viem/chains';

interface WalletConnectProps {
  onSignIn: () => void;
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export default function WalletConnect({ onSignIn, onConnect, onDisconnect }: WalletConnectProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sayfa yüklendiğinde daha önce bağlı hesap varsa kontrol et
  useEffect(() => {
    // Tarayıcı ortamında olduğundan emin ol
    if (typeof window !== 'undefined' && window.ethereum) {
      checkConnection();
    }
  }, []);

  // Ethereum hesap değişikliklerini dinle
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('disconnect', handleDisconnect);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  // Mevcut bağlantıyı kontrol et
  async function checkConnection() {
    try {
      if (!window.ethereum) return;

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        // Cüzdan adresi localStorage'a kaydet
        localStorage.setItem('walletAddress', accounts[0]);
        // onConnect callback'i çağır
        if (onConnect) {
          onConnect(accounts[0]);
        }
      } else {
        setAccount(null);
        localStorage.removeItem('walletAddress');
        // onDisconnect callback'i çağır
        if (onDisconnect) {
          onDisconnect();
        }
      }
    } catch (err) {
      console.error("Bağlantı kontrolünde hata:", err);
    }
  }

  // Hesap değişikliğini işle
  function handleAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      // Kullanıcı bağlantıyı kesti
      setAccount(null);
      localStorage.removeItem('walletAddress');
      // onDisconnect callback'i çağır
      if (onDisconnect) {
        onDisconnect();
      }
    } else {
      // Yeni hesap bağlandı
      setAccount(accounts[0]);
      localStorage.setItem('walletAddress', accounts[0]);
      // onConnect callback'i çağır
      if (onConnect) {
        onConnect(accounts[0]);
      }
    }
  }

  // Bağlantı koptuğunda işle
  function handleDisconnect() {
    setAccount(null);
    localStorage.removeItem('walletAddress');
    // onDisconnect callback'i çağır
    if (onDisconnect) {
      onDisconnect();
    }
  }

  // Cüzdanı bağla
  async function connectWallet() {
    try {
      setIsConnecting(true);
      setError(null);
      
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed! Please install MetaMask extension.");
      }
      
      // Hesapları iste
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        throw new Error("Wallet connection rejected.");
      }
      
      setAccount(accounts[0]);
      // Cüzdan adresi localStorage'a kaydet
      localStorage.setItem('walletAddress', accounts[0]);
      
      // onConnect callback'i çağır
      if (onConnect) {
        onConnect(accounts[0]);
      }
      
      // Oyuna giriş yap
      onSignIn();
      
    } catch (err: any) {
      setIsConnecting(false);
      setError(err.message || "Error connecting wallet.");
      console.error("Wallet connection error:", err);
    } finally {
      setIsConnecting(false);
    }
  }

  // Cüzdan bağlantısını kes
  async function disconnectWallet() {
    try {
      setAccount(null);
      localStorage.removeItem('walletAddress');
      
      // onDisconnect callback'i çağır
      if (onDisconnect) {
        onDisconnect();
      }
      
      // Not: MetaMask API'si doğrudan bağlantıyı kesme metodu sunmaz
      // Bu nedenle sadece yerel durumu temizliyoruz
      
    } catch (err: any) {
      setError(err.message || "Error disconnecting wallet.");
      console.error("Wallet disconnection error:", err);
    }
  }

  return (
    <div className="flex flex-col w-full space-y-4">
      {!account ? (
        <button 
          onClick={connectWallet} 
          disabled={isConnecting}
          className="w-full bg-green-900 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div className="flex flex-col space-y-2">
          <div className="text-center font-medium truncate">
            {account.substring(0, 6)}...{account.substring(account.length - 4)}
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => onSignIn()}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Start Game
            </button> 
            
            <button 
              onClick={disconnectWallet}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="text-red-500 text-sm text-center mt-2">
          {error}
        </div>
      )}
    </div>
  );
} 