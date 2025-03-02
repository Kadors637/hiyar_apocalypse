"use client";
import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { recordBossDamage, collectToken, clearTransactionQueue } from "@/lib/web3";

// Global değişkenler - uygulama genelinde tek bir instance olmasını sağlar
let globalApp: PIXI.Application | null = null;
let isInitialized = false;

const PixiSprite = ({ isGamePage = false }) => {
  const pixiContainer = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const spriteRef = useRef<PIXI.AnimatedSprite | null>(null);
  const jumpSpriteRef = useRef<PIXI.AnimatedSprite | null>(null);
  const fireSpriteRef = useRef<PIXI.AnimatedSprite | null>(null);
  const bossRef = useRef<PIXI.AnimatedSprite | null>(null);
  const bossAngryRef = useRef<PIXI.AnimatedSprite | null>(null);
  const bossIsAngryRef = useRef(false);
  const bossAngryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const groundRef = useRef<PIXI.TilingSprite | null>(null);
  const containerRef = useRef<PIXI.Container | null>(null);
  const bulletsRef = useRef<PIXI.Sprite[]>([]);
  const bulletTextureRef = useRef<PIXI.Texture | null>(null);
  const goldTextureRef = useRef<PIXI.Texture | null>(null);
  const coinsRef = useRef<PIXI.Sprite[]>([]);
  const bossHealthRef = useRef(1000000);
  const playerHealthRef = useRef(100);
  const healthBarRef = useRef<PIXI.Graphics | null>(null);
  const playerHealthBarRef = useRef<PIXI.Graphics | null>(null);
  const healthBarContainerRef = useRef<PIXI.Container | null>(null);
  const playerHealthBarContainerRef = useRef<PIXI.Container | null>(null);
  const mainContainerRef = useRef<PIXI.Container | null>(null);
  const isMovingLeftRef = useRef(false);
  const isMovingRightRef = useRef(false);
  const isJumpingRef = useRef(false);
  const isFiringRef = useRef(false);
  const jumpVelocityRef = useRef(0);
  const jumpCountRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fireTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fireIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const damageTextsRef = useRef<PIXI.Text[]>([]);
  const ammoRef = useRef(12);
  const isReloadingRef = useRef(false);
  const ammoTextRef = useRef<PIXI.Text | null>(null);
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bossBulletsRef = useRef<PIXI.Sprite[]>([]);
  const bossFireIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deathSpriteRef = useRef<PIXI.AnimatedSprite | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const gameOverContainerRef = useRef<PIXI.Container | null>(null);
  const [showHtmlButton, setShowHtmlButton] = useState(false);
  // Oyunun aktif olup olmadığını kontrol eden değişken
  const gameActiveRef = useRef(true);
  // Turşu platformları için referans
  const platformsRef = useRef<PIXI.Sprite[]>([]);
  const platformTextureRef = useRef<PIXI.Texture | null>(null);
  const chainTextureRef = useRef<PIXI.Texture | null>(null);
  // Karakter bir platform üzerinde mi?
  const isOnPlatformRef = useRef(false);
  // Aktif platform referansı
  const currentPlatformRef = useRef<PIXI.Sprite | null>(null);
  // Ok referansları
  const arrowsRef = useRef<PIXI.Sprite[]>([]);
  const arrowTextureRef = useRef<PIXI.Texture | null>(null);
  const arrowSpawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFireTimeRef = useRef(0);

  // Hareket fonksiyonları
  const startMovingLeft = () => {
    if (!spriteRef.current || !gameActiveRef.current || isDead || showGameOver) return;
    isMovingLeftRef.current = true;
    spriteRef.current.scale.x = -Math.abs(spriteRef.current.scale.x);
    if (jumpSpriteRef.current) {
      jumpSpriteRef.current.scale.x = -Math.abs(jumpSpriteRef.current.scale.x);
    }
    startAnimation();
  };

  const startMovingRight = () => {
    if (!spriteRef.current || !gameActiveRef.current || isDead || showGameOver) return;
    isMovingRightRef.current = true;
    spriteRef.current.scale.x = Math.abs(spriteRef.current.scale.x);
    if (jumpSpriteRef.current) {
      jumpSpriteRef.current.scale.x = Math.abs(jumpSpriteRef.current.scale.x);
    }
    startAnimation();
  };

  const stopMovingLeft = () => {
    if (!spriteRef.current || !gameActiveRef.current || isDead || showGameOver) return;
    isMovingLeftRef.current = false;
    if (!isMovingRightRef.current) {
      stopAnimation();
    }
  };

  const stopMovingRight = () => {
    if (!spriteRef.current || !gameActiveRef.current || isDead || showGameOver) return;
    isMovingRightRef.current = false;
    if (!isMovingLeftRef.current) {
      stopAnimation();
    }
  };

  const startAnimation = () => {
    if (!spriteRef.current || spriteRef.current.playing || !gameActiveRef.current || isDead || showGameOver) return;
    spriteRef.current.play();
  };

  const stopAnimation = () => {
    if (!spriteRef.current || !gameActiveRef.current || isDead || showGameOver) return;
    
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    animationTimeoutRef.current = setTimeout(() => {
      if (spriteRef.current && !isMovingLeftRef.current && !isMovingRightRef.current) {
        spriteRef.current.stop();
        spriteRef.current.gotoAndStop(0);
      }
    }, 100);
  };

  // Zıplama fonksiyonları
  const startJump = () => {
    if (!containerRef.current || !gameActiveRef.current || isDead || showGameOver) return;
    
    // Eğer yerdeyse veya ilk zıplama yapıldıysa ve ikinci zıplama hakkı varsa
    if (!isJumpingRef.current || (isJumpingRef.current && jumpCountRef.current < 1)) {
      // Eğer ilk zıplama ise
      if (!isJumpingRef.current) {
        isJumpingRef.current = true;
        jumpCountRef.current = 0; // İlk zıplama
      } else {
        jumpCountRef.current = 1; // İkinci zıplama
      }
      
      jumpVelocityRef.current = -10; // Zıplama hızını -15'ten -10'a düşürdüm
      
      if (jumpSpriteRef.current && spriteRef.current) {
        const direction = isMovingLeftRef.current ? -1 : isMovingRightRef.current ? 1 : Math.sign(spriteRef.current.scale.x);
        spriteRef.current.visible = false;
        jumpSpriteRef.current.visible = true;
        jumpSpriteRef.current.scale.x = Math.abs(jumpSpriteRef.current.scale.x) * direction;
        jumpSpriteRef.current.play();
      }
      
      // Platform üzerinde değiliz artık
      isOnPlatformRef.current = false;
      currentPlatformRef.current = null;
    }
  };

  const updateJump = () => {
    if (!containerRef.current || !containerRef.current.position || !appRef.current || !gameActiveRef.current || isDead || showGameOver) return;

    const gravity = 0.3; // Yerçekimini 0.5'ten 0.3'e düşürdüm
    
    // Eğer bir platform üzerinde değilsek yerçekimi uygula
    if (!isOnPlatformRef.current) {
      jumpVelocityRef.current += gravity;
    }
    
    const nextY = containerRef.current.y + jumpVelocityRef.current;
    const groundY = (appRef.current.screen.height || 0) - 130;

    // Platform çarpışma kontrolü
    let platformCollision = false;
    
    // Eğer karakter aşağı doğru düşüyorsa (pozitif hız) platform kontrolü yap
    if (jumpVelocityRef.current > 0) {
      for (const platform of platformsRef.current) {
        // Platformun üst kısmı ile çarpışma kontrolü - çarpışma alanını genişlettim
        if (nextY >= platform.y - 40 && 
            containerRef.current.y < platform.y - 20 && 
            Math.abs(containerRef.current.x - platform.x) < platform.width / 1.5) { // Çarpışma alanını genişlettim
          
          // Platform üzerine yerleştir
          containerRef.current.y = platform.y - 40; // Karakter pozisyonunu düzelttim
          isJumpingRef.current = false;
          jumpVelocityRef.current = 0;
          jumpCountRef.current = 0; // Zıplama sayısını sıfırla
          isOnPlatformRef.current = true;
          currentPlatformRef.current = platform;
          
          if (jumpSpriteRef.current && spriteRef.current) {
            jumpSpriteRef.current.stop();
            jumpSpriteRef.current.visible = false;
            spriteRef.current.visible = true;
            // Yere inerken son hareket yönünü koru
            const direction = isMovingLeftRef.current ? -1 : isMovingRightRef.current ? 1 : Math.sign(jumpSpriteRef.current.scale.x);
            spriteRef.current.scale.x = Math.abs(spriteRef.current.scale.x) * direction;
          }
          
          platformCollision = true;
          break;
        }
      }
    }
    
    // Eğer platform ile çarpışma yoksa normal zemin kontrolü yap
    if (!platformCollision) {
      if (nextY >= groundY) {
        containerRef.current.y = groundY;
        isJumpingRef.current = false;
        jumpVelocityRef.current = 0;
        jumpCountRef.current = 0; // Zıplama sayısını sıfırla
        isOnPlatformRef.current = false;
        currentPlatformRef.current = null;
        
        if (jumpSpriteRef.current && spriteRef.current) {
          jumpSpriteRef.current.stop();
          jumpSpriteRef.current.visible = false;
          spriteRef.current.visible = true;
          // Yere inerken son hareket yönünü koru
          const direction = isMovingLeftRef.current ? -1 : isMovingRightRef.current ? 1 : Math.sign(jumpSpriteRef.current.scale.x);
          spriteRef.current.scale.x = Math.abs(spriteRef.current.scale.x) * direction;
        }
      } else {
        containerRef.current.y = nextY;
      }
    }
    
    // Eğer platform üzerindeyken hareket ediyorsak, platformdan düşüp düşmediğimizi kontrol et
    if (isOnPlatformRef.current && currentPlatformRef.current) {
      const platform = currentPlatformRef.current;
      if (Math.abs(containerRef.current.x - platform.x) > platform.width / 1.5) { // Düşme alanını genişlettim
        isOnPlatformRef.current = false;
        currentPlatformRef.current = null;
        isJumpingRef.current = true;
        jumpVelocityRef.current = 0.1; // Hafif bir düşüş hızı başlat
      }
    }
  };

  const createBullet = () => {
    if (!containerRef.current || !appRef.current || !bulletTextureRef.current) return;
    
    const bullet = new PIXI.Sprite(bulletTextureRef.current);
    bullet.anchor.set(0.5); // Merkezden döndürmek için
    
    // Merminin başlangıç pozisyonu
    bullet.x = containerRef.current.x;
    bullet.y = containerRef.current.y;

    // Mermi yönü (karakterin baktığı yön)
    const direction = Math.sign(spriteRef.current?.scale.x || 1);
    bullet.scale.x = direction * 0.05; // Mermi boyutunu küçült
    bullet.scale.y = 0.05; // Mermi boyutunu küçült
    
    // Mermiyi karakterin baktığı yöne göre döndür
    if (direction > 0) { // Sağa bakarken
      bullet.rotation = Math.PI; // 180 derece döndür
    }
    
    // Mermiyi sahneye ekle
    appRef.current.stage.addChild(bullet);
    bulletsRef.current.push(bullet);

    // Mermi hareketi
    const bulletSpeed = 15; // Mermi hızını artırdım (10'dan 15'e)
    const updateBullet = () => {
      // Mermi veya app yoksa veya mermi yok edildiyse işlemi durdur
      if (!bullet || !appRef.current || bullet.destroyed) return;

      bullet.x += bulletSpeed * direction;

      // Boss ile çarpışma kontrolü
      if (bossRef.current && 
          bullet.x > bossRef.current.x - bossRef.current.width/2 && 
          bullet.x < bossRef.current.x + bossRef.current.width/2 &&
          bullet.y > bossRef.current.y - bossRef.current.height/2 &&
          bullet.y < bossRef.current.y + bossRef.current.height/2) {
        
        // Mermi yok edilmeden önce pozisyonunu kaydet
        const bulletX = bullet.x;
        const bulletY = bullet.y;
        
        // Önce ticker'dan kaldır
        if (appRef.current?.ticker) {
          appRef.current.ticker.remove(updateBullet);
        }

        // Sonra mermiyi listeden çıkar
        bulletsRef.current = bulletsRef.current.filter(b => b !== bullet);

        // En son mermiyi temizle (eğer hala yok edilmediyse)
        if (!bullet.destroyed && appRef.current && appRef.current.stage) {
          try {
            appRef.current.stage.removeChild(bullet);
            bullet.destroy();
          } catch (error) {
            console.warn("Mermi temizlenirken hata:", error);
          }
        }
        
        // Merminin verdiği hasar (minimum 1 can kalacak)
        const oldHealth = bossHealthRef.current;
        bossHealthRef.current = Math.max(1, bossHealthRef.current - 0.5);
        const damage = oldHealth - bossHealthRef.current;
        
        // Akıllı kontrata boss hasar bilgisini gönder
        const playerAddress = localStorage.getItem('walletAddress');
        if (playerAddress) {
          // Boss'a vurma işlemini blockchain'e kaydet
          recordBossDamage(damage, playerAddress)
            .then(txHash => {
              if (txHash) {
                console.log('Boss hasar kaydı başarılı, TX:', txHash);
              }
            })
            .catch(error => {
              console.error('Boss hasar kaydı başarısız:', error);
            });
        }
        
        // Boss'u kızgın moduna geçir
        if (!bossIsAngryRef.current && bossAngryRef.current && bossRef.current) {
          bossIsAngryRef.current = true;
          
          // Normal boss'u gizle, kızgın boss'u göster
          bossRef.current.visible = false;
          bossAngryRef.current.visible = true;
          bossAngryRef.current.play();
          
          // 3 saniye sonra normal haline dön
          if (bossAngryTimeoutRef.current) {
            clearTimeout(bossAngryTimeoutRef.current);
          }
          
          bossAngryTimeoutRef.current = setTimeout(() => {
            if (bossRef.current && bossAngryRef.current) {
              bossIsAngryRef.current = false;
              bossRef.current.visible = true;
              bossAngryRef.current.visible = false;
              bossRef.current.play();
            }
          }, 3000);
        }
        
        // Rastgele bir X konumunda altın oluştur
        if (appRef.current) {
          const randomX = Math.random() * (appRef.current.screen.width - 100) + 50;
          createFallingCoin(randomX);
        }
        
        // Hasar göstergesini oluştur (kaydedilen pozisyonu kullan)
        createDamageText(bulletX, bulletY - 20, damage);
        
        // Can barını güncelle
        if (healthBarRef.current) {
          healthBarRef.current.clear();
          const healthPercent = bossHealthRef.current / 1000000;
          const healthBarWidth = healthPercent * 200;
          
          // Gradient renk (kırmızıdan koyu kırmızıya)
          const color = Math.floor(healthPercent * 255);
          const r = Math.min(255, Math.max(180, color + 180));
          const barColor = (r << 16) | ((color * 0.2) << 8);
          
          healthBarRef.current.beginFill(barColor);
          healthBarRef.current.drawRoundedRect(0, 15, healthBarWidth, 20, 10);
          healthBarRef.current.endFill();

          // Parlama efekti
          if (healthBarWidth > 0) {
            healthBarRef.current.lineStyle(1, 0xff6666, 0.3);
            healthBarRef.current.moveTo(0, 16);
            healthBarRef.current.lineTo(healthBarWidth, 16);
          }
        }
        
        return;
      }

      // Ekran dışına çıkma kontrolü
      if (bullet.x < 0 || bullet.x > (appRef.current?.screen.width || 0)) {
        // Önce ticker'dan kaldır
        if (appRef.current?.ticker) {
          appRef.current.ticker.remove(updateBullet);
        }

        // Sonra mermiyi listeden çıkar
        bulletsRef.current = bulletsRef.current.filter(b => b !== bullet);

        // En son mermiyi temizle (eğer hala yok edilmediyse)
        if (!bullet.destroyed && appRef.current && appRef.current.stage) {
          try {
            appRef.current.stage.removeChild(bullet);
            bullet.destroy();
          } catch (error) {
            console.warn("Mermi temizlenirken hata:", error);
          }
        }
      }
    };

    appRef.current.ticker.add(updateBullet);
  };

  // Ateş etme fonksiyonları
  const startFiring = () => {
    if (!containerRef.current || 
        isFiringRef.current || 
        isJumpingRef.current || 
        isMovingLeftRef.current || 
        isMovingRightRef.current ||
        isReloadingRef.current ||
        ammoRef.current <= 0 ||
        !gameActiveRef.current ||
        isDead ||
        showGameOver) return;
    
    isFiringRef.current = true;
    
    const fire = () => {
      if (ammoRef.current <= 0 || !gameActiveRef.current || isDead || showGameOver) {
        // Mermi bitti, reload başlat
        if (!isDead && !showGameOver && gameActiveRef.current) {
          startReload();
        }
        return;
      }

      if (fireSpriteRef.current && spriteRef.current) {
        // Mermi sayısını azalt
        ammoRef.current--;
        updateAmmoText();

        // Mevcut yönü koru
        const direction = Math.sign(spriteRef.current.scale.x);
        spriteRef.current.visible = false;
        fireSpriteRef.current.visible = true;
        fireSpriteRef.current.scale.x = Math.abs(fireSpriteRef.current.scale.x) * direction;
        fireSpriteRef.current.gotoAndPlay(0);

        // Mermi oluştur
        createBullet();

        if (fireSpriteRef.current) {
          fireSpriteRef.current.onComplete = () => {
            if (fireSpriteRef.current) {
              fireSpriteRef.current.gotoAndStop(fireSpriteRef.current.totalFrames - 1);
            }
          };
        }
      }
    };

    // İlk atışı hemen yap
    fire();

    // Sürekli ateş etme için interval başlat - 1 saniyede bir ateş etsin
    fireIntervalRef.current = setInterval(() => {
      if (ammoRef.current > 0 && !isReloadingRef.current && gameActiveRef.current && !isDead && !showGameOver) {
        fire();
      }
    }, 1000); // 500ms'den 1000ms'ye değiştirildi (1 saniye)
    
    // 2 saniye sonra ateş etmeyi durdur
    fireTimeoutRef.current = setTimeout(() => {
      stopFiring();
    }, 2000);
  };

  const startReload = () => {
    if (isReloadingRef.current || ammoRef.current >= 12 || !gameActiveRef.current || isDead || showGameOver) return;
    
    isReloadingRef.current = true;
    stopFiring();
    
    if (ammoTextRef.current) {
      ammoTextRef.current.text = "RELOAD";
      ammoTextRef.current.style.fill = '#ff0000'; // Reload sırasında kırmızı renk
    }
    
    // 2 saniye sonra mermileri yenile
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }
    
    reloadTimeoutRef.current = setTimeout(() => {
      if (!gameActiveRef.current || isDead || showGameOver) return;
      
      ammoRef.current = 12;
      isReloadingRef.current = false;
      if (ammoTextRef.current) {
        ammoTextRef.current.style.fill = '#ffffff'; // Normal renk
      }
      updateAmmoText();
    }, 2000);
  };

  const updateAmmoText = () => {
    if (ammoTextRef.current) {
      if (!isReloadingRef.current) {
        ammoTextRef.current.text = `${ammoRef.current}/12`;
      }
    }
  };

  const stopFiring = () => {
    if (!fireSpriteRef.current || !spriteRef.current) return;
    
    // Interval'i temizle
    if (fireIntervalRef.current !== null) {
      clearInterval(fireIntervalRef.current);
      fireIntervalRef.current = null;
    }
    
    // Timeout'u temizle
    if (fireTimeoutRef.current !== null) {
      clearTimeout(fireTimeoutRef.current);
      fireTimeoutRef.current = null;
    }

    fireSpriteRef.current.stop();
    fireSpriteRef.current.visible = false;
    spriteRef.current.visible = true;
    isFiringRef.current = false;
  };

  // Hasar göstergesi oluşturma fonksiyonu
  const createDamageText = (x: number, y: number, damage: number) => {
    if (!appRef.current || !mainContainerRef.current) return;

    const damageText = new PIXI.Text(`-${damage}`, {
      fontFamily: 'Arial',
      fontSize: 24,
      fill: 0xff0000,
      fontWeight: 'bold',
      stroke: 0xffffff,
      strokeThickness: 4
    });

    damageText.x = x;
    damageText.y = y;
    mainContainerRef.current.addChild(damageText);
    damageTextsRef.current.push(damageText);

    // Hasar yazısı animasyonu
    let elapsed = 0;
    const animate = () => {
      elapsed += 0.1;
      damageText.alpha = Math.max(0, 1 - elapsed);
      damageText.y -= 1;

      if (elapsed >= 1) {
        appRef.current?.ticker.remove(animate);
        mainContainerRef.current?.removeChild(damageText);
        damageTextsRef.current = damageTextsRef.current.filter(t => t !== damageText);
        damageText.destroy();
      }
    };

    appRef.current.ticker.add(animate);
  };

  // Altın oluşturma ve düşürme fonksiyonu
  const createFallingCoin = (x: number) => {
    if (!appRef.current || !goldTextureRef.current || !mainContainerRef.current) return;

    const coin = new PIXI.Sprite(goldTextureRef.current);
    coin.anchor.set(0.5);
    coin.x = x;
    coin.y = -50; // Ekranın üstünden başla
    coin.scale.set(0.05); // Boyutu küçülttüm
    coin.zIndex = -1; // Karakterin arkasında kalacak

    // Coini ana container yerine mainContainer'a ekle (karakterin arkasında kalması için)
    mainContainerRef.current.addChildAt(coin, 1); // 1. indekse ekle (arka plan ve zemin arasına)
    coinsRef.current.push(coin);

    let velocity = 0;
    const gravity = 0.5;
    const maxFallSpeed = 15;
    const rotationSpeed = 0.1;
    let isGrounded = false;

    const updateCoin = () => {
      // Coin veya container yoksa işlemi durdur
      if (!coin || !coin.position || coin.destroyed || !mainContainerRef.current) return;
      
      // Karakter ile çarpışma kontrolü
      if (containerRef.current && 
          Math.abs((coin.x) - (containerRef.current.x)) < 50 && // Çarpışma alanını artırdım
          Math.abs((coin.y) - (containerRef.current.y + containerRef.current.height/4)) < 50) { // Dikey çarpışma alanını ayarladım
        // Altın toplandı
        console.log("deydi");
        
        // Token toplama işlemini blockchain'e kaydet
        const playerAddress = localStorage.getItem("walletAddress");
        if (playerAddress) {
          // Rastgele bir token miktarı (1-10 arası)
          const tokenAmount = Math.floor(Math.random() * 10) + 1;
          
          collectToken(tokenAmount, playerAddress)
            .then(txHash => {
              if (txHash) {
                console.log(`${tokenAmount} token kazanıldı, işlem: ${txHash}`);
              }
            })
            .catch(error => {
              console.error("Token toplama hatası:", error);
              // Hata durumunda sessizce devam et, oyun akışını bozma
            });
        }
        
        // Önce ticker'dan kaldır
        if (appRef.current?.ticker) {
          appRef.current.ticker.remove(updateCoin);
        }
        
        // Sonra coini listeden çıkar
        coinsRef.current = coinsRef.current.filter(c => c !== coin);
        
        // En son coini temizle (eğer hala yok edilmediyse)
        if (!coin.destroyed && mainContainerRef.current) {
          try {
            mainContainerRef.current.removeChild(coin);
            coin.destroy();
          } catch (error) {
            console.warn("Altın temizlenirken hata:", error);
          }
        }
        
        return;
      }

      if (!isGrounded) {
        velocity = Math.min(velocity + gravity, maxFallSpeed);
        coin.y += velocity;
        coin.rotation += rotationSpeed;
      }

      // Yere çarptığında
      if (!isGrounded && appRef.current && coin.y > appRef.current.screen.height - 100) {
        coin.y = appRef.current.screen.height - 100; // Zemine sabitle
        isGrounded = true;
        velocity = 0;
      }
    };

    appRef.current.ticker.add(updateCoin);
  };

  // Boss ateş etme fonksiyonu
  const createBossBullet = (angle: number, heightPosition: string) => {
    if (!appRef.current || !bulletTextureRef.current || !bossRef.current || !mainContainerRef.current) return;
    
    const bullet = new PIXI.Sprite(bulletTextureRef.current);
    bullet.anchor.set(0.5);
    bullet.scale.set(0.05);
    
    // Boss'un x pozisyonu
    bullet.x = bossRef.current.x - bossRef.current.width/2;
    
    // Yükseklik pozisyonuna göre y değerini ayarla
    if (heightPosition === 'top') {
      bullet.y = bossRef.current.y - bossRef.current.height/3; // Üst kısım
    } else if (heightPosition === 'bottom') {
      bullet.y = bossRef.current.y + bossRef.current.height/6; // Alt kısım - daha yukarıdan ateş etsin
    } else {
      bullet.y = bossRef.current.y; // Orta kısım (varsayılan)
    }
    
    // Mermi rotasyonunu düzelt - sola doğru bakması için
    bullet.rotation = 0; // Düz bakması için 0 olarak ayarla
    
    mainContainerRef.current.addChild(bullet);
    bossBulletsRef.current.push(bullet);
    
    const bulletSpeed = 12;
    const updateBullet = () => {
      // Mermi veya app yoksa veya mermi yok edildiyse veya pozisyon yoksa işlemi durdur
      if (!bullet || !appRef.current || bullet.destroyed || !bullet.position || !containerRef.current || !containerRef.current.position) return;

      bullet.x -= bulletSpeed;
      // Y pozisyonunu değiştirme - düz gitsin
      // bullet.y += bulletSpeed * Math.sin(angle) * 0.5; - Bu satırı kaldırdım
      
      // Karakter ile çarpışma kontrolü
      if (Math.abs(bullet.x - containerRef.current.x) < 30 && 
          Math.abs(bullet.y - containerRef.current.y) < 30 && 
          !isDead) {
        
        // Önce ticker'dan kaldır
        if (appRef.current?.ticker) {
          appRef.current.ticker.remove(updateBullet);
        }

        // Sonra mermiyi listeden çıkar
        bossBulletsRef.current = bossBulletsRef.current.filter(b => b !== bullet);

        // En son mermiyi temizle (eğer hala yok edilmediyse)
        if (!bullet.destroyed && mainContainerRef.current) {
          try {
            mainContainerRef.current.removeChild(bullet);
            bullet.destroy({ children: true, texture: false, baseTexture: false });
          } catch (error) {
            console.warn("Boss mermisi temizlenirken hata:", error);
          }
        }

        // Karakter öldü
        setIsDead(true);
        stopBossFiring();
        playerHealthRef.current = 0;

        // Tüm karakter sprite'larını gizle
        if (containerRef.current) {
          if (spriteRef.current) spriteRef.current.visible = false;
          if (jumpSpriteRef.current) jumpSpriteRef.current.visible = false;
          if (fireSpriteRef.current) fireSpriteRef.current.visible = false;

          // Death sprite'ını yükle ve oynat
          PIXI.Assets.load('/character_death.png').then(deathTexture => {
            fetch('/character_death.json')
              .then(res => res.json())
              .then(deathAtlasData => {
                // Death frame'lerini oluştur
                const deathFrames = [];
                for (let i = 0; i <= 4; i++) {
                  const frameName = `frame_${i}`;
                  const frameData = deathAtlasData.frames[frameName];
                  if (frameData) {
                    console.log(`Death frame ${i} yükleniyor:`, frameData);
                    const texture = new PIXI.Texture(
                      deathTexture,
                      new PIXI.Rectangle(
                        frameData.frame.x,
                        frameData.frame.y,
                        frameData.frame.w,
                        frameData.frame.h
                      )
                    );
                    deathFrames.push(texture);
                  }
                }

                console.log(`Toplam ${deathFrames.length} death frame yüklendi`);

                // Death sprite'ını oluştur ve ayarla
                const deathSprite = new PIXI.AnimatedSprite(deathFrames);
                deathSprite.anchor.set(0.5);
                deathSprite.scale.set(0.5);
                deathSprite.animationSpeed = 0.1;
                deathSprite.loop = false;
                deathSpriteRef.current = deathSprite;

                // Sprite'ın yönünü ayarla
                if (spriteRef.current) {
                  deathSprite.scale.x = Math.abs(deathSprite.scale.x) * Math.sign(spriteRef.current.scale.x);
                }

                // Sprite'ı container'a eklemeden önce pozisyonunu ayarla
                deathSprite.x = 0;
                deathSprite.y = 0;
                deathSprite.visible = true; // Görünürlüğü açıkça belirt
                deathSprite.alpha = 1; // Opaklığı tam ayarla

                // Diğer sprite'ları gizle ve death sprite'ı ekle
                if (containerRef.current) {
                  if (spriteRef.current) spriteRef.current.visible = false;
                  if (jumpSpriteRef.current) jumpSpriteRef.current.visible = false;
                  if (fireSpriteRef.current) fireSpriteRef.current.visible = false;
                  
                  // Önce varsa eski death sprite'ı kaldır
                  if (deathSpriteRef.current && deathSpriteRef.current !== deathSprite) {
                    containerRef.current.removeChild(deathSpriteRef.current);
                  }
                  
                  containerRef.current.addChild(deathSprite);
                }

                console.log("Death sprite oluşturuldu ve eklendi");

                // Animasyonu oynat ve bitince 1. karede kal
                deathSprite.onComplete = () => {
                  if (deathSprite && !deathSprite.destroyed) {
                    console.log("Death animasyonu tamamlandı");
                    deathSprite.gotoAndStop(1);
                    deathSprite.visible = true;
                    deathSprite.alpha = 1;
                    
                    // Container'ı güncelle
                    if (containerRef.current) {
                      containerRef.current.setChildIndex(deathSprite, containerRef.current.children.length - 1);
                    }
                  }
                };

                console.log("death çalıştı");
                deathSprite.play();
              });
          });
        }
        
        return;
      }
      
      // Ekran dışına çıkma kontrolü
      if (bullet.x < 0 || bullet.x > (appRef.current?.screen.width || 0) || 
          bullet.y < 0 || bullet.y > (appRef.current?.screen.height || 0)) {
        // Önce ticker'dan kaldır
        if (appRef.current?.ticker) {
          appRef.current.ticker.remove(updateBullet);
        }

        // Sonra mermiyi listeden çıkar
        bossBulletsRef.current = bossBulletsRef.current.filter(b => b !== bullet);

        // En son mermiyi temizle (eğer hala yok edilmediyse)
        if (!bullet.destroyed && mainContainerRef.current) {
          try {
            mainContainerRef.current.removeChild(bullet);
            bullet.destroy({ children: true, texture: false, baseTexture: false });
          } catch (error) {
            console.warn("Boss mermisi temizlenirken hata:", error);
          }
        }
      }
    };
    
    appRef.current.ticker.add(updateBullet);
  };

  // Boss'un ateş etmeye başlaması
  const startBossFiring = () => {
    if (bossFireIntervalRef.current) return;
    
    // Ateş etme sırası için sayaç
    let fireCounter = 0;
    
    const fire = () => {
      // Her ateş etmede farklı bir yükseklik kullan
      const heightPositions = ['top', 'middle', 'bottom'];
      const currentPosition = heightPositions[fireCounter % 3];
      
      // Düz ateş et
      createBossBullet(0, currentPosition);
      
      // Sayacı artır
      fireCounter++;
    };
    
    // Her 1 saniyede bir ateş et
    fire();
    bossFireIntervalRef.current = setInterval(fire, 1000);
  };

  // Boss'un ateş etmeyi durdurması
  const stopBossFiring = () => {
    if (bossFireIntervalRef.current) {
      clearInterval(bossFireIntervalRef.current);
      bossFireIntervalRef.current = null;
    }
    
    // Mevcut mermileri temizle
    bossBulletsRef.current.forEach(bullet => {
      if (mainContainerRef.current) {
        mainContainerRef.current.removeChild(bullet);
        bullet.destroy();
      }
    });
    bossBulletsRef.current = [];
  };

  // Turşu platformlarını oluştur
  const createPicklePlatforms = () => {
    if (!mainContainerRef.current) return;
    
    // Ekran boyutlarını al
    const screenWidth = appRef.current?.screen.width || 800;
    const screenHeight = appRef.current?.screen.height || 600;
    
    // Platform Y pozisyonu (ekranın 2/3'ü)
    const platformY = (screenHeight / 3) * 2;
    
    // Platform pozisyonları: sol, sağ ve çapraz üst platform
    const platformPositions = [
      { x: screenWidth / 3, y: platformY },                  // Sol platform
      { x: (screenWidth / 3) * 2, y: platformY },            // Sağ platform
      { x: screenWidth / 2, y: platformY - 150 }             // Çapraz üst platform (zıplama mesafesinde)
    ];
    
    // Her platform için platform ve zincir oluştur
    platformPositions.forEach(position => {
      // Zincir görüntüsünü yükle ve ekle (sadece görsel amaçlı)
      try {
        PIXI.Assets.load('/chain.png').then(chainTexture => {
          // Zincir sprite'ı oluştur
          const chain = new PIXI.Sprite(chainTexture);
          chain.anchor.set(0.5, 1);  // Alt orta noktadan hizala (0,1 yerine 0.5,1)
          chain.x = position.x;
          chain.y = position.y + 25;  // Platformun daha altında bitir (8 piksel yerine 25 piksel)
          chain.height = position.y + 25;  // Ekranın üstünden platformun daha altına kadar
          chain.scale.set(0.25, 1);  // Genişliği biraz artır (0.2'den 0.25'e)
          
          // Zinciri ana konteynere ekle (platformların arkasında olacak)
          mainContainerRef.current?.addChild(chain);
        }).catch(error => {
          console.warn("Zincir texture'ı yüklenemedi");
        });
      } catch (error) {
        console.warn("Zincir texture'ı yüklenemedi");
      }
      
      // Platform sprite'ı oluştur
      try {
        // Platform texture'ını yüklemeyi dene
        PIXI.Assets.load('/pickel_platform.png').then(platformTexture => {
          const platform = new PIXI.Sprite(platformTexture);
          platform.anchor.set(0.5, 0.5);
          platform.x = position.x;
          platform.y = position.y;
          platform.scale.set(0.08); // Boyutu çok daha küçülttüm (0.15'ten 0.08'e)
          mainContainerRef.current?.addChild(platform);
          
          // Platformu listeye ekle
          platformsRef.current.push(platform);
        }).catch(error => {
          console.warn("Platform texture'ı yüklenemedi, yerine çizim kullanılacak");
          createFallbackPlatform(position.x, position.y);
        });
      } catch (error) {
        console.warn("Platform texture'ı yüklenemedi, yerine çizim kullanılacak");
        createFallbackPlatform(position.x, position.y);
      }
    });
  };

  // Yedek platform oluşturma fonksiyonu
  const createFallbackPlatform = (x: number, y: number) => {
    if (!mainContainerRef.current) return;
    
    // Texture yoksa yeşil bir oval çiz
    const platform = new PIXI.Graphics();
    platform.beginFill(0x33CC33);
    platform.drawEllipse(0, 0, 12, 4); // Boyutu çok daha küçülttüm (20,7'den 12,4'e)
    platform.endFill();
    
    // Kenar çizgisi ekle
    platform.lineStyle(0.5, 0x006600); // Çizgi kalınlığını da azalttım (1'den 0.5'e)
    platform.drawEllipse(0, 0, 12, 4); // Boyutu çok daha küçülttüm
    
    // Turşu deseni ekle
    platform.lineStyle(0.3, 0x006600, 0.5); // Çizgi kalınlığını da azalttım (0.5'ten 0.3'e)
    for (let i = -8; i <= 8; i += 4) { // Aralığı çok daha küçülttüm (-15,15'ten -8,8'e) ve adımı azalttım (6'dan 4'e)
      platform.moveTo(i, -3); // Y değerini çok daha küçülttüm (-5'ten -3'e)
      platform.lineTo(i + 1, 3); // Y değerini çok daha küçülttüm (5'ten 3'e) ve X ofsetini azalttım (2'den 1'e)
    }
    
    platform.x = x;
    platform.y = y;
    mainContainerRef.current?.addChild(platform);
    
    // Platformu listeye ekle
    platformsRef.current.push(platform as unknown as PIXI.Sprite);
  };

  // Oyunu yeniden başlatma fonksiyonu
  const restartGame = () => {
    // İşlem kuyruğunu temizle
    clearTransactionQueue();
    
    // HTML butonunu gizle
    setShowHtmlButton(false);
    
    // Sayfayı yenile
    window.location.reload();
    
    // Aşağıdaki kodlar sayfanın yenilenmesi durumunda çalışmayacak,
    // ancak yenileme işlemi başarısız olursa yedek olarak kalsın
    
    // Oyun durumunu sıfırla
    setIsDead(false);
    setShowGameOver(false);
    gameActiveRef.current = true;
    playerHealthRef.current = 100;
    bossHealthRef.current = 1000000;
    ammoRef.current = 12;
    isReloadingRef.current = false;
    isMovingLeftRef.current = false;
    isMovingRightRef.current = false;
    isJumpingRef.current = false;
    isFiringRef.current = false;
    jumpVelocityRef.current = 0;
    isOnPlatformRef.current = false;
    currentPlatformRef.current = null;
    lastFireTimeRef.current = 0; // Son ateş etme zamanını sıfırla

    // Karakteri başlangıç pozisyonuna getir
    if (containerRef.current && appRef.current) {
      containerRef.current.x = appRef.current.screen.width / 2;
      containerRef.current.y = appRef.current.screen.height - 130;
    }

    // Sprite'ları görünür yap ve sıfırla
    if (spriteRef.current) {
      spriteRef.current.visible = true;
      spriteRef.current.gotoAndStop(0);
    }
    if (jumpSpriteRef.current) {
      jumpSpriteRef.current.visible = false;
      jumpSpriteRef.current.gotoAndStop(0);
    }
    if (fireSpriteRef.current) {
      fireSpriteRef.current.visible = false;
      fireSpriteRef.current.gotoAndStop(0);
    }
    if (deathSpriteRef.current) {
      deathSpriteRef.current.visible = false;
    }

    // Boss ateşini yeniden başlat
    startBossFiring();
    
    // Okları yeniden başlat
    startArrowSpawning();

    // Game Over ekranını kaldır
    if (gameOverContainerRef.current && mainContainerRef.current) {
      mainContainerRef.current.removeChild(gameOverContainerRef.current);
      gameOverContainerRef.current = null;
    }
    
    // Mermileri temizle
    bossBulletsRef.current.forEach(bullet => {
      if (mainContainerRef.current) {
        mainContainerRef.current.removeChild(bullet);
        bullet.destroy();
      }
    });
    bossBulletsRef.current = [];
    
    bulletsRef.current.forEach(bullet => {
      if (mainContainerRef.current) {
        mainContainerRef.current.removeChild(bullet);
        bullet.destroy();
      }
    });
    bulletsRef.current = [];
    
    // Paraları temizle
    coinsRef.current.forEach(coin => {
      if (mainContainerRef.current) {
        mainContainerRef.current.removeChild(coin);
        coin.destroy();
      }
    });
    coinsRef.current = [];
    
    // Hasar metinlerini temizle
    damageTextsRef.current.forEach(text => {
      if (mainContainerRef.current) {
        mainContainerRef.current.removeChild(text);
        text.destroy();
      }
    });
    damageTextsRef.current = [];
    
    // Sağlık çubuklarını güncelle
    if (healthBarRef.current) {
      healthBarRef.current.clear();
      healthBarRef.current.beginFill(0xff3333);
      healthBarRef.current.drawRoundedRect(0, 0, 1000, 20, 10);
      healthBarRef.current.endFill();
    }
    
    if (playerHealthBarRef.current) {
      playerHealthBarRef.current.clear();
      playerHealthBarRef.current.beginFill(0x33ff33);
      playerHealthBarRef.current.drawRoundedRect(0, 15, 200, 20, 10);
      playerHealthBarRef.current.endFill();
    }
    
    // Mermi sayısını güncelle
    updateAmmoText();
  };

  // Klavye olaylarını dinleme fonksiyonları
  const handleKeyDown = (e: KeyboardEvent) => {
    // Karakter öldüyse veya ölüm ekranı gösteriliyorsa hiçbir tuş çalışmasın
    if (!gameActiveRef.current || isDead || showGameOver) return;

    if (e.key === 'a' || e.key === 'A') startMovingLeft();
    if (e.key === 'd' || e.key === 'D') startMovingRight();
    if (e.key === 'w' || e.key === 'W') startJump();
    
    // Space tuşuna basıldığında ateş etme - cooldown kontrolü ekle
    if (e.key === ' ' && !isFiringRef.current && !isJumpingRef.current && !isMovingLeftRef.current && !isMovingRightRef.current) {
      // Son ateş etme zamanını kontrol et
      const currentTime = Date.now();
      const lastFireTime = lastFireTimeRef.current || 0;
      
      // 0.1 saniye geçtiyse ateş etmeye izin ver
      if (currentTime - lastFireTime >= 100) { // 2000ms'den 100ms'ye düşürdüm
        lastFireTimeRef.current = currentTime;
        startFiring();
      }
    }
    
    if (e.key === 'r') startReload();
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    // Karakter öldüyse veya ölüm ekranı gösteriliyorsa hiçbir tuş çalışmasın
    if (!gameActiveRef.current || isDead || showGameOver) return;

    if (e.key === 'a' || e.key === 'A') stopMovingLeft();
    if (e.key === 'd' || e.key === 'D') stopMovingRight();
    if (e.key === ' ') stopFiring();
  };

  // Hareket ve animasyon fonksiyonları
  const moveSpeed = 2;
  let lastX = 0;
  
  appRef.current?.ticker.add(() => {
    // Ölüm ekranı gösteriliyorsa veya oyun aktif değilse hiçbir şey yapma
    if (!gameActiveRef.current || isDead || showGameOver) return;
    
    if (!containerRef.current || !containerRef.current.position) return;
    
    const currentX = containerRef.current.x;
    
    if (isMovingLeftRef.current && currentX > 0 + (spriteRef.current?.width || 0) / 2) {
      containerRef.current.x -= moveSpeed;
    }
    if (isMovingRightRef.current && currentX < appRef.current!.screen.width - (spriteRef.current?.width || 0) / 2) {
      containerRef.current.x += moveSpeed;
    }

    // Zıplama güncelleme
    updateJump();

    // Sadece pozisyon değiştiğinde render et
    if (lastX !== currentX || isJumpingRef.current) {
      appRef.current?.renderer.render(appRef.current.stage);
      lastX = currentX;
    }
  });

  // Ölüm durumunda oyunu durdur ve Game Over ekranını göster
  useEffect(() => {
    if (isDead && !showGameOver && appRef.current && mainContainerRef.current) {
      console.log("Karakter öldü, tüm hareketler durduruluyor");
      
      // Oyunu devre dışı bırak
      gameActiveRef.current = false;
      
      // Tüm oyun işlevlerini durdur
      stopBossFiring();
      stopArrowSpawning();
      if (spriteRef.current) spriteRef.current.stop();
      if (jumpSpriteRef.current) jumpSpriteRef.current.stop();
      if (fireSpriteRef.current) fireSpriteRef.current.stop();
      
      // Tüm hareket durumlarını sıfırla
      isMovingLeftRef.current = false;
      isMovingRightRef.current = false;
      isJumpingRef.current = false;
      isFiringRef.current = false;
      lastFireTimeRef.current = 0; // Son ateş etme zamanını sıfırla
      
      // Tüm interval ve timeout'ları temizle
      if (fireIntervalRef.current) {
        clearInterval(fireIntervalRef.current);
        fireIntervalRef.current = null;
      }
      
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      
      if (fireTimeoutRef.current) {
        clearTimeout(fireTimeoutRef.current);
        fireTimeoutRef.current = null;
      }
      
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }
      
      if (bossFireIntervalRef.current) {
        clearInterval(bossFireIntervalRef.current);
        bossFireIntervalRef.current = null;
      }
      
      // Tüm mermileri durdur
      bulletsRef.current.forEach(bullet => {
        if (bullet && !bullet.destroyed) {
          bullet.renderable = false;
        }
      });
      
      bossBulletsRef.current.forEach(bullet => {
        if (bullet && !bullet.destroyed) {
          bullet.renderable = false;
        }
      });
      
      // Ticker'ı durdur
      if (appRef.current && appRef.current.ticker) {
        // Ticker'ı durdur - bu tüm animasyonları ve hareketleri durdurur
        appRef.current.ticker.stop();
        
        // Ölüm animasyonu için yeni bir ticker oluştur
        const deathTicker = new PIXI.Ticker();
        deathTicker.start();
        
        // Ölüm animasyonu için gerekli render işlemini ekle
        deathTicker.add(() => {
          if (deathSpriteRef.current && !deathSpriteRef.current.destroyed) {
            appRef.current?.renderer.render(appRef.current.stage);
          }
        });
        
        // Death animasyonu bittikten sonra ticker'ı durdur
        setTimeout(() => {
          deathTicker.stop();
          deathTicker.destroy();
        }, 1900); // Animasyon süresinden biraz kısa tutuyoruz
      }

      // Death animasyonu bittikten sonra Game Over ekranını göster
      setTimeout(() => {
        // Eğer oyun durumu değiştiyse işlemi iptal et
        if (!isDead || showGameOver) return;
        
        // HTML ölüm ekranını göster
        setShowGameOver(true);
        
        // Klavye olaylarını devre dışı bırak
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      }, 2000); // Death animasyonunun bitmesini bekle
    }
  }, [isDead, showGameOver]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pixiContainer.current) return;
    if (appRef.current) return;
    if (isInitialized && globalApp) {
      // Eğer uygulama zaten başlatılmışsa, mevcut uygulamayı kullan
      appRef.current = globalApp;
      
      // Canvas'ı mevcut container'a ekle
      if (pixiContainer.current && globalApp.view instanceof HTMLCanvasElement) {
        // Önce canvas'ın mevcut parent'ından kaldır
        if (globalApp.view.parentNode) {
          globalApp.view.parentNode.removeChild(globalApp.view);
        }
        pixiContainer.current.appendChild(globalApp.view);
      }
      
      return;
    }

    console.log("PixiJS yükleniyor...");

    import('pixi.js').then(async (PIXI) => {
      try {
        console.log("PixiJS yüklendi, uygulama başlatılıyor...");

        // Eğer zaten bir uygulama varsa, yenisini oluşturma
        if (isInitialized && globalApp) {
          appRef.current = globalApp;
          return;
        }

        // PixiJS uygulamasını başlat
        const app = new PIXI.Application({
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: 0x000000,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          backgroundAlpha: 1,
          clearBeforeRender: false,
        });

        // Render optimizasyonu
        app.renderer.events.autoPreventDefault = false;
        if (app.renderer.view instanceof HTMLCanvasElement) {
          app.renderer.view.style.imageRendering = 'pixelated';
          app.renderer.view.style.position = 'fixed';
          app.renderer.view.style.top = '0';
          app.renderer.view.style.left = '0';
        }
        app.stage.cullable = true;
        app.stage.eventMode = 'static';
        app.stage.interactive = true;

        appRef.current = app;
        globalApp = app; // Global değişkene ata
        isInitialized = true; // Başlatıldı olarak işaretle
        
        pixiContainer.current?.appendChild(app.view as HTMLCanvasElement);

        // Ana container oluştur
        const mainContainer = new PIXI.Container();
        app.stage.addChild(mainContainer);
        mainContainerRef.current = mainContainer;

        console.log("Assets yükleniyor...");

        try {
          // Mermi texture'ını yükle
          const bulletTexture = await PIXI.Assets.load('/bullet.png');
          bulletTextureRef.current = bulletTexture;

          // Altın texture'ını yükle
          const goldTexture = await PIXI.Assets.load('/gold.png');
          goldTextureRef.current = goldTexture;
          
          // Ok texture'ını yükle
          try {
            const arrowTexture = await PIXI.Assets.load('/ok.png');
            arrowTextureRef.current = arrowTexture;
          } catch (error) {
            console.warn("Ok texture'ı yüklenemedi:", error);
            // Yedek ok texture'ı oluştur
            const graphics = new PIXI.Graphics();
            graphics.beginFill(0xFFFFFF);
            graphics.moveTo(0, 0);
            graphics.lineTo(-15, 5);
            graphics.lineTo(-10, 0);
            graphics.lineTo(-15, -5);
            graphics.lineTo(0, 0);
            graphics.endFill();
            
            const texture = app.renderer.generateTexture(graphics);
            arrowTextureRef.current = texture;
          }

          // Boss texture ve atlas'ını yükle
          const bossTexture = await PIXI.Assets.load('/boss.png');
          const bossAtlasData = await fetch('/boss.json').then(res => res.json());

          // Arka plan resmini yükle
          const backgroundTexture = await PIXI.Assets.load('/background.png');
          const background = new PIXI.Sprite(backgroundTexture);
          
          // Floor texture'ını yükle
          const floorTexture = await PIXI.Assets.load('/floor.png');
          
          // Platform texture'ını yüklemeyi dene, hata olursa null bırak
          try {
            const platformTexture = await PIXI.Assets.load('/pickel_platform.png');
            platformTextureRef.current = platformTexture;
          } catch (error) {
            console.warn("Platform texture'ı yüklenemedi, yerine çizim kullanılacak");
            platformTextureRef.current = null;
          }
          
          // Zincir texture'ını yüklemeyi dene, hata olursa null bırak
          try {
            const chainTexture = await PIXI.Assets.load('/chain.png');
            chainTextureRef.current = chainTexture;
          } catch (error) {
            console.warn("Zincir texture'ı yüklenemedi, yerine çizim kullanılacak");
            chainTextureRef.current = null;
          }

          // Arka planı ekranı kaplayacak şekilde ayarla
          background.width = app.screen.width;
          background.height = app.screen.height;
          background.cacheAsBitmap = true; // Performans için önbellekle
          
          // Arka planı en alta ekle
          mainContainer.addChild(background);

          // Zemini oluştur
          const ground = new PIXI.TilingSprite(floorTexture, app.screen.width, 100);
          ground.y = app.screen.height - 100;
          ground.cacheAsBitmap = true;
          mainContainer.addChild(ground);
          groundRef.current = ground;

          // Kontrol talimatları
          const controlsText = new PIXI.Text('Kontroller:\nA - Sol\nD - Sağ\nW - Zıpla\nSPACE - Ateş Et\nR - Mermi Doldur', {
            fontFamily: 'Impact',
            fontSize: 24,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'left',
            lineHeight: 30
          });
          controlsText.x = 20;
          controlsText.y = app.screen.height - 280;
          mainContainer.addChild(controlsText);

          // Walk animasyonu için texture yükle
          const baseTexture = await PIXI.Assets.load('/character_walk.png');
          const atlasData = await fetch('/character_walk.json').then(res => res.json());

          // Jump animasyonu için texture yükle
          const jumpTexture = await PIXI.Assets.load('/character_jump.png');
          const jumpAtlasData = await fetch('/character_jump.json').then(res => res.json());

          // Fire animasyonu için texture yükle
          const fireTexture = await PIXI.Assets.load('/character_fire.png');
          const fireAtlasData = await fetch('/character_fire.json').then(res => res.json());

          console.log("Assets yüklendi");

          // Walk frame'lerini oluştur
          const frames = [];
          for (let i = 0; i <= 10; i++) {
            const frameName = `frame_${i}`;
            const frameData = atlasData.frames[frameName];
            if (frameData) {
              const texture = new PIXI.Texture(
                baseTexture,
                new PIXI.Rectangle(
                  frameData.frame.x,
                  frameData.frame.y,
                  frameData.frame.w,
                  frameData.frame.h
                )
              );
              frames.push(texture);
            }
          }

          // Jump frame'lerini oluştur
          const jumpFrames = [];
          for (let i = 0; i <= 10; i++) {
            const frameName = `frame_${i}`;
            const frameData = jumpAtlasData.frames[frameName];
            if (frameData) {
              const texture = new PIXI.Texture(
                jumpTexture,
                new PIXI.Rectangle(
                  frameData.frame.x,
                  frameData.frame.y,
                  frameData.frame.w,
                  frameData.frame.h
                )
              );
              jumpFrames.push(texture);
            }
          }

          // Fire frame'lerini oluştur
          const fireFrames = [];
          for (let i = 0; i <= 3; i++) {
            const frameName = `frame_${i}`;
            const frameData = fireAtlasData.frames[frameName];
            if (frameData) {
              const texture = new PIXI.Texture(
                fireTexture,
                new PIXI.Rectangle(
                  frameData.frame.x,
                  frameData.frame.y,
                  frameData.frame.w,
                  frameData.frame.h
                )
              );
              fireFrames.push(texture);
            }
          }

          // Boss frame'lerini oluştur
          const bossFrames = [];
          for (let i = 0; i <= 3; i++) {
            const frameName = `frame_${i}`;
            const frameData = bossAtlasData.frames[frameName];
            if (frameData) {
              const texture = new PIXI.Texture(
                bossTexture,
                new PIXI.Rectangle(
                  frameData.frame.x,
                  frameData.frame.y,
                  frameData.frame.w,
                  frameData.frame.h
                )
              );
              bossFrames.push(texture);
            }
          }

          if (frames.length === 0 || jumpFrames.length === 0 || fireFrames.length === 0 || bossFrames.length === 0) {
            throw new Error("Frame'ler oluşturulamadı!");
          }

          // Sprite container oluştur
          const container = new PIXI.Container();
          container.x = app.screen.width / 2;
          container.y = app.screen.height - 130;
          containerRef.current = container;

          // Boss sprite'ını oluştur
          const bossSprite = new PIXI.AnimatedSprite(bossFrames);
          bossSprite.anchor.set(0.5);
          bossSprite.x = app.screen.width - 200;
          bossSprite.y = app.screen.height - 250;
          bossSprite.scale.set(1);
          bossSprite.animationSpeed = 0.05;
          bossSprite.loop = true;
          bossSprite.play();
          mainContainer.addChild(bossSprite);
          bossRef.current = bossSprite;

          // Boss kızgın animasyonunu yükle
          const bossAngryTexture = await PIXI.Assets.load('/Boss_angry.png');
          const bossAngryResponse = await fetch('/boss_angry.json');
          const bossAngryAtlasData = await bossAngryResponse.json();
          
          // Boss kızgın frame'lerini oluştur
          const bossAngryFrames = [];
          
          // Animasyon isimlerini al
          const angryAnimationFrames = bossAngryAtlasData.animations?.angry || [];
          
          // Her bir frame için texture oluştur
          for (const frameName of angryAnimationFrames) {
            const frameData = bossAngryAtlasData.frames[frameName];
            if (frameData) {
              const texture = new PIXI.Texture(
                bossAngryTexture,
                new PIXI.Rectangle(
                  frameData.frame.x,
                  frameData.frame.y,
                  frameData.frame.w,
                  frameData.frame.h
                )
              );
              bossAngryFrames.push(texture);
            }
          }
          
          // Kızgın boss sprite'ını oluştur
          const bossAngrySprite = new PIXI.AnimatedSprite(bossAngryFrames);
          bossAngrySprite.anchor.set(0.5);
          bossAngrySprite.x = app.screen.width - 200;
          bossAngrySprite.y = app.screen.height - 250;
          bossAngrySprite.scale.set(1);
          bossAngrySprite.animationSpeed = 0.1; // Kızgın animasyon daha hızlı
          bossAngrySprite.loop = true;
          bossAngrySprite.visible = false; // Başlangıçta gizli
          mainContainer.addChild(bossAngrySprite);
          bossAngryRef.current = bossAngrySprite;

          // Boss'un ateş etmeye başlaması
          startBossFiring();
          
          // Okların oluşturulmaya başlaması
          startArrowSpawning();

          // Boss can barı container'ı
          const healthBarContainer = new PIXI.Container();
          healthBarContainer.x = app.screen.width - 320;
          healthBarContainer.y = 80;
          healthBarContainerRef.current = healthBarContainer;

          // Metalik efekt için gradient arka plan
          const bossMetallicBg = new PIXI.Graphics();
          bossMetallicBg.beginFill(0x000000, 0.6);
          bossMetallicBg.drawRoundedRect(-20, -40, 240, 100, 20);
          bossMetallicBg.endFill();
          
          // Dış parlama efekti
          const bossGlow = new PIXI.Graphics();
          bossGlow.lineStyle(3, 0xff0000, 0.3);
          bossGlow.drawRoundedRect(-23, -43, 246, 106, 22);
          bossGlow.endFill();
          
          // İç metalik kenarlık
          const bossInnerBorder = new PIXI.Graphics();
          bossInnerBorder.lineStyle(2, 0xff3333, 0.8);
          bossInnerBorder.drawRoundedRect(-20, -40, 240, 100, 20);
          bossInnerBorder.endFill();

          // Sci-fi dekoratif elementler
          const bossDecor = new PIXI.Graphics();
          bossDecor.lineStyle(1, 0xff3333, 0.6);
          // Sol üst köşe
          bossDecor.moveTo(-20, -25);
          bossDecor.lineTo(-10, -25);
          bossDecor.moveTo(-20, -15);
          bossDecor.lineTo(-10, -15);
          // Sağ üst köşe
          bossDecor.moveTo(220, -25);
          bossDecor.lineTo(210, -25);
          bossDecor.moveTo(220, -15);
          bossDecor.lineTo(210, -15);

          healthBarContainer.addChild(bossGlow);
          healthBarContainer.addChild(bossMetallicBg);
          healthBarContainer.addChild(bossInnerBorder);
          healthBarContainer.addChild(bossDecor);

          // Boss yazısı
          const bossText = new PIXI.Text('BOSS', {
            fontFamily: 'Impact',
            fontSize: 28,
            fill: ['#ff4444', '#ff0000'],
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            dropShadow: true,
            dropShadowColor: '#ff0000',
            dropShadowBlur: 6,
            dropShadowDistance: 0,
            letterSpacing: 2
          });
          bossText.x = 75;
          bossText.y = -30;
          healthBarContainer.addChild(bossText);

          // Can barı dış çerçeve
          const healthBarFrame = new PIXI.Graphics();
          healthBarFrame.lineStyle(2, 0xff3333, 0.8);
          healthBarFrame.beginFill(0x000000, 0.7);
          healthBarFrame.drawRoundedRect(-5, 10, 210, 30, 15);
          healthBarFrame.endFill();
          healthBarContainer.addChild(healthBarFrame);

          // Can barı arka planı
          const healthBarBackground = new PIXI.Graphics();
          healthBarBackground.beginFill(0x330000, 0.5);
          healthBarBackground.drawRoundedRect(0, 15, 200, 20, 10);
          healthBarBackground.endFill();
          healthBarContainer.addChild(healthBarBackground);

          // Can barı
          const healthBar = new PIXI.Graphics();
          healthBar.beginFill(0xff3333);
          healthBar.drawRoundedRect(0, 15, 200, 20, 10);
          healthBar.endFill();
          healthBarRef.current = healthBar;
          healthBarContainer.addChild(healthBar);

          // Karakter can barı container'ı
          const playerHealthBarContainer = new PIXI.Container();
          playerHealthBarContainer.x = 90;
          playerHealthBarContainer.y = 80;
          playerHealthBarContainerRef.current = playerHealthBarContainer;

          // Metalik efekt için gradient arka plan
          const playerMetallicBg = new PIXI.Graphics();
          playerMetallicBg.beginFill(0x000000, 0.6);
          playerMetallicBg.drawRoundedRect(-20, -40, 240, 100, 20);
          playerMetallicBg.endFill();
          
          // Dış parlama efekti
          const playerGlow = new PIXI.Graphics();
          playerGlow.lineStyle(3, 0x00ff00, 0.3);
          playerGlow.drawRoundedRect(-23, -43, 246, 106, 22);
          playerGlow.endFill();
          
          // İç metalik kenarlık
          const playerInnerBorder = new PIXI.Graphics();
          playerInnerBorder.lineStyle(2, 0x33ff33, 0.8);
          playerInnerBorder.drawRoundedRect(-20, -40, 240, 100, 20);
          playerInnerBorder.endFill();

          // Sci-fi dekoratif elementler
          const playerDecor = new PIXI.Graphics();
          playerDecor.lineStyle(1, 0x33ff33, 0.6);
          // Sol üst köşe
          playerDecor.moveTo(-20, -25);
          playerDecor.lineTo(-10, -25);
          playerDecor.moveTo(-20, -15);
          playerDecor.lineTo(-10, -15);
          // Sağ üst köşe
          playerDecor.moveTo(220, -25);
          playerDecor.lineTo(210, -25);
          playerDecor.moveTo(220, -15);
          playerDecor.lineTo(210, -15);

          playerHealthBarContainer.addChild(playerGlow);
          playerHealthBarContainer.addChild(playerMetallicBg);
          playerHealthBarContainer.addChild(playerInnerBorder);
          playerHealthBarContainer.addChild(playerDecor);

          // Little Pickle yazısı
          const playerText = new PIXI.Text('LITTLE PICKLE', {
            fontFamily: 'Impact',
            fontSize: 28,
            fill: ['#44ff44', '#00ff00'],
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            dropShadow: true,
            dropShadowColor: '#00ff00',
            dropShadowBlur: 6,
            dropShadowDistance: 0,
            letterSpacing: 1
          });
          playerText.x = 30;
          playerText.y = -30;
          playerHealthBarContainer.addChild(playerText);

          // Karakter can barı dış çerçeve
          const playerHealthBarFrame = new PIXI.Graphics();
          playerHealthBarFrame.lineStyle(2, 0x33ff33, 0.8);
          playerHealthBarFrame.beginFill(0x000000, 0.7);
          playerHealthBarFrame.drawRoundedRect(-5, 10, 210, 30, 15);
          playerHealthBarFrame.endFill();
          playerHealthBarContainer.addChild(playerHealthBarFrame);

          // Karakter can barı arka planı
          const playerHealthBarBackground = new PIXI.Graphics();
          playerHealthBarBackground.beginFill(0x003300, 0.5);
          playerHealthBarBackground.drawRoundedRect(0, 15, 200, 20, 10);
          playerHealthBarBackground.endFill();
          playerHealthBarContainer.addChild(playerHealthBarBackground);

          // Karakter can barı
          const playerHealthBar = new PIXI.Graphics();
          playerHealthBar.beginFill(0x33ff33);
          playerHealthBar.drawRoundedRect(0, 15, 200, 20, 10);
          playerHealthBar.endFill();
          playerHealthBarRef.current = playerHealthBar;
          playerHealthBarContainer.addChild(playerHealthBar);

          mainContainer.addChild(healthBarContainer);
          mainContainer.addChild(playerHealthBarContainer);

          // Can barlarını güncelle
          app.ticker.add(() => {
            // Oyun aktif değilse veya karakter öldüyse güncelleme yapma
            if (!gameActiveRef.current || isDead || showGameOver) return;
            
            // Boss can barını güncelle
            if (healthBarRef.current) {
              healthBarRef.current.clear();
              const healthPercent = bossHealthRef.current / 1000000;
              const healthBarWidth = healthPercent * 200;
              
              // Gradient renk (kırmızıdan koyu kırmızıya)
              const color = Math.floor(healthPercent * 255);
              const r = Math.min(255, Math.max(180, color + 180));
              const barColor = (r << 16) | ((color * 0.2) << 8);
              
              healthBarRef.current.beginFill(barColor);
              healthBarRef.current.drawRoundedRect(0, 15, healthBarWidth, 20, 10);
              healthBarRef.current.endFill();

              // Parlama efekti
              if (healthBarWidth > 0) {
                healthBarRef.current.lineStyle(1, 0xff6666, 0.3);
                healthBarRef.current.moveTo(0, 16);
                healthBarRef.current.lineTo(healthBarWidth, 16);
              }
            }

            // Karakter can barını güncelle
            if (playerHealthBarRef.current) {
              playerHealthBarRef.current.clear();
              const healthPercent = playerHealthRef.current / 100;
              const healthBarWidth = healthPercent * 200;
              
              // Gradient renk (yeşilden koyu yeşile)
              const color = Math.floor(healthPercent * 255);
              const g = Math.min(255, Math.max(180, color + 180));
              const barColor = (g << 8) | ((color * 0.2) << 16);
              
              playerHealthBarRef.current.beginFill(barColor);
              playerHealthBarRef.current.drawRoundedRect(0, 15, healthBarWidth, 20, 10);
              playerHealthBarRef.current.endFill();

              // Parlama efekti
              if (healthBarWidth > 0) {
                playerHealthBarRef.current.lineStyle(1, 0x66ff66, 0.3);
                playerHealthBarRef.current.moveTo(0, 16);
                playerHealthBarRef.current.lineTo(healthBarWidth, 16);
              }
            }
          });

          // Walk sprite'ını oluştur"
          const animatedSprite = new PIXI.AnimatedSprite(frames);
          spriteRef.current = animatedSprite;

          // Jump sprite'ını oluştur
          const jumpSprite = new PIXI.AnimatedSprite(jumpFrames);
          jumpSprite.visible = false;
          jumpSpriteRef.current = jumpSprite;

          // Fire sprite'ını oluştur
          const fireSprite = new PIXI.AnimatedSprite(fireFrames);
          fireSprite.visible = false;
          fireSprite.loop = false; // Ateş animasyonu bir kere oynatılsın
          fireSprite.animationSpeed = 0.3; // Ateş animasyonu hızı
          fireSpriteRef.current = fireSprite;

          // Sprite özelliklerini ayarla
          [animatedSprite, jumpSprite, fireSprite].forEach(sprite => {
            sprite.anchor.set(0.5);
            sprite.x = 0;
            sprite.y = 0;
            sprite.scale.set(0.5); // Boss'un yarısı kadar olacak
            if (sprite !== fireSprite) {
              sprite.animationSpeed = 0.2;
              sprite.loop = true;
            }
          });

          // Sprite'ları container'a ekle
          container.addChild(animatedSprite);
          container.addChild(jumpSprite);
          container.addChild(fireSprite);

          // Mermi sayısı text'ini oluştur
          const ammoText = new PIXI.Text('12/12', {
            fontFamily: 'Impact',
            fontSize: 20,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
          });
          ammoText.anchor.set(0.5);
          ammoTextRef.current = ammoText;
          container.addChild(ammoText);

          // Mermi text pozisyonunu güncelle
          app.ticker.add(() => {
            if (!ammoTextRef.current || !containerRef.current || !ammoTextRef.current.position) return;
            ammoTextRef.current.x = 0;
            ammoTextRef.current.y = -80;
          });

          // Container'ı ana container'a ekle
          mainContainer.addChild(container);
          setIsLoaded(true);

          // Klavye olaylarını dinle
          window.addEventListener('keydown', handleKeyDown);
          window.addEventListener('keyup', handleKeyUp);

          // Platformları oluştur
          createPicklePlatforms();

          // Oyun döngüsünde platform kontrolü ekle
          app.ticker.add(() => {
            if (!gameActiveRef.current || isDead || showGameOver) return;
            
            if (!containerRef.current || !containerRef.current.position) return;
            
            const currentX = containerRef.current.x;
            
            if (isMovingLeftRef.current && currentX > 0 + (spriteRef.current?.width || 0) / 2) {
              containerRef.current.x -= moveSpeed;
            }
            if (isMovingRightRef.current && currentX < app.screen.width - (spriteRef.current?.width || 0) / 2) {
              containerRef.current.x += moveSpeed;
            }

            // Zıplama güncelleme
            updateJump();

            // Sadece pozisyon değiştiğinde render et
            if (lastX !== currentX || isJumpingRef.current) {
              app.renderer.render(app.stage);
              lastX = currentX;
            }
          });

          console.log("Animasyon başarıyla başlatıldı");

          // Event listener'ları temizle
          return () => {
            // İşlem kuyruğunu temizle
            clearTransactionQueue();
            
            if (handleKeyDown && handleKeyUp) {
              window.removeEventListener('keydown', handleKeyDown);
              window.removeEventListener('keyup', handleKeyUp);
            }
            
            if (animationTimeoutRef.current) {
              clearTimeout(animationTimeoutRef.current);
            }
            
            if (fireTimeoutRef.current) {
              clearTimeout(fireTimeoutRef.current);
            }
            
            if (reloadTimeoutRef.current) {
              clearTimeout(reloadTimeoutRef.current);
            }
            
            if (appRef.current?.ticker) {
              appRef.current.ticker.destroy();
            }
            
            stopBossFiring();
            stopArrowSpawning();
          };

        } catch (error) {
          console.error("Asset işleme hatası:", error);
          setError("Asset işlenemedi: " + (error as Error).message);
        }

      } catch (error) {
        console.error("PIXI.js başlatma hatası:", error);
        setError("PIXI.js başlatılamadı: " + (error as Error).message);
      }
    }).catch((error) => {
      console.error("PIXI.js yüklenirken hata:", error);
      setError("PIXI.js yüklenemedi: " + error.message);
    });

    return () => {
      if (appRef.current) {
        // Canvas'ı DOM'dan kaldır ama yok etme
        if (appRef.current.view instanceof HTMLCanvasElement && appRef.current.view.parentNode) {
          appRef.current.view.parentNode.removeChild(appRef.current.view);
        }
        
        // Interval'i temizle
        if (fireIntervalRef.current) {
          clearInterval(fireIntervalRef.current);
          fireIntervalRef.current = null;
        }
        
        if (arrowSpawnIntervalRef.current) {
          clearInterval(arrowSpawnIntervalRef.current);
          arrowSpawnIntervalRef.current = null;
        }
        
        // Son ateş etme zamanını sıfırla
        lastFireTimeRef.current = 0;
        
        // Mermileri temizle
        bulletsRef.current.forEach(bullet => {
          appRef.current?.stage.removeChild(bullet);
          bullet.destroy();
        });
        bulletsRef.current = [];
        
        // Okları temizle
        arrowsRef.current.forEach(arrow => {
          appRef.current?.stage.removeChild(arrow);
          arrow.destroy();
        });
        arrowsRef.current = [];
        
        // Referansları temizle ama uygulamayı yok etme
        appRef.current = null;
        setIsLoaded(false);

        // Coinleri temizle
        coinsRef.current.forEach(coin => {
          globalApp?.stage.removeChild(coin);
          coin.destroy();
        });
        coinsRef.current = [];
      }
    };
  }, [isGamePage]);

  // Ok oluşturma ve gönderme fonksiyonu
  const createArrow = (fromLeft: boolean) => {
    if (!appRef.current || !arrowTextureRef.current || !mainContainerRef.current || !containerRef.current) return;
    
    const arrow = new PIXI.Sprite(arrowTextureRef.current);
    arrow.anchor.set(0.5);
    arrow.scale.set(0.08); // Boyutu daha da küçülttüm (0.15'ten 0.08'e)
    
    // Okun başlangıç pozisyonu (sol veya sağ üst köşe)
    if (fromLeft) {
      arrow.x = 0;
      arrow.y = Math.random() * (appRef.current.screen.height / 3); // Üst 1/3 kısımdan rastgele
    } else {
      arrow.x = appRef.current.screen.width;
      arrow.y = Math.random() * (appRef.current.screen.height / 3); // Üst 1/3 kısımdan rastgele
    }
    
    // Oyuncuyu hedefle - ok ile oyuncu arasındaki açıyı hesapla
    const targetX = containerRef.current.x;
    const targetY = containerRef.current.y;
    const dx = targetX - arrow.x;
    const dy = targetY - arrow.y;
    const angle = Math.atan2(dy, dx);
    
    // Oku doğru açıyla döndür
    arrow.rotation = angle;
    
    mainContainerRef.current.addChild(arrow);
    arrowsRef.current.push(arrow);
    
    // Ok hızı
    const arrowSpeed = 4 + Math.random() * 2; // 4-6 arası rastgele hız
    
    const updateArrow = () => {
      // Ok veya app yoksa veya ok yok edildiyse işlemi durdur
      if (!arrow || !appRef.current || arrow.destroyed || !arrow.position) return;
      
      // Oku hareket ettir (hesaplanan açıya göre)
      arrow.x += Math.cos(angle) * arrowSpeed;
      arrow.y += Math.sin(angle) * arrowSpeed;
      
      // Karakter ile çarpışma kontrolü
      if (containerRef.current && 
          Math.abs(arrow.x - containerRef.current.x) < 30 && 
          Math.abs(arrow.y - containerRef.current.y) < 30 && 
          !isDead) {
        
        // Önce ticker'dan kaldır
        if (appRef.current?.ticker) {
          appRef.current.ticker.remove(updateArrow);
        }
        
        // Sonra oku listeden çıkar
        arrowsRef.current = arrowsRef.current.filter(a => a !== arrow);
        
        // En son oku temizle (eğer hala yok edilmediyse)
        if (!arrow.destroyed && mainContainerRef.current) {
          try {
            mainContainerRef.current.removeChild(arrow);
            arrow.destroy();
          } catch (error) {
            console.warn("Ok temizlenirken hata:", error);
          }
        }
        
        // Karakter öldü
        setIsDead(true);
        stopArrowSpawning();
        stopBossFiring();
        playerHealthRef.current = 0;
        
        // Tüm karakter sprite'larını gizle
        if (containerRef.current) {
          if (spriteRef.current) spriteRef.current.visible = false;
          if (jumpSpriteRef.current) jumpSpriteRef.current.visible = false;
          if (fireSpriteRef.current) fireSpriteRef.current.visible = false;
          
          // Death sprite'ını yükle ve oynat
          PIXI.Assets.load('/character_death.png').then(deathTexture => {
            fetch('/character_death.json')
              .then(res => res.json())
              .then(deathAtlasData => {
                // Death frame'lerini oluştur
                const deathFrames = [];
                for (let i = 0; i <= 4; i++) {
                  const frameName = `frame_${i}`;
                  const frameData = deathAtlasData.frames[frameName];
                  if (frameData) {
                    console.log(`Death frame ${i} yükleniyor:`, frameData);
                    const texture = new PIXI.Texture(
                      deathTexture,
                      new PIXI.Rectangle(
                        frameData.frame.x,
                        frameData.frame.y,
                        frameData.frame.w,
                        frameData.frame.h
                      )
                    );
                    deathFrames.push(texture);
                  }
                }
                
                console.log(`Toplam ${deathFrames.length} death frame yüklendi`);
                
                // Death sprite'ını oluştur ve ayarla
                const deathSprite = new PIXI.AnimatedSprite(deathFrames);
                deathSprite.anchor.set(0.5);
                deathSprite.scale.set(0.5);
                deathSprite.animationSpeed = 0.1;
                deathSprite.loop = false;
                deathSpriteRef.current = deathSprite;
                
                // Sprite'ın yönünü ayarla
                if (spriteRef.current) {
                  deathSprite.scale.x = Math.abs(deathSprite.scale.x) * Math.sign(spriteRef.current.scale.x);
                }
                
                // Sprite'ı container'a eklemeden önce pozisyonunu ayarla
                deathSprite.x = 0;
                deathSprite.y = 0;
                deathSprite.visible = true; // Görünürlüğü açıkça belirt
                deathSprite.alpha = 1; // Opaklığı tam ayarla
                
                // Diğer sprite'ları gizle ve death sprite'ı ekle
                if (containerRef.current) {
                  if (spriteRef.current) spriteRef.current.visible = false;
                  if (jumpSpriteRef.current) jumpSpriteRef.current.visible = false;
                  if (fireSpriteRef.current) fireSpriteRef.current.visible = false;
                  
                  // Önce varsa eski death sprite'ı kaldır
                  if (deathSpriteRef.current && deathSpriteRef.current !== deathSprite) {
                    containerRef.current.removeChild(deathSpriteRef.current);
                  }
                  
                  containerRef.current.addChild(deathSprite);
                }
                
                console.log("Death sprite oluşturuldu ve eklendi");
                
                // Animasyonu oynat ve bitince 1. karede kal
                deathSprite.onComplete = () => {
                  if (deathSprite && !deathSprite.destroyed) {
                    console.log("Death animasyonu tamamlandı");
                    deathSprite.gotoAndStop(1);
                    deathSprite.visible = true;
                    deathSprite.alpha = 1;
                    
                    // Container'ı güncelle
                    if (containerRef.current) {
                      containerRef.current.setChildIndex(deathSprite, containerRef.current.children.length - 1);
                    }
                  }
                };
                
                console.log("death çalıştı");
                deathSprite.play();
              });
          });
        }
        
        return;
      }
      
      // Ekran dışına çıkma kontrolü
      if (arrow.x < -50 || arrow.x > (appRef.current?.screen.width + 50) || 
          arrow.y < -50 || arrow.y > (appRef.current?.screen.height + 50)) {
        
        // Önce ticker'dan kaldır
        if (appRef.current?.ticker) {
          appRef.current.ticker.remove(updateArrow);
        }
        
        // Sonra oku listeden çıkar
        arrowsRef.current = arrowsRef.current.filter(a => a !== arrow);
        
        // En son oku temizle (eğer hala yok edilmediyse)
        if (!arrow.destroyed && mainContainerRef.current) {
          try {
            mainContainerRef.current.removeChild(arrow);
            arrow.destroy();
          } catch (error) {
            console.warn("Ok temizlenirken hata:", error);
          }
        }
      }
    };
    
    appRef.current.ticker.add(updateArrow);
  };
  
  // Okların oluşturulmasını başlat
  const startArrowSpawning = () => {
    if (arrowSpawnIntervalRef.current) return;
    
    // İlk okları hemen oluştur
    createArrow(true); // Sol taraftan
    
    // Belirli aralıklarla ok oluştur
    arrowSpawnIntervalRef.current = setInterval(() => {
      if (!gameActiveRef.current || isDead || showGameOver) return;
      
      // Rastgele sol veya sağ taraftan ok oluştur
      const fromLeft = Math.random() > 0.5;
      createArrow(fromLeft);
    }, 15000); // 15 saniyede bir ok oluştur (2000'den 15000'e değiştirildi)
  };
  
  // Okların oluşturulmasını durdur
  const stopArrowSpawning = () => {
    if (arrowSpawnIntervalRef.current) {
      clearInterval(arrowSpawnIntervalRef.current);
      arrowSpawnIntervalRef.current = null;
    }
    
    // Mevcut okları temizle
    arrowsRef.current.forEach(arrow => {
      if (mainContainerRef.current && !arrow.destroyed) {
        try {
          mainContainerRef.current.removeChild(arrow);
          arrow.destroy();
        } catch (error) {
          console.warn("Ok temizlenirken hata:", error);
        }
      }
    });
    arrowsRef.current = [];
  };

  return (
    <div>
      {isGamePage && (
        <>
          <div
            ref={pixiContainer}
            style={{ width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0 }}
            className="overflow-hidden"
          />
          {error && (
            <div className="text-red-500 mt-2 text-center fixed bottom-4 left-1/2 transform -translate-x-1/2">
              {error}
            </div>
          )}
          
          {showGameOver && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
              }}
            >
              <h1 
                style={{
                  fontFamily: 'Impact, sans-serif',
                  fontSize: '72px',
                  color: '#ff0000',
                  textShadow: '0 0 10px #000000, 0 0 20px #000000, 2px 2px 2px #000000',
                  marginBottom: '40px'
                }}
              >
                YOU ARE DEAD
              </h1>
              <button
                onClick={restartGame}
                style={{
                  padding: '15px 30px',
                  fontSize: '24px',
                  fontFamily: 'Impact, sans-serif',
                  backgroundColor: '#00cc00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#00dd00'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#00cc00'}
              >
                TEKRAR OYNA
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PixiSprite;      
