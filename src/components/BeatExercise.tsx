import { useState, useEffect, useRef, useCallback, FC } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Sliders, Trash2, Delete } from 'lucide-react';
import { useMetronome } from '../hooks/useMetronome';
import confetti from 'canvas-confetti';

const TOTAL_BEATS = 4; // Number of tiles in a sequence
const PATTERN_COUNT = 9;

interface BeatPattern {
  id: number;
  bass: string; // 8 characters (2 beats * 4 subdivisions)
}

interface CustomPattern {
  id: number;
  beatType: '4' | '8' | '16';
}

const BEAT_PATTERNS: BeatPattern[] = [
  { id: 0, bass: 'xxxxxxxx' }, // Pattern 0 has no bass drum
  { id: 1, bass: 'oxxxxxxx' },
  { id: 2, bass: 'xxoxxxxx' },
  { id: 3, bass: 'xxxxoxxx' },
  { id: 4, bass: 'xxxxxxox' },
  { id: 5, bass: 'oxoxxxxx' },
  { id: 6, bass: 'oxxxxxox' },
  { id: 7, bass: 'oxxxoxxx' },
  { id: 8, bass: 'xxoxxxox' },
];

const BASS_DRUM_NOTATION: Record<number, Array<'note' | 'quarterNote' | 'quarterRest' | 'eighthRest' | null>> = {
  0: [null, null, null, null],
  1: ['quarterNote', null, 'quarterRest', null],
  2: ['eighthRest', 'note', 'quarterRest', null],
  3: ['quarterRest', null, 'quarterNote', null],
  4: ['quarterRest', null, 'eighthRest', 'note'],
  5: ['note', 'note', 'quarterRest', null],
  6: ['quarterNote', null, 'eighthRest', 'note'],
  7: ['quarterNote', null, 'quarterNote', null],
  8: ['eighthRest', 'note', 'eighthRest', 'note'],
};

const SNARE_PATTERN = 'xxxxoxxx';

const HIHAT_PATTERNS = {
  '4': 'oxxxoxxx',
  '8': 'oxoxoxox',
  '16': 'oooooooo',
};

// Special patterns for Tile 0
const TILE_0_PATTERNS = {
  '4': { hihat: 'oxxxoxxx', snare: 'xxxxoxxx', bass: 'xxxxxxxx' },
  '8': { hihat: 'oxoxoxox', snare: 'xxxxoxxx', bass: 'xxxxxxxx' },
  '16': { hihat: 'ooooxooo', snare: 'xxxxoxxx', bass: 'xxxxxxxx' },
};

