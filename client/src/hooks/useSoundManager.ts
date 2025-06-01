import { useEffect, useRef } from 'react';
import { SoundEffects } from '../types/game';

export function useSoundManager() {
  const soundsRef = useRef<SoundEffects | null>(null);
  const isMutedRef = useRef(false);
  
  useEffect(() => {
    // Initialize sounds
    const sounds: SoundEffects = {
      typing: new Audio('/sounds/typing.mp3'),
      stamp: new Audio('/sounds/stamp.mp3'),
      drawer: new Audio('/sounds/drawer.mp3'),
      cash: new Audio('/sounds/cash.mp3'),
      receipt: new Audio('/sounds/receipt.mp3'),
      warning: new Audio('/sounds/warning.mp3')
    };
    
    // Set volume for all sounds
    Object.values(sounds).forEach(sound => {
      sound.volume = 0.3;
      sound.preload = 'auto';
    });
    
    soundsRef.current = sounds;
    
    return () => {
      // Cleanup
      Object.values(sounds).forEach(sound => {
        sound.pause();
        sound.currentTime = 0;
      });
    };
  }, []);
  
  const playSound = (soundName: keyof SoundEffects) => {
    if (isMutedRef.current || !soundsRef.current) return;
    
    const sound = soundsRef.current[soundName];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(error => {
        console.log(`Failed to play ${soundName}:`, error);
      });
    }
  };
  
  const toggleMute = () => {
    isMutedRef.current = !isMutedRef.current;
    return isMutedRef.current;
  };
  
  const setVolume = (volume: number) => {
    if (!soundsRef.current) return;
    
    Object.values(soundsRef.current).forEach(sound => {
      sound.volume = Math.max(0, Math.min(1, volume));
    });
  };
  
  return {
    playSound,
    toggleMute,
    setVolume,
    isMuted: () => isMutedRef.current
  };
}
