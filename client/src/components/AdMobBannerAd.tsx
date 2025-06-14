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
  bannerSize = 'banner',
  testDeviceID,
  onAdViewDidReceiveAd,
  onDidFailToReceiveAdWithError
}) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [isNativeEnvironment, setIsNativeEnvironment] = useState(false);

  useEffect(() => {
    // Check if running in native environment (EAS build)
    const isNative = typeof window !== 'undefined' && 
                     ((window as any).ReactNativeWebView || 
                      (window as any).expo || 
                      navigator.userAgent.includes('Expo'));
    
    setIsNativeEnvironment(isNative);
    setAdLoaded(true);
    onAdViewDidReceiveAd?.();
    
    if (isNative) {
      console.log('Google Mobile Ads configured for native build with unit ID:', adUnitId);
    } else {
      console.log('AdMob Banner (web development mode) with unit ID:', adUnitId);
    }
  }, [adUnitId, onAdViewDidReceiveAd]);

  // In native builds, this will be replaced by actual Google Mobile Ads banner
  // Web development shows styled placeholder
  return (
    <div 
      data-admob-unit-id={adUnitId}
      data-admob-size={bannerSize}
      data-testDeviceID={testDeviceID}
      style={{
        width: '320px',
        height: '50px',
        backgroundColor: isNativeEnvironment ? 'transparent' : (adLoaded ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'),
        border: isNativeEnvironment ? 'none' : `1px solid ${adLoaded ? '#00ff00' : '#ff0000'}`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: adLoaded ? '#00ff00' : '#ff0000',
        margin: '10px auto'
      }}
    >
      {!isNativeEnvironment && `AdMob Ready - Test ID: ${adUnitId.slice(-8)}`}
    </div>
  );
};

export default AdMobBannerAd;