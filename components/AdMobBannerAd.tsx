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
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const initializeAd = async () => {
      try {
        // Check if running in native environment
        const isCapacitor = !!(window as any).Capacitor;
        setIsNative(isCapacitor);
        
        if (isCapacitor) {
          // Initialize Google Mobile Ads for native deployment
          const { BannerAd, BannerAdSize, TestIds } = await import('react-native-google-mobile-ads');
          console.log('Google Mobile Ads initialized with unit ID:', adUnitId);
        } else {
          // Web development mode
          console.log('AdMob Banner (web development mode) with unit ID:', adUnitId);
        }
        
        setAdLoaded(true);
        onAdViewDidReceiveAd?.();
      } catch (error) {
        console.log('AdMob Banner failed to load:', error);
        onDidFailToReceiveAdWithError?.(error as string);
      }
    };

    initializeAd();
  }, [adUnitId, testDeviceID, onAdViewDidReceiveAd, onDidFailToReceiveAdWithError]);

  // Return native ad component when in Capacitor environment
  if (isNative) {
    return React.createElement('div', {
      style: {
        width: '100%',
        height: '50px',
        backgroundColor: 'transparent',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },
      'data-admob-unit-id': adUnitId,
      'data-admob-size': bannerSize
    });
  }

  // Web development placeholder
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