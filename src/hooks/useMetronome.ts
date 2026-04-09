import { useState, useEffect, useRef, useCallback } from 'react';

export const useMetronome = (initialBpm: number = 120, initialSubdivision: number = 1, muteSubdivisions: boolean = false, metronomeVolume: number = 0.8, drumVolume: number = 1.0) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(initialBpm);
  const [subdivision, setSubdivision] = useState(initialSubdivision);
  const [accentPattern, setAccentPattern] = useState<number[]>([]);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentSubdivision, setCurrentSubdivision] = useState(0);
  const [currentTick, setCurrentTick] = useState(0);
  
  const isPlayingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const bpmRef = useRef(bpm);
  const subdivisionRef = useRef(subdivision);
  const accentPatternRef = useRef(accentPattern);
  const muteSubdivisionsRef = useRef(muteSubdivisions);
  const currentBeatRef = useRef(0);
  const currentSubdivisionRef = useRef(0);
  const currentTickRef = useRef(0);
  const metronomeVolumeRef = useRef(metronomeVolume);
  const drumVolumeRef = useRef(drumVolume);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    metronomeVolumeRef.current = metronomeVolume;
  }, [metronomeVolume]);

  useEffect(() => {
    drumVolumeRef.current = drumVolume;
  }, [drumVolume]);

  // Callback for external sound triggering (like snare)
  const onTickRef = useRef<((tick: number, beat: number, sub: number, time: number) => void) | null>(null);

  const lastPlayedTimeRef = useRef(-1);
  const muteTicksCountRef = useRef(0);

  useEffect(() => {
    setBpm(initialBpm);
  }, [initialBpm]);

  useEffect(() => {
    setSubdivision(initialSubdivision);
  }, [initialSubdivision]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    subdivisionRef.current = subdivision;
  }, [subdivision]);

  useEffect(() => {
    accentPatternRef.current = accentPattern;
  }, [accentPattern]);

  useEffect(() => {
    muteSubdivisionsRef.current = muteSubdivisions;
  }, [muteSubdivisions]);

  const playClick = useCallback((time: number, isFirstBeat: boolean, isSubdivision: boolean, isAccent: boolean) => {
    if (!audioContextRef.current) return;
    
    // Prevent double triggers for the same timestamp
    if (time <= lastPlayedTimeRef.current) return;
    lastPlayedTimeRef.current = time;
    
    // If muteSubdivisions is true, only play if it's the main beat OR if it's an accent
    if (muteSubdivisionsRef.current && isSubdivision && !isAccent) return;
    
    const osc = audioContextRef.current.createOscillator();
    const envelope = audioContextRef.current.createGain();

    // Consistent volume (reduced by 30% from 8.0)
    const baseGain = 5.6 * metronomeVolumeRef.current;

    // All beats use the high-pitch accent sound
    osc.frequency.value = 1200;
    
    // Explicitly set gain at start time for consistency
    envelope.gain.setValueAtTime(baseGain, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(envelope);
    envelope.connect(audioContextRef.current.destination);

    osc.start(time);
    osc.stop(time + 0.05);
  }, []);

  const playSnare = useCallback((time: number, volumeMultiplier: number = 1.0) => {
    if (!audioContextRef.current) return;

    const finalVolume = drumVolumeRef.current * volumeMultiplier;

    // Noise component for snare
    const bufferSize = audioContextRef.current.sampleRate * 0.1;
    const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioContextRef.current.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = audioContextRef.current.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseEnvelope = audioContextRef.current.createGain();
    noiseEnvelope.gain.setValueAtTime(0.3 * finalVolume, time); // Adjusted volume
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01 * finalVolume, time + 0.1);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseEnvelope);
    noiseEnvelope.connect(audioContextRef.current.destination);

    // Tone component for snare
    const osc = audioContextRef.current.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);

    const oscEnvelope = audioContextRef.current.createGain();
    oscEnvelope.gain.setValueAtTime(0.24 * finalVolume, time); // Adjusted volume
    oscEnvelope.gain.exponentialRampToValueAtTime(0.01 * finalVolume, time + 0.1);

    osc.connect(oscEnvelope);
    oscEnvelope.connect(audioContextRef.current.destination);

    noise.start(time);
    osc.start(time);
    noise.stop(time + 0.1);
    osc.stop(time + 0.1);
  }, []);

  const playBassDrum = useCallback((time: number, volumeMultiplier: number = 1.0) => {
    if (!audioContextRef.current) return;

    const finalVolume = drumVolumeRef.current * volumeMultiplier;

    const osc = audioContextRef.current.createOscillator();
    const envelope = audioContextRef.current.createGain();

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

    envelope.gain.setValueAtTime(0.5 * finalVolume, time);
    envelope.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    osc.connect(envelope);
    envelope.connect(audioContextRef.current.destination);

    osc.start(time);
    osc.stop(time + 0.5);
  }, []);

  const playHiHat = useCallback((time: number, volumeMultiplier: number = 1.0) => {
    if (!audioContextRef.current) return;

    const finalVolume = drumVolumeRef.current * volumeMultiplier;

    const bufferSize = audioContextRef.current.sampleRate * 0.05;
    const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioContextRef.current.createBufferSource();
    noise.buffer = buffer;

    const filter = audioContextRef.current.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const envelope = audioContextRef.current.createGain();
    envelope.gain.setValueAtTime(0.2 * finalVolume, time);
    envelope.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.connect(filter);
    filter.connect(envelope);
    envelope.connect(audioContextRef.current.destination);

    noise.start(time);
    noise.stop(time + 0.05);
  }, []);

  const scheduler = useCallback(() => {
    if (!audioContextRef.current || !isPlayingRef.current) return;

    while (nextNoteTimeRef.current < audioContextRef.current.currentTime + 0.1) {
      if (!isPlayingRef.current) break;
      
      const isFirstBeat = currentBeatRef.current === 0 && currentSubdivisionRef.current === 0;
      const isSubdivision = currentSubdivisionRef.current !== 0;
      const isAccent = accentPatternRef.current.includes(currentTickRef.current);
      
      if (onTickRef.current) {
        onTickRef.current(currentTickRef.current, currentBeatRef.current, currentSubdivisionRef.current, nextNoteTimeRef.current);
      }

      if (!isPlayingRef.current) break;
      
      if (muteTicksCountRef.current > 0) {
        muteTicksCountRef.current -= 1;
      } else {
        playClick(nextNoteTimeRef.current, isFirstBeat, isSubdivision, isAccent);
      }

      if (!isPlayingRef.current) break;

      const secondsPerBeat = 60.0 / bpmRef.current;
      const secondsPerSubdivision = secondsPerBeat / subdivisionRef.current;
      nextNoteTimeRef.current += secondsPerSubdivision;
      
      let nextSub = currentSubdivisionRef.current + 1;
      let nextBeat = currentBeatRef.current;
      let nextTick = currentTickRef.current + 1;

      if (nextSub >= subdivisionRef.current) {
        nextSub = 0;
        nextBeat = (nextBeat + 1) % 4;
      }

      if (nextTick >= (4 * subdivisionRef.current)) {
        nextTick = 0;
      }

      currentSubdivisionRef.current = nextSub;
      currentBeatRef.current = nextBeat;
      currentTickRef.current = nextTick;
      
      setCurrentSubdivision(nextSub);
      setCurrentBeat(nextBeat);
      setCurrentTick(nextTick);
    }
    
    if (isPlayingRef.current) {
      timerIDRef.current = window.setTimeout(scheduler, 25);
    }
  }, [playClick]);

  const toggleMetronome = useCallback((muteTicks: number = 0) => {
    if (!isPlayingRef.current) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      muteTicksCountRef.current = muteTicks;
      // Start slightly in the future to ensure stability
      nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.05;
      lastPlayedTimeRef.current = -1;
      currentBeatRef.current = 0;
      currentSubdivisionRef.current = 0;
      currentTickRef.current = 0;
      setCurrentBeat(0);
      setCurrentSubdivision(0);
      setCurrentTick(0);
      isPlayingRef.current = true;
      setIsPlaying(true);
      scheduler();
    } else {
      if (timerIDRef.current) {
        clearTimeout(timerIDRef.current);
      }
      
      isPlayingRef.current = false;
      setIsPlaying(false);
      currentBeatRef.current = 0;
      currentSubdivisionRef.current = 0;
      currentTickRef.current = 0;
      setCurrentBeat(0);
      setCurrentSubdivision(0);
      setCurrentTick(0);
    }
  }, [scheduler]);

  useEffect(() => {
    return () => {
      if (timerIDRef.current) {
        clearTimeout(timerIDRef.current);
      }
    };
  }, []);

  return {
    isPlaying,
    bpm,
    setBpm,
    subdivision,
    setSubdivision,
    accentPattern,
    setAccentPattern,
    currentBeat,
    currentSubdivision,
    currentTick,
    toggleMetronome,
    playClick,
    playSnare,
    playBassDrum,
    playHiHat,
    onTickRef,
  };
};
