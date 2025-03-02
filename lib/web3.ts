import { createWalletClient, http, parseAbi, createPublicClient, getContract, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from 'viem/chains';

// Sabit değerler
const RPC_URL = 'https://monad-testnet.g.alchemy.com/v2/8QMlEIAdNyu3vAlf8e7XhoyRRwBiaFr5';
const CHAIN_ID = 10143;
const GAME_CONTRACT_ADDRESS = '0x260007742c129f6e5711bff88a03c252134726cf';

// İşlem kuyruğu tipi tanımlamaları
type TransactionType = 'bossHit' | 'rewardToken';

interface QueuedTransaction {
  id: string;
  type: TransactionType;
  params: any[];
  timestamp: number;
  retryCount: number;
  processing: boolean;
}

// İşlem kuyruğu
let transactionQueue: QueuedTransaction[] = [];
let isProcessingQueue = false;
let queueInterval: NodeJS.Timeout | null = null;

// Monad testnet zincir bilgileri
export const monadTestnetChain = {
  ...monadTestnet,
  id: CHAIN_ID,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MONAD',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
    public: {
      http: [RPC_URL],
    },
  },
  blockExplorers: {
    default: {  
      name: 'Monad Explorer',
      url: 'https://explorer.monad.xyz',
    },
  },
};

// Akıllı kontrat ABI'si
const GameContractABI = parseAbi([
  'function bossHit(address player)',
  'function rewardToken(address player, uint256 amount)',
  'event BossHit(address indexed player)',
  'event TokenRewarded(address indexed player, uint256 amount)',
  'function setRelayer(address _relayer)',
  'function owner() view returns (address)',
  'function relayer() view returns (address)',
  'function token() view returns (address)'
]);

// Public client oluşturma
export const getPublicClient = () => {
  return createPublicClient({
    chain: monadTestnetChain,
    transport: http(RPC_URL)
  });
};

// Benzersiz ID oluşturma fonksiyonu
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// İşlem kuyruğunu başlatma
export const startTransactionQueue = () => {
  if (queueInterval) {
    clearInterval(queueInterval);
  }
  
  queueInterval = setInterval(processNextTransaction, 1000); // Her 1 saniyede bir işlem
  console.log('İşlem kuyruğu başlatıldı');
  
  return () => {
    if (queueInterval) {
      clearInterval(queueInterval);
      queueInterval = null;
    }
  };
};

// Kuyruktaki bir sonraki işlemi işleme
const processNextTransaction = async () => {
  if (isProcessingQueue || transactionQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  try {
    // Kuyruktaki en eski işlemi al
    const transaction = transactionQueue.find(tx => !tx.processing);
    
    if (!transaction) {
      isProcessingQueue = false;
      return;
    }
    
    // İşlemi işleniyor olarak işaretle
    transaction.processing = true;
    
    console.log(`İşlem işleniyor: ${transaction.type}, ID: ${transaction.id}`);
    
    let result;
    
    // İşlem tipine göre işlemi gerçekleştir
    if (transaction.type === 'bossHit') {
      const [playerAddress] = transaction.params;
      result = await sendBossHitToBlockchain(playerAddress);
    } else if (transaction.type === 'rewardToken') {
      const [amount, playerAddress] = transaction.params;
      result = await sendTokenRewardToBlockchain(amount, playerAddress);
    }
    
    if (result) {
      console.log(`İşlem başarılı: ${transaction.type}, ID: ${transaction.id}, TX: ${result}`);
      // İşlem başarılı oldu, kuyruktan kaldır
      transactionQueue = transactionQueue.filter(tx => tx.id !== transaction.id);
    } else {
      // İşlem başarısız oldu, yeniden deneme sayısını artır
      transaction.retryCount++;
      transaction.processing = false;
      
      if (transaction.retryCount > 3) {
        console.error(`İşlem 3 kez denendi ve başarısız oldu, kuyruktan kaldırılıyor: ${transaction.type}, ID: ${transaction.id}`);
        transactionQueue = transactionQueue.filter(tx => tx.id !== transaction.id);
      } else {
        console.warn(`İşlem başarısız oldu, yeniden denenecek: ${transaction.type}, ID: ${transaction.id}, Deneme: ${transaction.retryCount}`);
      }
    }
  } catch (error) {
    console.error('İşlem kuyruğu işlenirken hata:', error);
  } finally {
    isProcessingQueue = false;
  }
};

// Boss'a vurma işlemini doğrudan blockchain'e gönderen fonksiyon (kuyruğun kullanacağı)
const sendBossHitToBlockchain = async (playerAddress: string) => {
  try {
    // Relay API'sine istek gönder
    const response = await fetch('/api/relay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        functionName: 'bossHit',
        params: [playerAddress]
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'İşlem başarısız oldu');
    }
    
    console.log('Boss hasar kaydı başarılı:', data.transactionHash);
    return data.transactionHash;
  } catch (error) {
    console.error('Boss hasar kaydı hatası:', error);
    return null;
  }
};

// Token ödülü işlemini doğrudan blockchain'e gönderen fonksiyon (kuyruğun kullanacağı)
const sendTokenRewardToBlockchain = async (amount: number, playerAddress: string) => {
  try {
    // Miktar kontrolü
    if (amount <= 0) {
      throw new Error('Miktar 0\'dan büyük olmalıdır');
    }
    
    // Relay API'sine istek gönder
    const response = await fetch('/api/relay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        functionName: 'rewardToken',
        params: [playerAddress, amount.toString()]
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'İşlem başarısız oldu');
    }
    
    console.log('Token ödülü başarılı:', data.transactionHash);
    return data.transactionHash;
  } catch (error) {
    console.error('Token ödülü hatası:', error);
    return null;
  }
};

