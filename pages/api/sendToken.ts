import { NextApiRequest, NextApiResponse } from 'next';
import { createWalletClient, http, parseAbi, createPublicClient, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from 'viem/chains';

// Sabit değerler
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || '45fbc7f8218ef44b34bd13713625886e7c3101032ebe3f819e229429da325e01';
const RPC_URL = process.env.RPC_URL || 'https://monad-testnet.g.alchemy.com/v2/8QMlEIAdNyu3vAlf8e7XhoyRRwBiaFr5';
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '10143');
const GAME_CONTRACT_ADDRESS = (process.env.GAME_CONTRACT_ADDRESS || '0x260007742c129f6e5711bff88a03c252134726cf') as `0x${string}`;
const TOKEN_ADDRESS = (process.env.TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`; // Token adresini .env dosyasından alın

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
    const { recipientAddress, amount } = req.body;

    console.log(`Token gönderme isteği: ${amount} token, alıcı: ${recipientAddress}`);

    // Gerekli parametrelerin varlığını kontrol et
    if (!recipientAddress || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Miktar kontrolü
    const tokenAmount = BigInt(amount);
    if (tokenAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
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

    // Token bilgilerini al
    const tokenSymbol = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: TokenABI,
      functionName: 'symbol'
    });

    const tokenDecimals = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: TokenABI,
      functionName: 'decimals'
    });

    // Relayer bakiyesini kontrol et
    const relayerBalance = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: TokenABI,
      functionName: 'balanceOf',
      args: [account.address]
    });

    if (relayerBalance < tokenAmount) {
      return res.status(400).json({ 
        success: false,
        error: 'Insufficient relayer balance',
        balance: relayerBalance.toString(),
        symbol: tokenSymbol
      });
    }

    // Token transferi gerçekleştir
    const hash = await walletClient.writeContract({
      address: TOKEN_ADDRESS,
      abi: TokenABI,
      functionName: 'transfer',
      args: [recipientAddress as `0x${string}`, tokenAmount]
    });

    console.log(`İşlem hash: ${hash}`);

    // İşlemin tamamlanmasını bekle
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Başarılı yanıt döndür
    return res.status(200).json({
      success: true,
      transactionHash: receipt.transactionHash,
      amount: tokenAmount.toString(),
      symbol: tokenSymbol,
      decimals: tokenDecimals
    });
  } catch (error: any) {
    console.error('Token gönderme hatası:', error);
    
    // Daha detaylı hata mesajı
    const errorMessage = error.message || 'Transaction failed';
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
} 