import { NextApiRequest, NextApiResponse } from 'next';
import { createWalletClient, http, parseAbi, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from 'viem/chains';

// Sabit değerler
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || '45fbc7f8218ef44b34bd13713625886e7c3101032ebe3f819e229429da325e01';
const RPC_URL = process.env.RPC_URL || 'https://monad-testnet.g.alchemy.com/v2/8QMlEIAdNyu3vAlf8e7XhoyRRwBiaFr5';
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '10143');
const GAME_CONTRACT_ADDRESS = (process.env.GAME_CONTRACT_ADDRESS || '0x260007742c129f6e5711bff88a03c252134726cf') as `0x${string}`;
const TOKEN_ADDRESS = (process.env.TOKEN_ADDRESS || '0xdb0c38a272fE8E84bA50277ACC56b481861575Ec') as `0x${string}`;

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

// ERC20 Token ABI'si
const TokenABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
]);

// Monad Testnet zincir yapılandırması
const monadTestnetChain = {
  ...monadTestnet,
  id: CHAIN_ID,
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
    public: {
      http: [RPC_URL],
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // İstek gövdesini parse et
    const { functionName, params } = req.body;
    
    console.log(`Relay API çağrıldı: ${functionName}`, params);

    // Gerekli parametrelerin varlığını kontrol et
    if (!functionName || !params) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Desteklenen fonksiyonları kontrol et
    if (functionName !== 'bossHit' && functionName !== 'rewardToken') {
      return res.status(400).json({ error: 'Unsupported function' });
    }

    // Özel anahtardan hesap oluştur
    const account = privateKeyToAccount(`0x${RELAYER_PRIVATE_KEY}`);

    // Public client oluştur
    const publicClient = createPublicClient({
      chain: monadTestnetChain,
      transport: http(RPC_URL)
    });

    // Relayer adresini al
    const relayerAddress = account.address;
    console.log(`Relayer adresi: ${relayerAddress}`);

    // Wallet client oluştur
    const walletClient = createWalletClient({
      account,
      chain: monadTestnetChain,
      transport: http(RPC_URL)
    });

    // rewardToken için token bakiyesini kontrol et
    if (functionName === 'rewardToken') {
      try {
        // Oyun kontratının token adresini al
        const tokenAddressResult = await publicClient.readContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GameContractABI,
          functionName: 'token'
        });
        
        // Token adresini güvenli bir şekilde dönüştür
        const tokenAddress = tokenAddressResult as `0x${string}`;
        
        console.log(`Oyun kontratının token adresi: ${tokenAddress}`);
        
        // Oyun kontratının token bakiyesini kontrol et
        const gameContractBalance = await publicClient.readContract({
          address: tokenAddress,
          abi: TokenABI,
          functionName: 'balanceOf',
          args: [GAME_CONTRACT_ADDRESS]
        });
        
        const tokenAmount = BigInt(params[1]);
        console.log(`Oyun kontratı token bakiyesi: ${gameContractBalance}, İstenen miktar: ${tokenAmount}`);
        
        if (gameContractBalance < tokenAmount) {
          return res.status(400).json({
            success: false,
            error: `Insufficient token balance in game contract. Available: ${gameContractBalance}, Requested: ${tokenAmount}`
          });
        }
      } catch (error) {
        console.error('Token bakiyesi kontrolünde hata:', error);
        // Hata durumunda devam et, kritik değil
      }
    }

    // İşlemi gerçekleştir
    let hash: `0x${string}`;
    
    if (functionName === 'bossHit') {
      hash = await walletClient.writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GameContractABI,
        functionName: 'bossHit',
        args: [params[0] as `0x${string}`]
      });
    } else {
      hash = await walletClient.writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GameContractABI,
        functionName: 'rewardToken',
        args: [params[0] as `0x${string}`, BigInt(params[1])]
      });
    }

    console.log(`İşlem hash: ${hash}`);

    // İşlemin tamamlanmasını bekle
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Başarılı yanıt döndür
    return res.status(200).json({
      success: true,
      transactionHash: receipt.transactionHash
    });
  } catch (error: any) {
    console.error('Relay error:', error);
    
    // Daha detaylı hata mesajı
    const errorMessage = error.message || 'Transaction failed';
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
} 