export default function BeatExercise({ metronomeVolume = 0.8, drumVolume = 1.0 }: { metronomeVolume?: number, drumVolume?: number }) {
  const [startBpm, setStartBpm] = useState(60);
  const [endBpm, setEndBpm] = useState(100);
  const [bpm, setBpm] = useState(60);
  const [beatType, setBeatType] = useState<'4' | '8' | '16'>('4');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customSequence, setCustomSequence] = useState<CustomPattern[]>([]);
  const [currentPatternIndex, setCurrentPatternIndex] = useState(-1); 
  const [preCountDisplay, setPreCountDisplay] = useState('');
  const [isFixedSpeed, setIsFixedSpeed] = useState(false);

  const toggleCustomMode = (val: boolean) => {
    setIsCustomMode(val);
    if (val) {
      setIsFixedSpeed(true);
    } else {
      setIsFixedSpeed(false);
    }
  };

  const [showControls, setShowControls] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const handleCloseControls = () => setShowControls(false);
    window.addEventListener('closeControls', handleCloseControls);
    return () => window.removeEventListener('closeControls', handleCloseControls);
  }, []);

  const toggleControls = useCallback((val: boolean) => {
    setShowControls(val);
  }, []);

  useEffect(() => {
    if (showControls) {
      window.dispatchEvent(new CustomEvent('closeSettings'));
    }
  }, [showControls]);

  const [sessionStartBpm, setSessionStartBpm] = useState(60);
  const [portalNodes, setPortalNodes] = useState<{ controls: HTMLElement | null; start: HTMLElement | null; tools: HTMLElement | null }>({ controls: null, start: null, tools: null });
  const controlsRef = useRef<HTMLDivElement>(null);

  const { isPlaying, toggleMetronome, playSnare, playBassDrum, playHiHat, onTickRef } = useMetronome(bpm, 4, true, metronomeVolume, drumVolume);

  const bpmRef = useRef(bpm);
  const endBpmRef = useRef(endBpm);
  const isFixedSpeedRef = useRef(isFixedSpeed);
  const isPlayingRef = useRef(isPlaying);
  const isCustomModeRef = useRef(isCustomMode);
  const customSequenceRef = useRef(customSequence);
  const currentPatternIndexRef = useRef(-1);
  const preCountRef = useRef(0);
  const repetitionRef = useRef(0);
  const beatTypeRef = useRef(beatType);

  useEffect(() => {
    const controls = document.getElementById('speed-up-controls-portal');
    const start = document.getElementById('speed-up-start-portal');
    const tools = document.getElementById('custom-tools-portal');
    setPortalNodes({ controls, start, tools });
  }, []);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { endBpmRef.current = endBpm; }, [endBpm]);
  useEffect(() => { isFixedSpeedRef.current = isFixedSpeed; }, [isFixedSpeed]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isCustomModeRef.current = isCustomMode; }, [isCustomMode]);
  useEffect(() => { customSequenceRef.current = customSequence; }, [customSequence]);
  useEffect(() => { beatTypeRef.current = beatType; }, [beatType]);

  const handleToggle = useCallback(() => {
    if (!isPlaying) {
      window.dispatchEvent(new CustomEvent('closeSettings'));
      window.dispatchEvent(new CustomEvent('closeControls'));
      setIsFinished(false);
      setBpm(startBpm);
      setSessionStartBpm(startBpm);
      setCurrentPatternIndex(-1);
      setPreCountDisplay('READY');
      preCountRef.current = 0;
      repetitionRef.current = 0;
      currentPatternIndexRef.current = -1;
      isPlayingRef.current = true;
      toggleMetronome(0); // No mute ticks for pre-count
    } else {
      isPlayingRef.current = false;
      toggleMetronome();
    }
  }, [isPlaying, startBpm, toggleMetronome]);

  const handleClear = () => setCustomSequence([]);
  const handleBackspace = () => setCustomSequence(prev => prev.slice(0, -1));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();
      const code = e.code;

      if (code === 'Space') {
        e.preventDefault();
        handleToggle();
      } else if (key === 'escape') {
        setShowControls(false);
      } else if (key === 'c' || key === 'ㅊ' || code === 'KeyC') {
        e.preventDefault();
        toggleControls(!showControls);
      } else if (key === 'd' || key === 'ㅇ') {
        e.preventDefault();
        setIsCustomMode(prev => !prev);
        setShowControls(true);
      } else if (key === '1') {
        e.preventDefault();
        setBeatType('4');
      } else if (key === '2') {
        e.preventDefault();
        setBeatType('8');
      } else if (key === '3') {
        e.preventDefault();
        setBeatType('16');
      } else if (code === 'ArrowRight') {
        if (!isPlayingRef.current) {
          e.preventDefault();
          setStartBpm(prev => Math.min(prev + 5, endBpmRef.current));
          setBpm(prev => Math.min(prev + 5, endBpmRef.current));
          setShowControls(true);
        }
      } else if (code === 'ArrowLeft') {
        if (!isPlayingRef.current) {
          e.preventDefault();
          setStartBpm(prev => Math.max(prev - 5, 40));
          setBpm(prev => Math.max(prev - 5, 40));
          setShowControls(true);
        }
      } else if (key === '.') {
        if (!isPlayingRef.current) {
          e.preventDefault();
          setEndBpm(prev => Math.min(prev + 5, 250));
          setShowControls(true);
        }
      } else if (key === ',') {
        if (!isPlayingRef.current) {
          e.preventDefault();
          setEndBpm(prev => Math.max(prev - 5, startBpm + 5));
          setShowControls(true);
        }
      } else if (isCustomMode && (key === 'backspace' || code === 'Backspace')) {
        e.preventDefault();
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleClickOutside = (e: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
        setShowControls(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleToggle, isCustomMode, toggleControls, showControls, startBpm]);

  onTickRef.current = useCallback((tick: number, beat: number, sub: number, time: number) => {
    if (!isPlayingRef.current) return;

    const UI_DELAY = 150;

    // Pre-count logic
    if (currentPatternIndexRef.current === -1) {
      if (sub === 0) {
        preCountRef.current += 1;
        const count = preCountRef.current;
        setTimeout(() => {
          if (!isPlayingRef.current) return;
          if (count <= 4) {
            setPreCountDisplay(count.toString());
          } else {
            setPreCountDisplay('');
            setCurrentPatternIndex(0);
          }
        }, UI_DELAY);
      }
      
      if (preCountRef.current <= 4) return;
      
      // Start playback after 4 beats
      currentPatternIndexRef.current = 0;
    }

    // Playback logic
    const sequence = isCustomModeRef.current ? customSequenceRef.current : [0, 1, 2, 3, 4, 5, 6, 7, 8].map(id => ({ id, beatType: beatTypeRef.current }));
    if (sequence.length === 0) return;

    const tileBeatIndex = beat % 2;
    const subIndex = tileBeatIndex * 4 + sub;
    
    const patternData = sequence[currentPatternIndexRef.current % sequence.length];
    const patternId = patternData.id;
    const currentPatternBeatType = patternData.beatType;
    
    // Determine patterns based on whether it's Tile 0 or not
    let currentBass: string;
    let currentSnare: string;
    let currentHihat: string;

    if (patternId === 0) {
      const special = TILE_0_PATTERNS[currentPatternBeatType];
      currentBass = special.bass;
      currentSnare = special.snare;
      currentHihat = special.hihat;
    } else {
      const pattern = BEAT_PATTERNS.find(p => p.id === patternId) || BEAT_PATTERNS[0];
      currentBass = pattern.bass;
      currentSnare = SNARE_PATTERN;
      currentHihat = HIHAT_PATTERNS[currentPatternBeatType];
    }
    
    // Bass Drum
    if (currentBass[subIndex] === 'o') {
      playBassDrum(time);
    }
    
    // Snare
    if (currentSnare[subIndex] === 'o') {
      playSnare(time);
    }
    
    // Hi-Hat
    if (currentHihat[subIndex] === 'o') {
      playHiHat(time);
    }

    // Move to next tile every 2 beats
    if (tileBeatIndex === 1 && sub === 3) {
      if (!isCustomModeRef.current) {
        repetitionRef.current += 1;
        if (repetitionRef.current < 2) {
          // Play same tile again
          return;
        }
        repetitionRef.current = 0;
      }

      const nextIdx = currentPatternIndexRef.current + 1;
      
      if (!isCustomModeRef.current && nextIdx >= sequence.length) {
        // Basic mode: end of sequence, check for BPM increase
        if (isFixedSpeedRef.current) {
          currentPatternIndexRef.current = 0;
          setTimeout(() => {
            if (!isPlayingRef.current) return;
            setCurrentPatternIndex(0);
          }, UI_DELAY);
        } else {
          const nextBpm = bpmRef.current + 5;
          if (nextBpm > endBpmRef.current) {
            toggleMetronome();
            isPlayingRef.current = false;
            setTimeout(() => {
              setIsFinished(true);
              confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
              setTimeout(() => setIsFinished(false), 3000);
            }, UI_DELAY);
          } else {
            setTimeout(() => {
              if (!isPlayingRef.current) return;
              setBpm(nextBpm);
              setCurrentPatternIndex(-1);
              setPreCountDisplay('READY');
            }, UI_DELAY);
            currentPatternIndexRef.current = -1;
            preCountRef.current = 0;
            repetitionRef.current = 0;
          }
        }
      } else {
        // Move to next tile or loop custom sequence
        const targetIdx = isCustomModeRef.current ? (nextIdx % sequence.length) : nextIdx;
        currentPatternIndexRef.current = targetIdx;
        setTimeout(() => {
          if (!isPlayingRef.current) return;
          setCurrentPatternIndex(targetIdx);
        }, UI_DELAY);
      }
    }
  }, [playBassDrum, playSnare, playHiHat, toggleMetronome]);

  return (
    <div className="flex flex-col h-full items-center justify-start pt-[5px] relative">
      {portalNodes.tools && createPortal(
        <div className="flex items-center gap-1.5 mr-[-8px]">
          {/* Beat Type Selector */}
          <div className="flex bg-[#b47e6a]/5 p-0.5 rounded-lg border border-[#b47e6a]/10">
            {(['4', '8', '16'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setBeatType(type)}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[7px] sm:text-[8px] font-bold transition-all whitespace-nowrap ${
                  beatType === type 
                    ? 'bg-[#ff7c5c] text-white shadow-lg shadow-[#ff7c5c]/20' 
                    : 'text-[#b47e6a]/40 hover:bg-[#b47e6a]/5'
                }`}
              >
                {type} BEAT
              </button>
            ))}
          </div>
        </div>,
        portalNodes.tools
      )}

      {portalNodes.controls && createPortal(
        <div className="relative" ref={controlsRef}>
          <button
            onClick={() => toggleControls(!showControls)}
            className={`p-2.5 rounded-xl transition-all active:scale-95 border ${showControls ? 'bg-[#ff7c5c] text-white border-[#ff7c5c]' : 'bg-[#d6cdc4]/20 border-[#d6cdc4]/30 text-[#b47e6a] hover:bg-[#d6cdc4]/30'}`}
          >
            <Sliders size={18} />
          </button>
          
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full right-0 mt-2 w-64 bg-white/95 backdrop-blur-md border border-[#b47e6a]/10 rounded-2xl p-4 shadow-2xl z-[60]"
              >
                <div className="space-y-4">
                  <ControlGroup label="Start BPM" value={startBpm} onChange={setStartBpm} min={40} max={endBpm} disabled={isPlaying} />
                  <ControlGroup label="End BPM" value={endBpm} onChange={setEndBpm} min={startBpm} max={250} disabled={isPlaying} />
                  
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-[#b47e6a]/40 uppercase tracking-widest">Practice Flow</span>
                    <div className="flex gap-1 bg-[#b47e6a]/5 p-1 rounded-xl border border-[#b47e6a]/10">
                      <button
                        onClick={() => setIsFixedSpeed(false)}
                        disabled={isPlaying}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${!isFixedSpeed ? 'bg-[#ff7c5c] text-white shadow-lg' : 'text-[#b47e6a]/40 hover:bg-[#b47e6a]/5'}`}
                      >
                        Speed Up
                      </button>
                      <button
                        onClick={() => setIsFixedSpeed(true)}
                        disabled={isPlaying}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isFixedSpeed ? 'bg-[#ff7c5c] text-white shadow-lg' : 'text-[#b47e6a]/40 hover:bg-[#b47e6a]/5'}`}
                      >
                        Fixed
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-[#b47e6a]/40 uppercase tracking-widest">Mode</span>
                    <div className="flex gap-1 bg-[#b47e6a]/5 p-1 rounded-xl border border-[#b47e6a]/10">
                      <button
                        onClick={() => toggleCustomMode(false)}
                        disabled={isPlaying}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${!isCustomMode ? 'bg-[#ff7c5c] text-white shadow-lg' : 'text-[#b47e6a]/40 hover:bg-[#b47e6a]/5'}`}
                      >
                        Basic
                      </button>
                      <button
                        onClick={() => toggleCustomMode(true)}
                        disabled={isPlaying}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isCustomMode ? 'bg-[#ff7c5c] text-white shadow-lg' : 'text-[#b47e6a]/40 hover:bg-[#b47e6a]/5'}`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        portalNodes.controls
      )}

      {portalNodes.start && createPortal(
        <button
          onClick={handleToggle}
          className={`px-6 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all min-w-[120px] ${isPlaying ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20' : isFinished ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-[#ff7c5c] hover:bg-[#ff6b4a] shadow-lg shadow-[#ff7c5c]/20'}`}
        >
          <AnimatePresence mode="wait">
            {isFinished ? (
              <motion.span key="fin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>FINISHED</motion.span>
            ) : isPlaying ? (
              <motion.div key="stop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Square className="w-4 h-4 fill-current" /><span>STOP</span>
              </motion.div>
            ) : (
              <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Play className="w-4 h-4 fill-current" /><span>START</span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>,
        portalNodes.start
      )}

      <div className="w-full flex flex-col gap-0.5 items-center flex-1 justify-start pt-2 max-w-4xl min-h-0">
        <div className="bg-[#b47e6a]/5 rounded-2xl border border-[#b47e6a]/10 p-1 flex flex-col items-center justify-center relative w-full">
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <AnimatePresence mode="wait">
              {isPlaying && currentPatternIndex < 0 && preCountDisplay && (
                <motion.div
                  key={preCountDisplay}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  transition={{ duration: 0.1 }}
                  className="text-7xl font-black text-[#ff7c5c] drop-shadow-[0_0_30px_rgba(255,124,92,0.5)]"
                >
                  {preCountDisplay}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-1 w-full items-center">
            {isCustomMode ? (
              <div className="grid grid-cols-4 gap-1 w-full max-w-md">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square bg-white rounded-2xl border border-black/10 flex items-center justify-center relative overflow-hidden">
                    {customSequence[i] !== undefined ? (
                      <BeatNotation patternId={customSequence[i].id} active={currentPatternIndex === i} beatType={customSequence[i].beatType} />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-black/10" />
                    )}
                    {currentPatternIndex === i && isPlaying && (
                      <motion.div layoutId="active-border" className="absolute inset-0 border-2 border-[#ff7c5c] rounded-2xl z-10" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1 w-full items-center">
                {/* Row 1: Pattern 0 */}
                <div className="grid grid-cols-4 gap-1 w-full max-w-md">
                  <div className="aspect-square bg-white rounded-2xl border border-black/10 flex items-center justify-center relative overflow-hidden">
                    <BeatNotation patternId={0} active={currentPatternIndex === 0} beatType={beatType} />
                    {currentPatternIndex === 0 && isPlaying && (
                      <motion.div layoutId="active-border" className="absolute inset-0 border-2 border-[#ff7c5c] rounded-2xl z-10" />
                    )}
                  </div>
                  <div className="col-span-3 flex items-center pl-4">
                    <span className="text-[10px] font-bold text-[#ff7c5c] uppercase tracking-widest bg-[#ff7c5c]/10 px-2 py-1 rounded-full border border-[#ff7c5c]/20">
                      2 times each
                    </span>
                  </div>
                </div>
                
                {/* Row 2: Patterns 1-4 */}
                <div className="grid grid-cols-4 gap-1 w-full max-w-md">
                  {[1, 2, 3, 4].map((id, i) => {
                    const active = currentPatternIndex === id;
                    return (
                      <div key={id} className="aspect-square bg-white rounded-2xl border border-[#b47e6a]/10 flex items-center justify-center relative overflow-hidden">
                        <BeatNotation patternId={id} active={active} beatType={beatType} />
                        {active && isPlaying && (
                          <motion.div layoutId="active-border" className="absolute inset-0 border-2 border-[#ff7c5c] rounded-2xl z-10" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Row 3: Patterns 5-8 */}
                <div className="grid grid-cols-4 gap-1 w-full max-w-md">
                  {[5, 6, 7, 8].map((id, i) => {
                    const active = currentPatternIndex === id;
                    return (
                      <div key={id} className="aspect-square bg-white rounded-2xl border border-[#b47e6a]/10 flex items-center justify-center relative overflow-hidden">
                        <BeatNotation patternId={id} active={active} beatType={beatType} />
                        {active && isPlaying && (
                          <motion.div layoutId="active-border" className="absolute inset-0 border-2 border-[#ff7c5c] rounded-2xl z-10" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {isCustomMode && (
            <div className="mt-4 bg-[#b47e6a]/5 rounded-2xl border border-[#b47e6a]/10 overflow-hidden w-full max-w-md">
              <div className="p-4 border-b border-[#b47e6a]/5 flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#b47e6a]/40 uppercase tracking-widest block">Add Patterns</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBackspace}
                    className="p-1.5 rounded-lg bg-[#b47e6a]/5 border border-[#b47e6a]/10 text-[#b47e6a]/40 hover:text-[#b47e6a] hover:bg-[#b47e6a]/10 transition-all active:scale-95"
                    title="Backspace"
                  >
                    <Delete size={14} />
                  </button>
                  <button
                    onClick={handleClear}
                    className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/20 transition-all active:scale-95"
                    title="Clear All"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="p-2">
                <div className="flex flex-col gap-0.5 items-center">
                  {/* Row 1: Pattern 0 */}
                  <div className="grid grid-cols-4 gap-0.5 w-full">
                    <div className="flex justify-center">
                      <button
                        onClick={() => {
                          if (customSequence.length < 4) {
                            setCustomSequence(prev => [...prev, { id: 0, beatType }]);
                          }
                        }}
                        disabled={isPlaying || customSequence.length >= 4}
                        className="w-[70px] h-[70px] bg-white rounded-xl border border-[#b47e6a]/10 flex items-center justify-center hover:bg-[#ff7c5c]/5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none p-1"
                      >
                        <BeatNotation patternId={0} active={true} beatType={beatType} isSmall />
                      </button>
                    </div>
                    <div className="col-span-3" />
                  </div>

                  {/* Row 2: 1-4 */}
                  <div className="grid grid-cols-4 gap-0.5 w-full">
                    {[1, 2, 3, 4].map(id => (
                      <div key={id} className="flex justify-center">
                        <button
                          onClick={() => {
                            if (customSequence.length < 4) {
                              setCustomSequence(prev => [...prev, { id, beatType }]);
                            }
                          }}
                          disabled={isPlaying || customSequence.length >= 4}
                          className="w-[70px] h-[70px] bg-white rounded-xl border border-[#b47e6a]/10 flex items-center justify-center hover:bg-[#ff7c5c]/5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none p-1"
                        >
                          <BeatNotation patternId={id} active={true} beatType={beatType} isSmall />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Row 3: 5-8 */}
                  <div className="grid grid-cols-4 gap-0.5 w-full">
                    {[5, 6, 7, 8].map(id => (
                      <div key={id} className="flex justify-center">
                        <button
                          onClick={() => {
                            if (customSequence.length < 4) {
                              setCustomSequence(prev => [...prev, { id, beatType }]);
                            }
                          }}
                          disabled={isPlaying || customSequence.length >= 4}
                          className="w-[70px] h-[70px] bg-white rounded-xl border border-[#b47e6a]/10 flex items-center justify-center hover:bg-[#ff7c5c]/5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none p-1"
                        >
                          <BeatNotation patternId={id} active={true} beatType={beatType} isSmall />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isCustomMode && (
          <div className="bg-white/5 p-2 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center text-[9px] font-medium text-white/40 uppercase tracking-widest mb-1.5">
              <div className="flex items-center gap-3">
                <span>Progress</span>
                <span className="text-white/80 font-bold text-sm">
                  {bpm} <span className="text-[8px] font-normal opacity-50">BPM</span>
                </span>
              </div>
              {!isFixedSpeed && (
                <div className="flex items-center gap-1">
                  <span className="text-white/60 font-bold">
                    {Math.floor((bpm - sessionStartBpm) / 5) + 1}
                  </span>
                  <span className="opacity-30">/</span>
                  <span className="opacity-50">
                    {Math.floor((endBpm - sessionStartBpm) / 5) + 1}
                  </span>
                  <span className="ml-1 text-[7px] opacity-30">STEPS</span>
                </div>
              )}
            </div>
            <div className="h-1.5 bg-[#b47e6a]/5 rounded-full overflow-hidden border border-[#b47e6a]/10">
              <motion.div 
                className="h-full bg-[#ff7c5c] shadow-[0_0_20px_rgba(255,124,92,0.5)]"
                animate={{ 
                  width: isFixedSpeed ? '100%' : `${(Math.max(0, bpm - sessionStartBpm) / Math.max(1, endBpm - sessionStartBpm)) * 100}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface BeatNotationProps {
  patternId: number;
  active: boolean;
  beatType: '4' | '8' | '16';
  isSmall?: boolean;
}

const BeatNotation: FC<BeatNotationProps> = ({ patternId, active, beatType, isSmall }) => {
  // Determine patterns based on whether it's Tile 0 or not
  let currentSnare: string;
  let currentHihat: string;

  if (patternId === 0) {
    const special = TILE_0_PATTERNS[beatType];
    currentSnare = special.snare;
    currentHihat = special.hihat;
  } else {
    currentSnare = SNARE_PATTERN;
    currentHihat = HIHAT_PATTERNS[beatType];
  }

  const opacity = active ? 1 : 0.7;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full p-1">
      {/* Staff lines */}
      {[30, 40, 50, 60, 70].map(y => (
        <line key={y} x1="5" y1={y} x2="95" y2={y} stroke="black" strokeWidth="0.5" opacity="0.15" />
      ))}
      
      {/* Snare (Above Middle line - y=50) */}
      {currentSnare.split('').map((char, i) => {
        if (char === 'x') return null;
        const x = 15 + i * 10;
        return (
          <g key={`sn-${i}`} opacity={opacity}>
            <ellipse cx={x} cy={45} rx="5" ry="3.5" fill="black" transform={`rotate(-20 ${x} 45)`} />
            {/* Stem connected to hi-hat stem (x+3) */}
            <line x1={x+3} y1={45} x2={x+3} y2={5} stroke="black" strokeWidth="1.5" />
          </g>
        );
      })}

      {/* Hi-Hat (Above Top line - y=30) */}
      {currentHihat.split('').map((char, i) => {
        if (char === 'x') return null;
        // 16-beat: Hide hi-hat if snare is present at the same position
        if (beatType === '16' && currentSnare[i] === 'o') return null;
        
        const x = 15 + i * 10;
        return (
          <g key={`hh-${i}`} opacity={opacity}>
            <line x1={x-3} y1={22} x2={x+3} y2={28} stroke="black" strokeWidth="2" />
            <line x1={x-3} y1={28} x2={x+3} y2={22} stroke="black" strokeWidth="2" />
            {/* Stem on the right side of the X, connects down to snare if snare exists */}
            <line x1={x+3} y1={25} x2={x+3} y2={5} stroke="black" strokeWidth="1.5" />
          </g>
        );
      })}

      {/* Hi-Hat Beams */}
      {beatType === '8' && (
        <line 
          x1={15 + 0 * 10 + 3} y1={5} 
          x2={15 + 6 * 10 + 3} y2={5} 
          stroke="black" strokeWidth="2" 
          opacity={opacity} 
        />
      )}
      {beatType === '16' && (
        <>
          {/* Group 1 (first 4) */}
          <line 
            x1={15 + 0 * 10 + 3} y1={5} 
            x2={15 + 3 * 10 + 3} y2={5} 
            stroke="black" strokeWidth="2" 
            opacity={opacity} 
          />
          <line 
            x1={15 + 0 * 10 + 3} y1={10} 
            x2={15 + 3 * 10 + 3} y2={10} 
            stroke="black" strokeWidth="2" 
            opacity={opacity} 
          />
          {/* Group 2 (last 4) */}
          <line 
            x1={15 + 4 * 10 + 3} y1={5} 
            x2={15 + 7 * 10 + 3} y2={5} 
            stroke="black" strokeWidth="2" 
            opacity={opacity} 
          />
          <line 
            x1={15 + 4 * 10 + 3} y1={10} 
            x2={15 + 7 * 10 + 3} y2={10} 
            stroke="black" strokeWidth="2" 
            opacity={opacity} 
          />
        </>
      )}

      {/* Bass Drum (Above Bottom line - y=70) */}
      {(() => {
        const notation = BASS_DRUM_NOTATION[patternId] || [null, null, null, null];
        
        const isBeamed = (idx: number) => {
          return (idx > 0 && notation[idx] === 'note' && notation[idx-1] === 'note') ||
                 (idx < 3 && notation[idx] === 'note' && notation[idx+1] === 'note');
        };

        return (
          <g>
            {/* Beams */}
            {notation.map((type, i) => {
              if (i < 3 && type === 'note' && notation[i+1] === 'note') {
                return (
                  <rect 
                    key={`bd-beam-${i}`}
                    x={15 + i * 20 - 5} y={83} 
                    width={20} height={4} 
                    fill="black" 
                    opacity={opacity}
                  />
                );
              }
              return null;
            })}

            {/* Notes and Rests */}
            {notation.map((type, i) => {
              const x = 15 + i * 20;
              if (!type) return null;

              if (type === 'note' || type === 'quarterNote') {
                return (
                  <g key={`bd-${i}`} opacity={opacity}>
                    <ellipse cx={x} cy={65} rx="5" ry="3.5" fill="black" transform={`rotate(-20 ${x} 65)`} />
                    <line x1={x-5} y1={65} x2={x-5} y2={85} stroke="black" strokeWidth="1.5" />
                    {type === 'note' && !isBeamed(i) && (
                      <path 
                        d={`M ${x-5},${85} c 2,-2 5,-4 5,-10`} 
                        stroke="black" 
                        strokeWidth="1.5" 
                        fill="none" 
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                );
              } else if (type === 'quarterRest') {
                return (
                  <g key={`bd-qrest-${i}`} opacity={opacity}>
                    <path 
                      d={`M ${x-2},${54} l 4,4 l -6,6 l 6,0 l -7,10 c 0,2 3,3 5,0`} 
                      stroke="black" 
                      strokeWidth="2.5" 
                      fill="none" 
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              } else if (type === 'eighthRest') {
                return (
                  <g key={`bd-erest-${i}`} opacity={opacity}>
                    <circle cx={x-1.5} cy={60} r="2.2" fill="black" />
                    <path 
                      d={`M ${x-1.5},${60} c 4,-3 6,1 3,6 l -5,12`} 
                      stroke="black" 
                      strokeWidth="2.5" 
                      fill="none" 
                      strokeLinecap="round"
                    />
                  </g>
                );
              }
              return null;
            })}
          </g>
        );
      })()}
    </svg>
  );
};

function ControlGroup({ label, value, onChange, min, max, disabled }: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
}) {
  return (
    <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-end">
        <label className="text-[10px] font-medium text-[#b47e6a]/40 uppercase tracking-widest">{label}</label>
        <span className="text-lg font-bold text-[#ff7c5c]">{value}</span>
      </div>
      <input 
        type="range" min={min} max={max} value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-[#ff7c5c] h-1.5 bg-[#b47e6a]/10 rounded-full appearance-none cursor-pointer"
      />
    </div>
  );
}
