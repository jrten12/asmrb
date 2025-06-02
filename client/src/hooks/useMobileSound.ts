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

  // Sound file mappings - correct ASMR sounds for each action
  const soundFiles = {
    keyboard: '/keyboard-typing.mp3',          // Typing/keyboard sounds
    printer: '/dot-matrix-printer-73220.mp3', // Dot matrix printing
    button_click: '/keyboard-typing.mp3',      // Button presses (keyboard click)
    success: '/dot-matrix-printer-73220.mp3', // Success actions (printer)
    error: '/keyboard-typing.mp3',             // Error sounds (keyboard)
    approve: '/dot-matrix-printer-73220.mp3', // Transaction approval (printer)
    reject: '/keyboard-typing.mp3',            // Transaction rejection (keyboard)
    paper_rustle: '/keyboard-typing.mp3',      // Paper handling (keyboard)
    stamp: '/dot-matrix-printer-73220.mp3',   // Stamping documents (printer)
    drawer: '/keyboard-typing.mp3',            // Cash drawer (keyboard)
    cash: '/dot-matrix-printer-73220.mp3',    // Cash counting (printer)
    receipt: '/dot-matrix-printer-73220.mp3'  // Receipt printing (printer)
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