import React from 'react';

interface BannerAdProps {
  style?: React.CSSProperties;
}

const BannerAd: React.FC<BannerAdProps> = ({ style }) => {
  return (
    <div 
      style={{
        width: '320px',
        height: '50px',
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        border: '1px solid #00ff00',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#00ff00',
        ...style
      }}
    >
      AdMob Banner (Test)
    </div>
  );
};

export default BannerAd;