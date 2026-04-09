import { useState, useEffect, useRef, useCallback, FC } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Sliders, Check } from 'lucide-react';
import { useMetronome } from '../hooks/useMetronome';
import confetti from 'canvas-confetti';

const TOTAL_TILES = 12;

export default function SpeedUpMode({ metronomeVolume = 0.8, drumVolume = 1.0, isHandwriting = false }: { metronomeVolume?: number, drumVolume?: number, isHandwriting?: boolean }) {
  const [startBpm, setStartBpm] = useState(80);
  const [endBpm, setEndBpm] = useState(150);
  const [currentTileIndex, setCurrentTileIndex] = useState(-1); // -1 means pre-count
  const [preCountDisplay, setPreCountDisplay] = useState('');
  const [cycleCount, setCycleCount] = useState(0); // Track repetitions at current BPM
  const [bpmIncrement, setBpmIncrement] = useState<5 | 10>(10);
  const [isFixedSpeed, setIsFixedSpeed] = useState(false);
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

  const [sessionStartBpm, setSessionStartBpm] = useState(80);
  const [portalNodes, setPortalNodes] = useState<{ controls: HTMLElement | null; start: HTMLElement | null }>({ controls: null, start: null });
  const controlsRef = useRef<HTMLDivElement>(null);
  
  const { isPlaying, bpm, setBpm, toggleMetronome, playSnare, onTickRef } = useMetronome(startBpm, 4, true, metronomeVolume, drumVolume);
  
  const bpmRef = useRef(bpm);
  const bpmIncrementRef = useRef(bpmIncrement);
  const isFixedSpeedRef = useRef(isFixedSpeed);
  const isPlayingRef = useRef(isPlaying);
  const currentTileIndexRef = useRef(-1);
  const preCountRef = useRef(0);
  const cycleCountRef = useRef(0);

  useEffect(() => {
    // Look for portal targets after mount
    const controls = document.getElementById('speed-up-controls-portal');
    const start = document.getElementById('speed-up-start-portal');
    setPortalNodes({ controls, start });
  }, []);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    bpmIncrementRef.current = bpmIncrement;
  }, [bpmIncrement]);

  useEffect(() => {
    isFixedSpeedRef.current = isFixedSpeed;
  }, [isFixedSpeed]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const isFirstPreCountTickRef = useRef(true);
  const isInitialStartRef = useRef(true);

  const handleToggle = useCallback(() => {
    if (!isPlaying) {
      window.dispatchEvent(new CustomEvent('closeSettings'));
      window.dispatchEvent(new CustomEvent('closeControls'));
      setIsFinished(false);
      setBpm(startBpm);
      setSessionStartBpm(startBpm);
      setCurrentTileIndex(-1);
      setPreCountDisplay('READY');
      preCountRef.current = 0; 
      currentTileIndexRef.current = -1;
      isFirstPreCountTickRef.current = true;
      isInitialStartRef.current = true;
      cycleCountRef.current = 0;
      setCycleCount(0);
      setShowControls(false); // Close controls on start
      isPlayingRef.current = true;
      toggleMetronome(8); // Mute 8 ticks to silence both 'READY' beats (2 beats)
    } else {
      isPlayingRef.current = false;
      toggleMetronome();
    }
  }, [isPlaying, startBpm, toggleMetronome, setBpm]);

  const updateEndBpm = useCallback((val: number) => {
    // Respect current increment
    const inc = bpmIncrement;
    const rounded = Math.round(val / inc) * inc;
    const newVal = Math.min(300, Math.max(Math.ceil((startBpm + 1) / inc) * inc, rounded));
    setEndBpm(newVal);
  }, [startBpm, bpmIncrement]);

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
        setIsFixedSpeed(prev => !prev);
        setShowControls(true);
      } else if (code === 'ArrowRight') {
        if (!isPlayingRef.current) {
          e.preventDefault();
          const step = e.shiftKey ? 1 : bpmIncrementRef.current;
          setStartBpm(prev => Math.min(prev + step, endBpm));
          setShowControls(true); // Open controls on BPM change
        }
      } else if (code === 'ArrowLeft') {
        if (!isPlayingRef.current) {
          e.preventDefault();
          const step = e.shiftKey ? 1 : bpmIncrementRef.current;
          setStartBpm(prev => Math.max(prev - step, 40));
          setShowControls(true); // Open controls on BPM change
        }
      } else if (key === ',') {
        if (!isPlayingRef.current) {
          e.preventDefault();
          updateEndBpm(endBpm - bpmIncrementRef.current);
          setShowControls(true); // Open controls on BPM change
        }
      } else if (key === '.') {
        if (!isPlayingRef.current) {
          e.preventDefault();
          updateEndBpm(endBpm + bpmIncrementRef.current);
          setShowControls(true); // Open controls on BPM change
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggle, endBpm, updateEndBpm, toggleControls, showControls]);

  onTickRef.current = useCallback((tick: number, beat: number, sub: number, time: number) => {
    if (!isPlayingRef.current) return;

    const UI_DELAY = 150; // 150ms delay for visual sync

    // Pre-count logic
    if (currentTileIndexRef.current === -1) {
      if (sub === 0) {
        if (isFirstPreCountTickRef.current) {
          isFirstPreCountTickRef.current = false;
          setTimeout(() => {
            if (!isPlayingRef.current) return;
            if (isInitialStartRef.current) {
              setPreCountDisplay('READY');
            } else {
              setPreCountDisplay('1');
            }
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
              setPreCountDisplay(''); // Clear display instead of showing GO!
              setCurrentTileIndex(0);
            }
          }, UI_DELAY);

          if (currentPreCount === 6) {
            currentTileIndexRef.current = 0;
          }
        }
      }
      if (currentTileIndexRef.current === -1) return;
    }

    // Pattern logic
    if (currentTileIndexRef.current >= 0 && currentTileIndexRef.current < TOTAL_TILES) {
      const tileIdx = currentTileIndexRef.current;
      let shouldHit = false;

      if (tileIdx < 8) {
        // Tiles 1-8: oxox (8th notes)
        if (sub === 0 || sub === 2) shouldHit = true;
      } else {
        // Tiles 9-12: oooo (16th notes)
        shouldHit = true;
      }

      if (shouldHit) {
        playSnare(time, 1.0);
      }

      // Move to next tile at the end of the beat
      if (sub === 3) {
        const nextIdx = currentTileIndexRef.current + 1;
        if (nextIdx >= TOTAL_TILES) {
          // Finished one cycle
          cycleCountRef.current += 1;
          const currentCycle = cycleCountRef.current;
          setTimeout(() => {
            if (!isPlayingRef.current) return;
            setCycleCount(currentCycle);
          }, UI_DELAY);

          if (cycleCountRef.current < 2) {
            // Repeat same BPM
            currentTileIndexRef.current = 0;
            setTimeout(() => {
              if (!isPlayingRef.current) return;
              setCurrentTileIndex(0);
            }, UI_DELAY);
          } else {
            // Finished 2 cycles
            if (isFixedSpeedRef.current) {
              // Fixed speed mode: just loop indefinitely
              cycleCountRef.current = 0;
              setTimeout(() => {
                if (!isPlayingRef.current) return;
                setCycleCount(0);
                setCurrentTileIndex(0);
              }, UI_DELAY);
              currentTileIndexRef.current = 0;
              return;
            }

            cycleCountRef.current = 0;
            setTimeout(() => {
              if (!isPlayingRef.current) return;
              setCycleCount(0);
            }, UI_DELAY);

            // Smart increment: jump to next multiple of bpmIncrement
            const inc = bpmIncrementRef.current;
            const nextBpm = Math.floor(bpmRef.current / inc) * inc + inc;

            if (nextBpm > endBpm) {
              // Finished the whole challenge
              // Stop audio immediately
              toggleMetronome(); 
              isPlayingRef.current = false;
              
              setTimeout(() => {
                setIsFinished(true);
                confetti({
                  particleCount: 150,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#6366f1', '#a855f7', '#ec4899']
                });
                // Auto-reset finished state after 3 seconds
                setTimeout(() => setIsFinished(false), 3000);
              }, UI_DELAY);
              return;
            } else {
              const targetBpm = nextBpm;
              setTimeout(() => {
                if (!isPlayingRef.current) return;
                setBpm(targetBpm);
                setStartBpm(targetBpm); // Update startBpm to follow current speed
                setCurrentTileIndex(-1);
                setPreCountDisplay(''); // Clear display immediately to prevent stale "4"
              }, UI_DELAY);
              
              currentTileIndexRef.current = -1;
              preCountRef.current = 2; // Set to 2 so the next beat shows '2'
              isFirstPreCountTickRef.current = true;
              isInitialStartRef.current = false; // BPM change is not initial start
            }
          }
        } else {
          currentTileIndexRef.current = nextIdx;
          const targetIdx = nextIdx;
          setTimeout(() => {
            if (!isPlayingRef.current) return;
            setCurrentTileIndex(targetIdx);
          }, UI_DELAY);
        }
      }
    }
  }, [playSnare, toggleMetronome, setBpm, endBpm]);

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
                className="absolute top-full right-0 mt-2 w-64 bg-white/95 backdrop-blur-md border border-[#b47e6a]/10 rounded-2xl p-4 shadow-2xl z-[60]"
              >
                <div className="space-y-4">
                  <ControlGroup 
                    label="Start BPM" 
                    value={startBpm} 
                    onChange={setStartBpm} 
                    min={40} 
                    max={endBpm} 
                    disabled={isPlaying}
                    step={bpmIncrement}
                  />
                  <ControlGroup 
                    label="End BPM" 
                    value={endBpm} 
                    onChange={updateEndBpm} 
                    min={startBpm} 
                    max={300} 
                    disabled={isPlaying}
                    step={bpmIncrement}
                  />

                  {/* Increment Toggle */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-[#b47e6a]/40 uppercase tracking-widest">Increment</span>
                    <div className="flex gap-1 bg-[#b47e6a]/5 p-1 rounded-xl border border-[#b47e6a]/10">
                      {[5, 10].map((inc) => (
                        <button
                          key={inc}
                          onClick={() => setBpmIncrement(inc as 5 | 10)}
                          disabled={isPlaying}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            bpmIncrement === inc 
                              ? 'bg-[#ff7c5c] text-white shadow-lg' 
                              : 'text-[#b47e6a]/40 hover:bg-[#b47e6a]/5'
                          }`}
                        >
                          {inc} BPM
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-[#b47e6a]/40 uppercase tracking-widest">Mode</span>
                    <div className="flex gap-1 bg-[#b47e6a]/5 p-1 rounded-xl border border-[#b47e6a]/10">
                      <button
                        onClick={() => setIsFixedSpeed(false)}
                        disabled={isPlaying}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          !isFixedSpeed 
                            ? 'bg-[#ff7c5c] text-white shadow-lg' 
                            : 'text-[#b47e6a]/40 hover:bg-[#b47e6a]/5'
                        }`}
                      >
                        Speed Up
                      </button>
                      <button
                        onClick={() => setIsFixedSpeed(true)}
                        disabled={isPlaying}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          isFixedSpeed 
                            ? 'bg-[#ff7c5c] text-white shadow-lg' 
                            : 'text-[#b47e6a]/40 hover:bg-[#b47e6a]/5'
                        }`}
                      >
                        Fixed
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
          className={`
            px-6 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all relative overflow-hidden min-w-[120px]
            ${isPlaying 
              ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20' 
              : isFinished 
                ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20'
                : 'bg-[#ff7c5c] hover:bg-[#ff6b4a] shadow-lg shadow-[#ff7c5c]/20'}
            text-white
          `}
        >
          <AnimatePresence mode="wait">
            {isFinished ? (
              <motion.div
                key="finished"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center"
              >
                <span>FINISHED</span>
              </motion.div>
            ) : isPlaying ? (
              <motion.div
                key="stop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>STOP</span>
              </motion.div>
            ) : (
              <motion.div
                key="start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START</span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>,
        portalNodes.start
      )}

      {/* Visualization */}
      <div className="w-full flex flex-col gap-0.5 items-center flex-1 justify-start pt-2 max-w-4xl min-h-0">
        <div className="bg-white rounded-3xl display-box-shadow p-6 flex flex-col items-center justify-center relative w-full border border-[#b47e6a]/5">
          {/* Pre-count Display (Overlapping the box) */}
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <AnimatePresence mode="wait">
              {isPlaying && currentTileIndex < 0 && preCountDisplay && (
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

          {/* Tiles Grid - 3 rows of 4 */}
          <div className="w-full max-w-md flex flex-col gap-1">
            {/* Row 1: Tiles 1-4 */}
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Tile 
                  key={i}
                  index={i} 
                  active={currentTileIndex === i} 
                  type="8th" 
                  isHandwriting={isHandwriting}
                />
              ))}
            </div>

            {/* Row 2: Tiles 5-8 */}
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Tile 
                  key={i + 4}
                  index={i + 4} 
                  active={currentTileIndex === i + 4} 
                  type="8th" 
                  isHandwriting={isHandwriting}
                />
              ))}
            </div>

            {/* Row 3: Tiles 9-12 */}
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Tile 
                  key={i + 8} 
                  index={i + 8} 
                  active={currentTileIndex === i + 8} 
                  type="16th" 
                  isHandwriting={isHandwriting}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Progress Bar Area */}
        <div className="bg-white p-3 rounded-2xl display-box-shadow border border-[#b47e6a]/5">
          <div className="flex justify-between items-center text-[9px] font-medium text-[#b47e6a]/40 uppercase tracking-widest mb-1.5">
            <div className="flex items-center gap-3">
              <span>Progress</span>
              <span className="text-[#b47e6a] font-bold text-sm">
                {bpm} <span className="text-[8px] font-normal opacity-50">BPM</span>
                {isPlaying && <span className="ml-2 text-[#ff7c5c] text-[10px]">({cycleCount + 1}/2)</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#ff7c5c] font-bold">
                {isFixedSpeed ? '∞' : Math.max(1, Math.ceil((bpm - sessionStartBpm) / bpmIncrement) + 1)}
                <span className="text-[#b47e6a]/20 mx-0.5">/</span>
                {isFixedSpeed ? '∞' : Math.max(1, Math.ceil((endBpm - sessionStartBpm) / bpmIncrement) + 1)}
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
                  : `${(Math.max(0, Math.ceil((bpm - sessionStartBpm) / bpmIncrement)) / Math.max(1, Math.ceil((endBpm - sessionStartBpm) / bpmIncrement) + 1)) * 100}%` 
              }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface TileProps {
  index: number;
  active: boolean;
  type: '8th' | '16th';
  isHandwriting?: boolean;
}

const Tile: FC<TileProps> = ({ active, type, index, isHandwriting }) => {
  const BLUE_COLOR = "#3b82f6";
  const RED_COLOR = "#f43f5e";
  
  // Row 1: R R
  // Row 2: L L
  // Row 3: R L R L
  
  const getSticking = () => {
    if (index < 4) return ['R', 'R'];
    if (index < 8) return ['L', 'L'];
    return ['R', 'L', 'R', 'L'];
  };

  const sticking = getSticking();

  const getNoteColor = (s: string) => {
    if (!active) return "rgba(0,0,0,0.7)";
    return s === 'L' ? RED_COLOR : BLUE_COLOR;
  };

  const noteHeadRx = isHandwriting ? 10 : 8;
  const noteHeadRy = isHandwriting ? 7 : 5;
  const noteHeadRotate = isHandwriting ? -28 : -20;
  const stemXOffset = isHandwriting ? 8.5 : 7.25;
  const stemWidth = isHandwriting ? 2.2 : 1.5;

  const fontStyle = isHandwriting ? { fontFamily: '"Indie Flower", cursive' } : {};

  return (
    <motion.div
      animate={{ 
        scale: active ? 1.05 : 1,
        borderColor: active ? '#ff7c5c' : '#d6cdc4',
        backgroundColor: '#ffffff'
      }}
      className={`
        aspect-square rounded-2xl border flex flex-col items-center justify-center p-2 relative overflow-hidden
        ${active ? 'shadow-[0_0_20px_rgba(255,124,92,0.2)]' : 'shadow-sm'}
      `}
    >
      <div className="w-full h-full flex items-center justify-center">
        {type === '8th' ? (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <line x1="0" y1="60" x2="100" y2="60" stroke="black" strokeWidth="2" opacity="0.1" strokeLinecap={isHandwriting ? "round" : "butt"} />
            <ellipse cx="30" cy="60" rx={noteHeadRx} ry={noteHeadRy} fill={getNoteColor(sticking[0])} transform={`rotate(${noteHeadRotate} 30 60)`} />
            <ellipse cx="70" cy="60" rx={noteHeadRx} ry={noteHeadRy} fill={getNoteColor(sticking[1])} transform={`rotate(${noteHeadRotate} 70 60)`} />
            <line x1={30 + stemXOffset} y1="60" x2={30 + stemXOffset} y2="20" stroke={active ? "black" : "rgba(0,0,0,0.8)"} strokeWidth={stemWidth} strokeLinecap={isHandwriting ? "round" : "butt"} />
            <line x1={70 + stemXOffset} y1="60" x2={70 + stemXOffset} y2="20" stroke={active ? "black" : "rgba(0,0,0,0.8)"} strokeWidth={stemWidth} strokeLinecap={isHandwriting ? "round" : "butt"} />
            <rect x={30 + stemXOffset} y="20" width="40" height={isHandwriting ? 8 : 4} fill={active ? "black" : "rgba(0,0,0,0.8)"} rx={isHandwriting ? 2 : 0} />
            <text x="30" y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>{sticking[0]}</text>
            <text x="70" y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>{sticking[1]}</text>
          </svg>
        ) : (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <line x1="0" y1="60" x2="100" y2="60" stroke="black" strokeWidth="2" opacity="0.2" strokeLinecap={isHandwriting ? "round" : "butt"} />
            <ellipse cx="20" cy="60" rx={noteHeadRx} ry={noteHeadRy} fill={getNoteColor(sticking[0])} transform={`rotate(${noteHeadRotate} 20 60)`} />
            <ellipse cx="40" cy="60" rx={noteHeadRx} ry={noteHeadRy} fill={getNoteColor(sticking[1])} transform={`rotate(${noteHeadRotate} 40 60)`} />
            <ellipse cx="60" cy="60" rx={noteHeadRx} ry={noteHeadRy} fill={getNoteColor(sticking[2])} transform={`rotate(${noteHeadRotate} 60 60)`} />
            <ellipse cx="80" cy="60" rx={noteHeadRx} ry={noteHeadRy} fill={getNoteColor(sticking[3])} transform={`rotate(${noteHeadRotate} 80 60)`} />
            <line x1={20 + stemXOffset} y1="60" x2={20 + stemXOffset} y2="20" stroke={active ? "black" : "rgba(0,0,0,0.8)"} strokeWidth={isHandwriting ? 2.5 : 2} strokeLinecap={isHandwriting ? "round" : "butt"} />
            <line x1={40 + stemXOffset} y1="60" x2={40 + stemXOffset} y2="20" stroke={active ? "black" : "rgba(0,0,0,0.8)"} strokeWidth={isHandwriting ? 2.5 : 2} strokeLinecap={isHandwriting ? "round" : "butt"} />
            <line x1={60 + stemXOffset} y1="60" x2={60 + stemXOffset} y2="20" stroke={active ? "black" : "rgba(0,0,0,0.8)"} strokeWidth={isHandwriting ? 2.5 : 2} strokeLinecap={isHandwriting ? "round" : "butt"} />
            <line x1={80 + stemXOffset} y1="60" x2={80 + stemXOffset} y2="20" stroke={active ? "black" : "rgba(0,0,0,0.8)"} strokeWidth={isHandwriting ? 2.5 : 2} strokeLinecap={isHandwriting ? "round" : "butt"} />
            <rect x={20 + stemXOffset} y="20" width="60" height={isHandwriting ? 8 : 6} fill={active ? "black" : "rgba(0,0,0,0.8)"} rx={isHandwriting ? 3 : 0} />
            <rect x={20 + stemXOffset} y={isHandwriting ? 34 : 30} width="60" height={isHandwriting ? 8 : 6} fill={active ? "black" : "rgba(0,0,0,0.8)"} rx={isHandwriting ? 3 : 0} />
            <text x="20" y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>{sticking[0]}</text>
            <text x="40" y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>{sticking[1]}</text>
            <text x="60" y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>{sticking[2]}</text>
            <text x="80" y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>{sticking[3]}</text>
          </svg>
        )}
      </div>
    </motion.div>
  );
}

function ControlGroup({ label, value, onChange, min, max, disabled, step = 1 }: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
  step?: number;
}) {
  return (
    <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-end">
        <label className="text-[10px] font-medium text-[#b47e6a]/40 uppercase tracking-widest truncate mr-2">{label}</label>
        <span className="text-lg font-bold text-[#ff7c5c]">{value}</span>
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step}
          value={value} 
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 accent-[#ff7c5c] h-1.5 bg-[#b47e6a]/10 rounded-full appearance-none cursor-pointer min-w-0"
        />
      </div>
    </div>
  );
}
