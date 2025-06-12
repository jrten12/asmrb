import React, { useEffect, useState } from 'react';

interface BannerAdProps {
  style?: React.CSSProperties;
  adUnitId?: string;
}

const BannerAd: React.FC<BannerAdProps> = ({ 
  style, 
  adUnitId = 'ca-app-pub-3940256099942544/6300978111' // Test banner ad unit ID
}) => {
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    // Initialize AdMob banner ad
    const initializeAd = () => {
      try {
        // This will be replaced with actual expo-ads-admob when building with EAS
        console.log('Banner ad initialized with unit ID:', adUnitId);
        setAdLoaded(true);
      } catch (error) {
        console.log('Banner ad failed to load:', error);
      }
    };

    initializeAd();
  }, [adUnitId]);

  return (
    <div 
      style={{
        width: '320px',
        height: '50px',
        backgroundColor: adLoaded ? 'rgba(0, 255, 0, 0.05)' : 'rgba(255, 0, 0, 0.05)',
        border: `1px solid ${adLoaded ? '#00ff00' : '#ff0000'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        fontSize: '10px',
        color: adLoaded ? '#00ff00' : '#ff0000',
        borderRadius: '4px',
        ...style
      }}
    >
      {adLoaded ? 'AdMob Banner Ready' : 'Ad Loading...'}
      <br />
      <span style={{ fontSize: '8px', opacity: 0.7 }}>
        Unit: {adUnitId.slice(-8)}
      </span>
    </div>
  );
};

export default BannerAd;