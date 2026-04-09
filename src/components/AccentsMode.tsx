import { useState, useEffect, useRef, useCallback, FC } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Sliders, Delete, RotateCcw } from 'lucide-react';
import { useMetronome } from '../hooks/useMetronome';
import confetti from 'canvas-confetti';

interface AccentPattern {
  id: string;
  accents: boolean[]; // 4 notes per beat
  label: string;
}

const ACCENT_PATTERNS: AccentPattern[] = [
  { id: 'acc1', accents: [true, false, false, false], label: 'Accent 1' },
  { id: 'acc2', accents: [false, true, false, false], label: 'Accent 2' },
  { id: 'acc3', accents: [false, false, true, false], label: 'Accent 3' },
  { id: 'acc4', accents: [false, false, false, true], label: 'Accent 4' },
];

// Basic pattern sequence: 4x Pattern 1, 2x Pattern 2, 1x Pattern 3, 1x Pattern 4
const BASIC_SEQUENCE = [
  // 4 times each
  'acc1', 'acc1', 'acc1', 'acc1',
  'acc2', 'acc2', 'acc2', 'acc2',
  'acc3', 'acc3', 'acc3', 'acc3',
  'acc4', 'acc4', 'acc4', 'acc4',
  // 2 times each
  'acc1', 'acc1',
  'acc2', 'acc2',
  'acc3', 'acc3',
  'acc4', 'acc4',
  // 1 time each
  'acc1', 'acc2', 'acc3', 'acc4',
  // 1 time each again
  'acc1', 'acc2', 'acc3', 'acc4'
];

