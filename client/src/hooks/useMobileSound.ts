import { useCallback, useEffect, useRef, useState } from 'react';

interface SoundManager {
  playSound: (soundType: string) => void;
  isReady: boolean;
  unlock: () => void;
}

export function useMobileSound(): SoundManager {
  const [isReady, setIsReady] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const isUnlockedRef = useRef(false);

  // Sound file mappings
  const soundFiles = {
    keyboard: '/11L-the_punching_of_a_a_-1748837411444.mp3',
    printer: '/dot-matrix-printer-73220.mp3',
    button_click: '/11L-the_punching_of_a_a_-1748837411444.mp3',
    success: '/dot-matrix-printer-73220.mp3',
    error: '/11L-the_punching_of_a_a_-1748837411444.mp3'
  };

  // Initialize AudioContext
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Load audio buffer
  const loadAudioBuffer = useCallback(async (url: string): Promise<AudioBuffer | null> => {
    try {
      const audioContext = initAudioContext();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`Failed to load audio: ${url}`, error);
      return null;
    }
  }, [initAudioContext]);

  // Unlock audio context (required for mobile browsers)
  const unlock = useCallback(async () => {
    const audioContext = initAudioContext();
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Play a silent sound to unlock
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0;
    oscillator.frequency.value = 440;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.01);
    
    isUnlockedRef.current = true;
  }, [initAudioContext]);

  // Load all sounds
  useEffect(() => {
    const loadSounds = async () => {
      const buffers = new Map<string, AudioBuffer>();
      
      for (const [key, url] of Object.entries(soundFiles)) {
        const buffer = await loadAudioBuffer(url);
        if (buffer) {
          buffers.set(key, buffer);
        }
      }
      
      soundBuffersRef.current = buffers;
      setIsReady(true);
    };

    loadSounds();
  }, [loadAudioBuffer]);

  // Play sound function
  const playSound = useCallback((soundType: string) => {
    if (!isReady || !isUnlockedRef.current) return;
    
    const audioContext = audioContextRef.current;
    const buffer = soundBuffersRef.current.get(soundType);
    
    if (!audioContext || !buffer) return;

    try {
      // Create new source for each play (allows overlapping)
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set volume
      gainNode.gain.value = 0.3;
      
      // Play sound
      source.start();
    } catch (error) {
      console.warn(`Failed to play sound: ${soundType}`, error);
    }
  }, [isReady]);

  return {
    playSound,
    isReady,
    unlock
  };
}