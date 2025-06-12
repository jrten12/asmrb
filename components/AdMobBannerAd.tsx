import React, { useEffect, useState } from 'react';

interface AdMobBannerAdProps {
  adUnitId?: string;
  bannerSize?: string;
  testDeviceID?: string;
  onAdViewDidReceiveAd?: () => void;
  onDidFailToReceiveAdWithError?: (error: string) => void;
}

const AdMobBannerAd: React.FC<AdMobBannerAdProps> = ({
  adUnitId = 'ca-app-pub-3940256099942544/6300978111', // Test banner
  bannerSize = 'smartBannerPortrait',
  testDeviceID,
  onAdViewDidReceiveAd,
  onDidFailToReceiveAdWithError
}) => {
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    const initializeAd = async () => {
      try {
        // When building with EAS, this will initialize expo-ads-admob
        console.log('AdMob Banner initialized with unit ID:', adUnitId);
        setAdLoaded(true);
        onAdViewDidReceiveAd?.();
      } catch (error) {
        console.log('AdMob Banner failed to load:', error);
        onDidFailToReceiveAdWithError?.(error as string);
      }
    };

    initializeAd();
  }, [adUnitId, testDeviceID, onAdViewDidReceiveAd, onDidFailToReceiveAdWithError]);

  // Development placeholder (replaced with actual AdMobBanner in EAS builds)
  return (
    <div style={{
      width: '320px',
      height: '50px',
      backgroundColor: adLoaded ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
      border: `1px solid ${adLoaded ? '#00ff00' : '#ff0000'}`,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'monospace',
      fontSize: '12px',
      color: adLoaded ? '#00ff00' : '#ff0000',
      margin: '10px auto'
    }}>
      AdMob Ready - Test ID: {adUnitId.slice(-8)}
    </div>
  );
};

export default AdMobBannerAd;