export default function AccentsMode({ metronomeVolume = 0.8, drumVolume = 1.0, isHandwriting = false }: { metronomeVolume?: number, drumVolume?: number, isHandwriting?: boolean }) {
  const [startBpm, setStartBpm] = useState(60);
  const [endBpm, setEndBpm] = useState(100);
  const [bpm, setBpm] = useState(60);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customSequence, setCustomSequence] = useState<string[]>([]);
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

  const { isPlaying, toggleMetronome, playSnare, onTickRef } = useMetronome(bpm, 4, true, metronomeVolume, drumVolume);

  const bpmRef = useRef(bpm);
  const endBpmRef = useRef(endBpm);
  const isFixedSpeedRef = useRef(isFixedSpeed);
  const isPlayingRef = useRef(isPlaying);
  const isCustomModeRef = useRef(isCustomMode);
  const customSequenceRef = useRef(customSequence);
  const currentPatternIndexRef = useRef(-1);
  const preCountRef = useRef(0);

  useEffect(() => {
    const controls = document.getElementById('speed-up-controls-portal');
    const start = document.getElementById('speed-up-start-portal');
    const tools = document.getElementById('custom-tools-portal');
    setPortalNodes({ controls, start, tools });
  }, []);

  useEffect(() => {
    bpmRef.current = bpm;
    endBpmRef.current = endBpm;
    isFixedSpeedRef.current = isFixedSpeed;
    isPlayingRef.current = isPlaying;
    isCustomModeRef.current = isCustomMode;
    customSequenceRef.current = customSequence;
  }, [bpm, endBpm, isFixedSpeed, isPlaying, isCustomMode, customSequence]);

  const isFirstPreCountTickRef = useRef(true);
  const isInitialStartRef = useRef(true);

  const handleToggle = useCallback(() => {
    const sequence = isCustomModeRef.current ? customSequenceRef.current : BASIC_SEQUENCE;
    if (isCustomModeRef.current && sequence.length === 0) return;

    if (!isPlaying) {
      window.dispatchEvent(new CustomEvent('closeSettings'));
      window.dispatchEvent(new CustomEvent('closeControls'));
      setIsFinished(false);
      setBpm(startBpm);
      setSessionStartBpm(startBpm);
      setCurrentPatternIndex(-1);
      setPreCountDisplay('READY');
      preCountRef.current = 0;
      currentPatternIndexRef.current = -1;
      isFirstPreCountTickRef.current = true;
      isInitialStartRef.current = true;
      setShowControls(false);
      isPlayingRef.current = true;
      toggleMetronome(8); // Mute 2 beats
    } else {
      isPlayingRef.current = false;
      toggleMetronome();
    }
  }, [isPlaying, startBpm, toggleMetronome]);

  const handleBackspace = useCallback(() => {
    if (isPlaying) return;
    setCustomSequence(prev => prev.slice(0, -1));
  }, [isPlaying]);

  const handleClear = useCallback(() => {
    if (isPlaying) return;
    setCustomSequence([]);
  }, [isPlaying]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
        setShowControls(false);
      }
    };

    if (showControls) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showControls]);

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
      } else if (code === 'Backspace') {
        if (isCustomModeRef.current && !isPlayingRef.current) {
          e.preventDefault();
          handleBackspace();
        }
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
          setEndBpm(prev => Math.min(prev + 5, 300));
          setShowControls(true);
        }
      } else if (key === ',') {
        if (!isPlayingRef.current) {
          e.preventDefault();
          setEndBpm(prev => Math.max(prev - 5, startBpm + 5));
          setShowControls(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggle, handleBackspace, startBpm, toggleControls, showControls]);

  onTickRef.current = useCallback((tick: number, beat: number, sub: number, time: number) => {
    if (!isPlayingRef.current) return;

    const UI_DELAY = 150;

    // Pre-count logic
    if (currentPatternIndexRef.current === -1) {
      if (sub === 0) {
        if (isFirstPreCountTickRef.current) {
          isFirstPreCountTickRef.current = false;
          setTimeout(() => {
            if (!isPlayingRef.current) return;
            setPreCountDisplay(isInitialStartRef.current ? 'READY' : '1');
          }, UI_DELAY);
        } else {
          preCountRef.current += 1;
          const currentPreCount = preCountRef.current;
          
          setTimeout(() => {
            if (!isPlayingRef.current) return;
            if (currentPreCount === 1) {
              setPreCountDisplay('READY');
            } else if (currentPreCount >= 2 && currentPreCount <= 5) {
              setPreCountDisplay((currentPreCount - 1).toString());
            } else if (currentPreCount === 6) {
              setPreCountDisplay('');
              setCurrentPatternIndex(0);
            }
          }, UI_DELAY);

          if (currentPreCount === 6) {
            currentPatternIndexRef.current = 0;
          }
        }
      }
      if (currentPatternIndexRef.current === -1) return;
    }

    // Pattern logic
    const sequence = isCustomModeRef.current ? customSequenceRef.current : BASIC_SEQUENCE;
    
    // Play 16th notes with accents
    if (sub === 0) {
      const patternId = sequence[currentPatternIndexRef.current];
      const pattern = ACCENT_PATTERNS.find(p => p.id === patternId);
      if (!pattern) return;

      const beatDuration = 60 / bpmRef.current;
      const noteDuration = beatDuration / 4;
      
      for (let i = 0; i < 4; i++) {
        const isAccent = pattern.accents[i];
        const volumeMultiplier = isAccent ? 1.3 : 0.9;
        playSnare(time + i * noteDuration, volumeMultiplier);
      }
    }

    // Move to next pattern in sequence at the end of the beat
    if (sub === 3) {
      const nextPatternIdx = currentPatternIndexRef.current + 1;
      if (nextPatternIdx >= sequence.length) {
        // Finished full cycle
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
            // Speed transition with pre-count
            currentPatternIndexRef.current = -1;
            preCountRef.current = 2; // Start from '2' (READY, 1, 2, 3, 4)
            isFirstPreCountTickRef.current = true;
            isInitialStartRef.current = false;
            
            setTimeout(() => {
              if (!isPlayingRef.current) return;
              setBpm(nextBpm);
              setCurrentPatternIndex(-1);
              setPreCountDisplay('');
            }, UI_DELAY);
          }
        }
      } else {
        currentPatternIndexRef.current = nextPatternIdx;
        setTimeout(() => {
          if (!isPlayingRef.current) return;
          setCurrentPatternIndex(nextPatternIdx);
        }, UI_DELAY);
      }
    }
  }, [playSnare, toggleMetronome]);

  const sequenceToRender = isCustomMode ? customSequence : BASIC_SEQUENCE;
  const activePatternId = currentPatternIndex >= 0 ? sequenceToRender[currentPatternIndex] : sequenceToRender[0];

  return (
    <div className="flex flex-col h-full items-center justify-start pt-[5px] relative">
      {/* Portals for Header Controls */}
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
                className="absolute top-full right-0 mt-2 w-72 bg-white/95 backdrop-blur-md border border-[#b47e6a]/10 rounded-2xl p-4 shadow-2xl z-[60]"
              >
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-medium text-[#b47e6a]/40 uppercase tracking-widest">Start BPM</label>
                      <span className="text-lg font-bold text-[#ff7c5c]">{startBpm}</span>
                    </div>
                    <input 
                      type="range" min={40} max={endBpm} step={5} value={startBpm} 
                      onChange={(e) => { setStartBpm(parseInt(e.target.value)); setBpm(parseInt(e.target.value)); }}
                      className="w-full accent-[#ff7c5c] h-1.5 bg-[#b47e6a]/10 rounded-full appearance-none cursor-pointer"
                      disabled={isPlaying}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-medium text-[#b47e6a]/40 uppercase tracking-widest">End BPM</label>
                      <span className="text-lg font-bold text-[#ff7c5c]">{endBpm}</span>
                    </div>
                    <input 
                      type="range" min={startBpm} max={300} step={5} value={endBpm} 
                      onChange={(e) => setEndBpm(parseInt(e.target.value))}
                      className="w-full accent-[#ff7c5c] h-1.5 bg-[#b47e6a]/10 rounded-full appearance-none cursor-pointer"
                      disabled={isPlaying}
                    />
                  </div>

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
                        onClick={() => { toggleCustomMode(false); handleClear(); }}
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

      {isCustomMode && portalNodes.tools && createPortal(
        <div className="flex items-center gap-2 mr-2">
          <button
            onClick={handleBackspace}
            disabled={isPlaying || customSequence.length === 0}
            className="p-2.5 rounded-xl bg-[#d6cdc4]/20 border border-[#d6cdc4]/30 text-[#b47e6a] hover:bg-[#d6cdc4]/30 transition-all disabled:opacity-20"
            title="Backspace"
          >
            <Delete size={18} />
          </button>
          <button
            onClick={handleClear}
            disabled={isPlaying || customSequence.length === 0}
            className="p-2.5 rounded-xl bg-[#d6cdc4]/20 border border-[#d6cdc4]/30 text-[#b47e6a] hover:bg-[#d6cdc4]/30 transition-all disabled:opacity-20"
            title="Clear"
          >
            <RotateCcw size={18} />
          </button>
        </div>,
        portalNodes.tools
      )}

      {portalNodes.start && createPortal(
        <button
          onClick={handleToggle}
          disabled={isCustomMode && customSequence.length === 0}
          className={`
            px-6 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all relative overflow-hidden min-w-[120px]
            ${isPlaying 
              ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20' 
              : isFinished 
                ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20'
                : 'bg-[#ff7c5c] hover:bg-[#ff6b4a] shadow-lg shadow-[#ff7c5c]/20'}
            text-white
            ${(isCustomMode && customSequence.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <AnimatePresence mode="wait">
            {isFinished ? (
              <motion.div key="finished" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center">
                <span>FINISHED</span>
              </motion.div>
            ) : isPlaying ? (
              <motion.div key="stop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Square className="w-4 h-4 fill-current" />
                <span>STOP</span>
              </motion.div>
            ) : (
              <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Play className="w-4 h-4 fill-current" />
                <span>START</span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>,
        portalNodes.start
      )}

      <div className="w-full flex flex-col gap-0.5 items-center flex-1 justify-start pt-2 max-w-4xl min-h-0">
        <div className="bg-white/5 rounded-2xl border border-white/10 p-1 flex flex-col items-center justify-center relative w-full">
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <AnimatePresence mode="wait">
              {isPlaying && currentPatternIndex < 0 && preCountDisplay && (
                <motion.div
                  key={preCountDisplay}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  transition={{ duration: 0.1 }}
                  className="text-7xl font-black text-indigo-500 drop-shadow-[0_0_30px_rgba(99,102,241,0.8)]"
                >
                  {preCountDisplay}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full max-w-md flex flex-col gap-1">
            {/* Visualization Grid */}
            <div className="grid grid-cols-4 gap-1">
              {[0, 1, 2, 3].map((i) => {
                let patternId = '';
                let active = false;

                if (isCustomMode) {
                  patternId = customSequence[i] || '';
                  active = isPlaying && currentPatternIndex === i;
                } else {
                  const measureIdx = Math.floor(Math.max(0, currentPatternIndex) / 4);
                  const beatInMeasure = Math.max(0, currentPatternIndex) % 4;
                  const patternIdx = measureIdx * 4 + i;
                  patternId = BASIC_SEQUENCE[patternIdx] || BASIC_SEQUENCE[patternIdx % BASIC_SEQUENCE.length];
                  active = isPlaying && currentPatternIndex >= 0 && beatInMeasure === i;
                }
                
                return (
                  <Tile 
                    key={`current-${i}`} 
                    active={active} 
                    type={patternId} 
                    isEmpty={isCustomMode && !patternId}
                    isHandwriting={isHandwriting}
                  />
                );
              })}
            </div>

            {!isCustomMode && (
              <>
                {/* Next Row */}
                <div className="grid grid-cols-4 gap-1 opacity-20 scale-95 origin-top">
                    {[0, 1, 2, 3].map((i) => {
                      const measureIdx = Math.floor(Math.max(0, currentPatternIndex) / 4) + 1;
                      const patternIdx = measureIdx * 4 + i;
                      const patternId = BASIC_SEQUENCE[patternIdx] || BASIC_SEQUENCE[patternIdx % BASIC_SEQUENCE.length];
                      return <Tile key={`next-${i}`} active={false} type={patternId} isHandwriting={isHandwriting} />;
                    })}
                  </div>
                  {/* Next Next Row */}
                  <div className="grid grid-cols-4 gap-1 opacity-10 scale-[0.9] origin-top">
                    {[0, 1, 2, 3].map((i) => {
                      const measureIdx = Math.floor(Math.max(0, currentPatternIndex) / 4) + 2;
                      const patternIdx = measureIdx * 4 + i;
                      const patternId = BASIC_SEQUENCE[patternIdx] || BASIC_SEQUENCE[patternIdx % BASIC_SEQUENCE.length];
                      return <Tile key={`next-next-${i}`} active={false} type={patternId} isHandwriting={isHandwriting} />;
                    })}
                  </div>
              </>
            )}

            {isCustomMode && (
              <div className="mt-4 bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Add Patterns</span>
                </div>
                <div className="p-2">
                  <div className="grid grid-cols-4 gap-1">
                    {ACCENT_PATTERNS.map(pattern => (
                      <button
                        key={pattern.id}
                        onClick={() => {
                          if (customSequence.length < 4) {
                            setCustomSequence(prev => [...prev, pattern.id]);
                          }
                        }}
                        disabled={isPlaying || customSequence.length >= 4}
                        className="aspect-square bg-white rounded-2xl border border-white/10 flex items-center justify-center hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none p-2"
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <AccentNotation type={pattern.id} active={true} isHandwriting={isHandwriting} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isCustomMode && (
          <div className="bg-white p-3 rounded-2xl display-box-shadow border border-[#b47e6a]/5">
            <div className="flex justify-between items-center text-[9px] font-medium text-[#b47e6a]/40 uppercase tracking-widest mb-1.5">
              <div className="flex items-center gap-3">
                <span>Progress</span>
                <span className="text-[#b47e6a] font-bold text-sm">
                  {bpm} <span className="text-[8px] font-normal opacity-50">BPM</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#ff7c5c] font-bold">
                  {isFixedSpeed ? '∞' : Math.max(1, Math.floor((bpm - sessionStartBpm) / 5) + 1)}
                  <span className="text-[#b47e6a]/20 mx-0.5">/</span>
                  {isFixedSpeed ? '∞' : Math.max(1, Math.floor((endBpm - sessionStartBpm) / 5) + 1)}
                </span>
                <span className="text-[8px] opacity-30 tracking-normal">STEPS</span>
              </div>
            </div>
            <div className="h-2 bg-[#b47e6a]/10 rounded-full overflow-hidden flex">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#4fd1c5] to-[#ff7c5c]"
                animate={{ 
                  width: isFixedSpeed 
                    ? '100%' 
                    : `${(Math.max(0, bpm - sessionStartBpm) / Math.max(1, endBpm - sessionStartBpm)) * 100}%` 
                }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TileProps {
  active: boolean;
  type: string;
  isEmpty?: boolean;
  isHandwriting?: boolean;
}

const Tile: FC<TileProps> = ({ active, type, isEmpty, isHandwriting }) => {
  return (
    <motion.div
      animate={{ 
        scale: active ? 1.05 : 1,
        borderColor: active ? '#ff7c5c' : '#d6cdc4',
        backgroundColor: isEmpty ? 'rgba(255,255,255,0.02)' : '#ffffff'
      }}
      className={`
        aspect-square rounded-2xl border flex flex-col items-center justify-center p-2 relative overflow-hidden
        ${active ? 'shadow-[0_0_20px_rgba(255,124,92,0.2)]' : 'shadow-sm'}
        ${isEmpty ? 'border-dashed border-[#b47e6a]/10' : ''}
      `}
    >
      {!isEmpty && (
        <div className="w-full h-full flex items-center justify-center">
          <AccentNotation type={type} active={active} isHandwriting={isHandwriting} />
        </div>
      )}
    </motion.div>
  );
}

function AccentNotation({ type, active, isHandwriting }: { type: string; active: boolean; isHandwriting?: boolean }) {
  const BLUE_COLOR = "#3b82f6";
  const RED_COLOR = "#f43f5e";
  const stemColor = active ? "black" : "rgba(0,0,0,0.8)";
  const noteColor = active ? "black" : "rgba(0,0,0,0.7)";

  const pattern = ACCENT_PATTERNS.find(p => p.id === type);
  if (!pattern) return null;

  const sticking = ['R', 'L', 'R', 'L'];

  // Handwriting style constants
  const noteHeadRx = isHandwriting ? 7.5 : 6;
  const noteHeadRy = isHandwriting ? 5.5 : 4;
  const noteHeadRotate = isHandwriting ? -28 : -20;
  const stemXOffset = isHandwriting ? 6.5 : 5.5;
  const stemWidth = isHandwriting ? 2.2 : 1.5;
  const fontStyle = isHandwriting ? { fontFamily: '"Indie Flower", cursive' } : {};

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Staff line */}
      <line x1="0" y1="60" x2="100" y2="60" stroke="black" strokeWidth="2" opacity="0.1" strokeLinecap={isHandwriting ? "round" : "butt"} />

      {/* Accent Mark - Moved up by 5pt (y values decreased by 5) */}
      {pattern.accents.map((isAccent, i) => {
        if (!isAccent) return null;
        const x = 20 + i * 20;
        return (
          <path
            key={`accent-${i}`}
            d={isHandwriting ? `M ${x-6} 4 L ${x+6} 10 L ${x-6} 16` : `M ${x-5} 5 L ${x+5} 10 L ${x-5} 15`}
            fill="none"
            stroke={active ? "black" : "rgba(0,0,0,0.4)"}
            strokeWidth={isHandwriting ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* Note heads */}
      {[20, 40, 60, 80].map((x, i) => (
        <ellipse 
          key={i} 
          cx={x} 
          cy="60" 
          rx={noteHeadRx} 
          ry={noteHeadRy} 
          fill={active ? (sticking[i] === 'L' ? RED_COLOR : BLUE_COLOR) : noteColor} 
          transform={`rotate(${noteHeadRotate} ${x} 60)`} 
        />
      ))}

      {/* Stems */}
      {[20, 40, 60, 80].map((x, i) => (
        <line key={i} x1={x + stemXOffset} y1="60" x2={x + stemXOffset} y2="20" stroke={stemColor} strokeWidth={stemWidth} strokeLinecap={isHandwriting ? "round" : "butt"} />
      ))}

      {/* Beams */}
      <rect x={20 + stemXOffset} y="20" width="60" height={isHandwriting ? 8 : 4} fill={stemColor} rx={isHandwriting ? 3 : 0} />
      <rect x={20 + stemXOffset} y={isHandwriting ? 34 : 28} width="60" height={isHandwriting ? 8 : 4} fill={stemColor} rx={isHandwriting ? 3 : 0} />

      {/* Sticking */}
      {[20, 40, 60, 80].map((x, i) => (
        <text 
          key={i} 
          x={x} 
          y="85" 
          textAnchor="middle" 
          className={`font-black ${active ? 'fill-black/60' : 'fill-black/20'} ${isHandwriting ? 'text-[11px]' : 'text-[9px]'}`}
          style={fontStyle}
        >
          {sticking[i]}
        </text>
      ))}
    </svg>
  );
}
