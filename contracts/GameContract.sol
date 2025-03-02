// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
}

/**
 * @title GameContract
 * @dev Bu kontrat, oyun içi eylemleri blockchain'e kaydeder ve token ödülleri dağıtır.
 * Gasless işlemler için bir relayer kullanır.
 */
contract GameContract {
    address public owner;
    address public relayer;
    IERC20 public token; // ERC-20 Token adresi
    
    // Olaylar
    event BossHit(address indexed player);
    event TokenRewarded(address indexed player, uint256 amount);
    
    // Sadece relayer'ın çağırabileceği fonksiyonlar için modifier
    modifier onlyRelayer() {
        require(msg.sender == relayer, "Only relayer can call this function");
        _;
    }
    
    /**
     * @dev Kontrat constructor'ı
     * @param _tokenAddress Oyun tokenının adresi
     * @param _relayer Relayer'ın adresi
     */
    constructor(address _tokenAddress, address _relayer) {
        owner = msg.sender;
        relayer = _relayer;
        token = IERC20(_tokenAddress);
    }
    
    /**
     * @dev Relayer adresini günceller
     * @param _relayer Yeni relayer adresi
     */
    function setRelayer(address _relayer) external {
        require(msg.sender == owner, "Only owner can set relayer");
        relayer = _relayer;
    }
    
    /**
     * @dev Boss'a vuruş olayını kaydeder
     * @param player Vuruşu yapan oyuncunun adresi
     */
    function bossHit(address player) external onlyRelayer {
        emit BossHit(player);
    }
    
    /**
     * @dev Oyuncuya token ödülü gönderir
     * @param player Ödül alacak oyuncunun adresi
     * @param amount Gönderilecek token miktarı
     */
    function rewardToken(address player, uint256 amount) external onlyRelayer {
        require(token.transfer(player, amount), "Token transfer failed");
        emit TokenRewarded(player, amount);
    }
    
    /**
     * @dev Kontrata gönderilen tokenları çeker (acil durum için)
     * @param token Çekilecek token adresi
     * @param amount Çekilecek miktar
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
} 