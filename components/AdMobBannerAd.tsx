import React, { useEffect, useState } from 'react';

interface AdMobBannerAdProps {
  adUnitId?: string;
  bannerSize?: string;
  testDeviceID?: string;
  onAdViewDidReceiveAd?: () => void;
  onDidFailToReceiveAdWithError?: (error: string) => void;
}

const AdMobBannerAd: React.FC<AdMobBannerAdProps> = ({
  adUnitId = 'ca-app-pub-2744316013184797/4741683992', // Production banner
  bannerSize = 'banner',
  testDeviceID,
  onAdViewDidReceiveAd,
  onDidFailToReceiveAdWithError
}) => {
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    // Simple ad initialization for web development
    setAdLoaded(true);
    if (onAdViewDidReceiveAd) {
      onAdViewDidReceiveAd();
    }
    console.log('AdMob Banner configured with unit ID:', adUnitId);
  }, [adUnitId, onAdViewDidReceiveAd]);

  // Web development shows styled placeholder
  // Native builds will use actual Google Mobile Ads
  return (
    <div 
      data-admob-unit-id={adUnitId}
      data-admob-size={bannerSize}
      style={{
        width: '320px',
        height: '50px',
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        border: '1px solid #00ff00',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#00ff00',
        margin: '10px auto'
      }}
    >
      AdMob Ready - Unit: {adUnitId.slice(-8)}
    </div>
  );
};

export default AdMobBannerAd;