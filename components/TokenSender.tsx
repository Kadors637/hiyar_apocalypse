import { useState } from 'react';
import { sendToken } from '@/lib/web3';

interface TokenSenderProps {
  walletAddress: string;
}

export default function TokenSender({ walletAddress }: TokenSenderProps) {
  const [amount, setAmount] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>(walletAddress);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [useCustomAddress, setUseCustomAddress] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sadece sayısal değerlere izin ver
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setAmount(value);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipientAddress(e.target.value);
  };

  const toggleAddressInput = () => {
    setUseCustomAddress(!useCustomAddress);
    // Eğer özel adres kullanımı kapatılıyorsa, bağlı cüzdan adresine geri dön
    if (useCustomAddress) {
      setRecipientAddress(walletAddress);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form doğrulama
    if (!amount || parseFloat(amount) <= 0) {
      setError('Lütfen geçerli bir miktar girin');
      return;
    }

    if (!recipientAddress || !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      setError('Lütfen geçerli bir Ethereum adresi girin');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    try {
      // Token gönderme işlemini başlat
      const result = await sendToken(recipientAddress, parseFloat(amount));
      
      if (result.success) {
        setSuccess(`${result.amount} ${result.symbol} başarıyla gönderildi!`);
        setTxHash(result.transactionHash);
        setAmount(''); // Formu temizle
      } else {
        setError(result.error || 'Token gönderme işlemi başarısız oldu');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-4">
      <h2 className="text-xl font-semibold mb-4 text-center">Token Gönder</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="recipient" className="block text-sm font-medium">
              Alıcı Adresi
            </label>
            <button 
              type="button"
              onClick={toggleAddressInput}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {useCustomAddress ? 'Bağlı Cüzdanı Kullan' : 'Farklı Adres Gir'}
            </button>
          </div>
          
          {useCustomAddress ? (
            <input
              type="text"
              id="recipient"
              value={recipientAddress}
              onChange={handleAddressChange}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          ) : (
            <>
              <input
                type="text"
                id="recipient"
                value={walletAddress}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Token, bağlı cüzdanınıza gönderilecektir
              </p>
            </>
          )}
        </div>
        
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-1">
            Miktar
          </label>
          <input
            type="text"
            id="amount"
            value={amount}
            onChange={handleAmountChange}
            placeholder="Örn: 100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? 'İşlem Yapılıyor...' : 'Token Gönder'}
        </button>
      </form>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
          {success}
          {txHash && (
            <div className="mt-2">
              <a 
                href={`https://explorer.monad.xyz/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                İşlemi Görüntüle →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 