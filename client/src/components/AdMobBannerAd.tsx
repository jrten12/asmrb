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
    // Initialize ad placeholder
    setAdLoaded(true);
    onAdViewDidReceiveAd?.();
    console.log('AdMob Banner configured for EAS build with unit ID:', adUnitId);
  }, [adUnitId, onAdViewDidReceiveAd]);

  // EAS build will replace this with actual AdMobBanner component
  // Web development shows placeholder
  return (
    <div 
      data-admob-unit-id={adUnitId}
      data-admob-size={bannerSize}
      style={{
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
      }}
    >
      AdMob Ready - Test ID: {adUnitId.slice(-8)}
    </div>
  );
};

export default AdMobBannerAd;