// Boss'a vurma işlemini kuyruğa ekleyen fonksiyon
export const recordBossDamage = async (damage: number, playerAddress: string) => {
  try {
    const transactionId = generateUniqueId();
    
    // İşlemi kuyruğa ekle
    transactionQueue.push({
      id: transactionId,
      type: 'bossHit',
      params: [playerAddress],
      timestamp: Date.now(),
      retryCount: 0,
      processing: false
    });
    
    console.log(`Boss hasar kaydı kuyruğa eklendi, ID: ${transactionId}`);
    
    // Kuyruk işlemi başlatılmamışsa başlat
    if (!queueInterval) {
      startTransactionQueue();
    }
    
    return transactionId;
  } catch (error) {
    console.error('Boss hasar kaydı kuyruğa eklenirken hata:', error);
    return null;
  }
};

// Token toplama işlemini kuyruğa ekleyen fonksiyon
export const collectToken = async (amount: number, playerAddress: string) => {
  try {
    console.log(`Token toplama işlemi başlatılıyor: ${amount} token, adres: ${playerAddress}`);
    
    // Miktar kontrolü
    if (amount <= 0) {
      throw new Error('Miktar 0\'dan büyük olmalıdır');
    }
    
    const transactionId = generateUniqueId();
    
    // İşlemi kuyruğa ekle
    transactionQueue.push({
      id: transactionId,
      type: 'rewardToken',
      params: [amount, playerAddress],
      timestamp: Date.now(),
      retryCount: 0,
      processing: false
    });
    
    console.log(`Token toplama işlemi kuyruğa eklendi, ID: ${transactionId}`);
    
    // Kuyruk işlemi başlatılmamışsa başlat
    if (!queueInterval) {
      startTransactionQueue();
    }
    
    return transactionId;
  } catch (error) {
    console.error('Token toplama kuyruğa eklenirken hata:', error);
    throw error;
  }
};

// İşlem kuyruğunu temizleme
export const clearTransactionQueue = () => {
  console.log(`İşlem kuyruğu temizleniyor. Toplam ${transactionQueue.length} işlem iptal edildi.`);
  transactionQueue = [];
};

// Cüzdan bağlama fonksiyonu
export const connectWallet = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Metamask bulunamadı. Lütfen Metamask yükleyin.');
  }
  
  try {
    // Cüzdan bağlantısı iste
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Bağlı hesabı al
    const address = accounts[0];
    
    // Ağ bilgisini al
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    
    // İşlem kuyruğunu başlat
    startTransactionQueue();
    
    return {
      address,
      chainId,
    };
  } catch (error) {
    console.error('Cüzdan bağlantı hatası:', error);
    throw error;
  }
};

// Ağ değiştirme fonksiyonu
export const switchNetwork = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Metamask bulunamadı. Lütfen Metamask yükleyin.');
  }
  
  try {
    // Önce ağı değiştirmeyi dene
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
    });
  } catch (error: any) {
    // Ağ tanımlı değilse, ağı ekle
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${CHAIN_ID.toString(16)}`,
            chainName: monadTestnetChain.name,
            nativeCurrency: monadTestnetChain.nativeCurrency,
            rpcUrls: [RPC_URL],
            blockExplorerUrls: ['https://explorer.monad.xyz'],
          },
        ],
      });
    } else {
      console.error('Ağ değiştirme hatası:', error);
      throw error;
    }
  }
  
  // Güncel ağ bilgisini al
  const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
  const chainId = parseInt(chainIdHex, 16);
  
  return {
    chainId,
  };
};

// Token gönderme işlemini gerçekleştiren fonksiyon
export const sendToken = async (recipientAddress: string, amount: number) => {
  try {
    // Miktar kontrolü
    if (amount <= 0) {
      throw new Error('Miktar 0\'dan büyük olmalıdır');
    }

    // Relay API'sine istek gönder
    const response = await fetch('/api/sendToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientAddress,
        amount: amount.toString()
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Token gönderme işlemi başarısız oldu');
    }
    
    console.log('Token gönderme başarılı:', data.transactionHash);
    return {
      success: true,
      transactionHash: data.transactionHash,
      amount: data.amount,
      symbol: data.symbol,
      decimals: data.decimals
    };
  } catch (error) {
    console.error('Token gönderme hatası:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token gönderme işlemi başarısız oldu'
    };
  }
};

// Cüzdan olaylarını dinleme
export const listenToWalletEvents = (
  onAccountsChanged: (accounts: string[]) => void,
  onChainChanged: (chainId: string) => void,
  onDisconnect: () => void
) => {
  if (typeof window === 'undefined' || !window.ethereum) return;
  
  // Hesap değişikliğini dinle
  window.ethereum.on('accountsChanged', onAccountsChanged);
  
  // Ağ değişikliğini dinle
  window.ethereum.on('chainChanged', onChainChanged);
  
  // Bağlantı kopmasını dinle
  window.ethereum.on('disconnect', onDisconnect);
  
  // Temizleme fonksiyonu
  return () => {
    window.ethereum.removeListener('accountsChanged', onAccountsChanged);
    window.ethereum.removeListener('chainChanged', onChainChanged);
    window.ethereum.removeListener('disconnect', onDisconnect);
    
    // İşlem kuyruğunu durdur
    if (queueInterval) {
      clearInterval(queueInterval);
      queueInterval = null;
    }
  };
};

// Ethereum window tipini tanımla
declare global {
  interface Window {
    ethereum: any;
  }
} 