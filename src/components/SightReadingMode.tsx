import React, { useState, useEffect, useRef, useCallback, FC } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Sliders, Trash2, Delete, RefreshCw } from 'lucide-react';
import { useMetronome } from '../hooks/useMetronome';
import confetti from 'canvas-confetti';

const PATTERN_SOUNDS: Record<number, string> = {
  0: 'xxxx', // Quarter Rest
  1: 'oxxx', // Quarter Note
  2: 'oxox', // Two 8th Notes
  3: 'oooo', // Four 16th Notes
  4: 'ooox', // 8th + two 16ths
  5: 'oxoo', // two 16ths + 8th
  6: 'xxox', // 8th rest + 8th note
  7: 'xxoo', // 8th rest + two 16ths
  8: 'ooxo', // 8th + 8th (Labels R, L, L)
  9: 'oxxo', // Dotted 8th + 16th
  10: 'ooxx', // 8th + 8th
  11: 'xooo', // 16th rest + 3 16ths
  12: 'xoox', // 16th rest + 16th + 8th
  13: 'xxxo', // Dotted 8th rest + 16th
  14: 'xoxo', // 16th rest + 8th + 16th
  15: 'xoxx', // 16th rest + Dotted 8th
};

const QUARTER_REST_URL = "https://upload.wikimedia.org/wikipedia/commons/0/03/QuarterRest.svg";
const EIGHTH_REST_URL = "https://upload.wikimedia.org/wikipedia/commons/b/b4/8thRest.svg";
const SIXTEENTH_REST_URL = "https://upload.wikimedia.org/wikipedia/commons/8/8c/16th_rest.svg";

const SightNotation: FC<{ patternId: number; isSmall?: boolean }> = ({ patternId, isSmall }) => {
  const size = isSmall ? 75 : 100;
  const strokeWidth = isSmall ? 2 : 3;
  const fontSize = isSmall ? 14 : 18;

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" className="text-black overflow-visible">
      {/* Staff Line */}
      <line x1="0" y1="50" x2="100" y2="50" stroke="black" strokeWidth="2" />
      
      {(() => {
        const drawLabel = (i: number, text: string, isGray = false) => {
          const x = 20 + i * 20;
          return (
            <text 
              key={`label-${i}-${text}`} 
              x={x} y={85} 
              textAnchor="middle" 
              fontSize={fontSize} 
              fontWeight="900" 
              fill={isGray ? "#e5e7eb" : "black"}
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {text}
            </text>
          );
        };

        const drawNote = (i: number, hasFlag = false, hasDot = false, is16thFlag = false) => {
          const x = 20 + i * 20;
          return (
            <g key={`note-${i}`}>
              {/* Professional slanted note head */}
              <ellipse cx={x} cy={50} rx="7.5" ry="5.5" fill="black" transform={`rotate(-28 ${x} 50)`} />
              {/* Clean, precise stem */}
              <line x1={x + 6.5} y1={50} x2={x + 6.5} y2={10} stroke="black" strokeWidth="1.8" />
              {hasFlag && (
                <g>
                  {/* Professional engraved flag */}
                  <path d={`M ${x+6.5},10 c 0,0 14,8 14,22 c 0,5 -4,8 -6,8 c 2,-2 4,-6 4,-10 c 0,-10 -12,-16 -12,-16 Z`} fill="black" />
                  {is16thFlag && (
                    <path d={`M ${x+6.5},22 c 0,0 14,8 14,22 c 0,5 -4,8 -6,8 c 2,-2 4,-6 4,-10 c 0,-10 -12,-16 -12,-16 Z`} fill="black" />
                  )}
                </g>
              )}
              {hasDot && (
                <circle cx={x + 18} cy={48} r="3.2" fill="black" />
              )}
            </g>
          );
        };

        const drawRest = (i: number, type: 'quarter' | '8th' | '16th' | 'dotted8th') => {
          const x = 20 + i * 20;
          if (type === 'quarter') {
            return (
              <image 
                key={`rest-${i}`}
                href={QUARTER_REST_URL}
                xlinkHref={QUARTER_REST_URL}
                x={37} y={20} 
                width={26} height={60}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            );
          }
          if (type === '8th' || type === 'dotted8th') {
            return (
              <g key={`rest-${i}`}>
                <image 
                  href={EIGHTH_REST_URL}
                  xlinkHref={EIGHTH_REST_URL}
                  x={x - 10} y={25} 
                  width={20} height={45}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
                {type === 'dotted8th' && (
                  <circle cx={x + 10} cy={45} r={3.2} fill="black" />
                )}
              </g>
            );
          }
          // 16th rest
          return (
            <image 
              key={`rest-${i}`}
              href={SIXTEENTH_REST_URL}
              xlinkHref={SIXTEENTH_REST_URL}
              x={x - 5} y={34} 
              width={10} height={24.66}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
          );
        };

        const drawBeam = (iStart: number, iEnd: number, y: number = 10, isSecondary = false) => {
          const x1 = 20 + iStart * 20 + 6.5;
          const x2 = 20 + iEnd * 20 + 6.5;
          return <line key={`beam-${iStart}-${iEnd}-${y}`} x1={x1} y1={y} x2={x2} y2={y} stroke="black" strokeWidth="6.5" />;
        };

        switch (patternId) {
          case 0: return <g>{drawRest(0, 'quarter')}{drawLabel(1.5, 'R', true)}</g>;
          case 1: return <g>{drawNote(0)}{drawLabel(0, 'R')}</g>;
          case 2: return <g>{drawNote(0)}{drawNote(2)}{drawBeam(0, 2)}{drawLabel(0, 'R')}{drawLabel(2, 'L')}</g>;
          case 3: return <g>{[0,1,2,3].map(i => drawNote(i))}{drawBeam(0, 3)}{drawBeam(0, 3, 20)}{drawLabel(0, 'R')}{drawLabel(1, 'L')}{drawLabel(2, 'R')}{drawLabel(3, 'L')}</g>;
          case 4: return <g>{[0,1,2].map(i => drawNote(i))}{drawBeam(0, 2)}{drawBeam(0, 1, 20)}{drawLabel(0, 'R')}{drawLabel(1, 'L')}{drawLabel(2, 'R')}</g>;
          case 5: return <g>{[0,2,3].map(i => drawNote(i))}{drawBeam(0, 3)}{drawBeam(2, 3, 20)}{drawLabel(0, 'R')}{drawLabel(2, 'R')}{drawLabel(3, 'L')}</g>;
          case 6: return <g>{drawRest(0, '8th')}{drawNote(2, true)}{drawLabel(0, 'R', true)}{drawLabel(2, 'L')}</g>;
          case 7: return <g>{drawRest(0, '8th')}{[2,3].map(i => drawNote(i))}{drawBeam(2, 3)}{drawBeam(2, 3, 20)}{drawLabel(0, 'R', true)}{drawLabel(2, 'R')}{drawLabel(3, 'L')}</g>;
          case 8: return <g>{[0,1,3].map(i => drawNote(i))}{drawBeam(0, 3)}{drawBeam(0, 0.5, 20)}{drawBeam(2.5, 3, 20)}{drawLabel(0, 'R')}{drawLabel(1, 'L')}{drawLabel(3, 'L')}</g>;
          case 9: return <g>{drawNote(0, false, true)}{drawNote(3)}{drawBeam(0, 3)}{drawBeam(2.5, 3, 20)}{drawLabel(0, 'R')}{drawLabel(3, 'L')}</g>;
          case 10: return <g>{drawNote(0)}{drawNote(1, false, true)}{drawBeam(0, 1)}{drawBeam(0, 0.5, 20)}{drawLabel(0, 'R')}{drawLabel(1, 'L')}</g>;
          case 11: return <g>{drawRest(0, '16th')}{[1,2,3].map(i => drawNote(i))}{drawBeam(1, 3)}{drawBeam(1, 3, 20)}{drawLabel(0, 'R', true)}{drawLabel(1, 'L')}{drawLabel(2, 'R')}{drawLabel(3, 'L')}</g>;
          case 12: return <g>{drawRest(0, '16th')}{drawNote(1)}{drawNote(2)}{drawBeam(1, 2)}{drawBeam(1, 1.5, 20)}{drawLabel(0, 'R', true)}{drawLabel(1, 'L')}{drawLabel(2, 'R')}</g>;
          case 13: return <g>{drawRest(0, 'dotted8th')}{drawNote(3, true, false, true)}{drawLabel(0, 'R', true)}{drawLabel(3, 'L')}</g>;
          case 14: return <g>{drawRest(0, '16th')}{drawNote(1)}{drawNote(3)}{drawBeam(1, 3)}{drawBeam(2.5, 3, 20)}{drawLabel(0, 'R', true)}{drawLabel(1, 'L')}{drawLabel(3, 'L')}</g>;
          case 15: return <g>{drawRest(0, '16th')}{drawNote(1, true, true)}{drawLabel(0, 'R', true)}{drawLabel(1, 'L')}</g>;
          default: return null;
        }
      })()}
    </svg>
  );
};

interface TileProps {
  patternId?: number;
  active: boolean;
  onClick: () => void;
  isPlaying: boolean;
  isSmall?: boolean;
  isEmpty?: boolean;
}

const Tile: FC<TileProps> = ({ patternId, active, onClick, isPlaying, isSmall, isEmpty }) => {
  return (
    <button 
      onClick={onClick}
      disabled={isEmpty}
      className={`aspect-square bg-white rounded-2xl border border-[#b47e6a]/10 flex items-center justify-center relative overflow-hidden transition-all ${active ? 'ring-4 ring-[#ff7c5c] ring-inset shadow-[0_0_20px_rgba(255,124,92,0.3)]' : 'hover:bg-[#ff7c5c]/5'} ${isSmall ? 'rounded-xl' : ''} ${isEmpty ? 'bg-[#b47e6a]/5 border-dashed' : 'shadow-sm'}`}
    >
      {!isEmpty && patternId !== undefined && <SightNotation patternId={patternId} isSmall={isSmall} />}
      {active && isPlaying && (
        <motion.div layoutId="active-glow" className="absolute inset-0 bg-[#ff7c5c]/10 z-0" />
      )}
    </button>
  );
};

function ControlGroup({ label, value, onChange, min, max }: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="space-y-3">
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

function ModeSelect({ active, onClick, label, shortcut }: { active: boolean; onClick: () => void; label: string; shortcut: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center py-2 rounded-lg text-[9px] font-bold transition-all ${active ? 'bg-[#ff7c5c] text-white shadow-lg shadow-[#ff7c5c]/20' : 'text-[#b47e6a]/40 hover:bg-[#b47e6a]/5'}`}
    >
      {label}
    </button>
  );
}

type SightMode = 'basic' | 'challenge' | 'custom';
type PatternFilter = 'beginner' | 'intermediate' | 'advanced';

export default function SightReadingMode({ metronomeVolume = 0.8, drumVolume = 1.0 }: { metronomeVolume?: number, drumVolume?: number }) {
  const [bpm, setBpm] = useState(80);
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<SightMode>('basic');
  const [patternFilter, setPatternFilter] = useState<PatternFilter>('beginner');
  const [sequence, setSequence] = useState<number[]>([]);
  const [customSequence, setCustomSequence] = useState<number[]>([]);
  const [currentTileIndex, setCurrentTileIndex] = useState(-1);
  const [preCountDisplay, setPreCountDisplay] = useState('');
  const [showControls, setShowControls] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const bpmRef = useRef(bpm);
  const levelRef = useRef(level);
  const modeRef = useRef(mode);
  const sequenceRef = useRef(sequence);
  const customSequenceRef = useRef(customSequence);
  const currentTileIndexRef = useRef(-1);
  const preCountRef = useRef(0);
  const startFromIndexRef = useRef(0);

  const { isPlaying, toggleMetronome, playSnare, onTickRef } = useMetronome(bpm, 4, true, metronomeVolume, drumVolume);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { sequenceRef.current = sequence; }, [sequence]);
  useEffect(() => { customSequenceRef.current = customSequence; }, [customSequence]);

  useEffect(() => {
    if (isFinished) {
      const timer = setTimeout(() => {
        setIsFinished(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isFinished]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowControls(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const generateSequence = useCallback((lvl: number, currentMode: SightMode) => {
    if (currentMode === 'custom') return;

    if (currentMode === 'basic') {
      const newSeq: number[] = [lvl, lvl, lvl, lvl]; // Row 1
      
      // Row 2
      const row2: number[] = [];
      for (let i = 0; i < 4; i++) row2.push(Math.floor(Math.random() * (lvl + 1)));
      if (!row2.includes(lvl)) row2[Math.floor(Math.random() * 4)] = lvl;
      newSeq.push(...row2);

      // Row 3
      const row3: number[] = [];
      for (let i = 0; i < 4; i++) row3.push(Math.floor(Math.random() * (lvl + 1)));
      if (!row3.includes(lvl)) row3[Math.floor(Math.random() * 4)] = lvl;
      newSeq.push(...row3);

      setSequence(newSeq);
    } else if (currentMode === 'challenge') {
      const newSeq: number[] = [];
      for (let i = 0; i < 32; i++) {
        newSeq.push(Math.floor(Math.random() * (lvl + 1)));
      }
      setSequence(newSeq);
    }
  }, []);

  useEffect(() => {
    generateSequence(level, mode);
  }, [level, mode, generateSequence]);

  const handleToggle = useCallback((startIndex: number = 0) => {
    if (!isPlaying) {
      window.dispatchEvent(new CustomEvent('closeSettings'));
      window.dispatchEvent(new CustomEvent('closeControls'));
      setIsFinished(false);
      setCurrentTileIndex(-1);
      setPreCountDisplay('READY');
      preCountRef.current = 0;
      currentTileIndexRef.current = -1;
      startFromIndexRef.current = startIndex;
      toggleMetronome(0);
    } else {
      toggleMetronome();
    }
  }, [isPlaying, toggleMetronome]);

  const handleRefresh = useCallback(() => {
    generateSequence(level, mode);
  }, [level, mode, generateSequence]);

  useEffect(() => {
    onTickRef.current = (tick, beat, sub, time) => {
      if (preCountRef.current < 4) {
        if (sub === 0) {
          preCountRef.current += 1;
          setPreCountDisplay(preCountRef.current.toString());
          if (preCountRef.current === 4) {
            // Next tick will be the start
          }
        }
        return;
      }

      const activeSeq = modeRef.current === 'custom' ? customSequenceRef.current : sequenceRef.current;
      const totalTiles = activeSeq.length;

      if (sub === 0) {
        if (currentTileIndexRef.current === -1) {
          currentTileIndexRef.current = startFromIndexRef.current;
        } else {
          currentTileIndexRef.current += 1;
        }
        
        if (currentTileIndexRef.current >= totalTiles) {
          if (modeRef.current === 'custom') {
            currentTileIndexRef.current = 0;
          } else {
            toggleMetronome();
            setIsFinished(true);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            return;
          }
        }
        setCurrentTileIndex(currentTileIndexRef.current);
      }

      const patternId = activeSeq[currentTileIndexRef.current];
      const soundPattern = PATTERN_SOUNDS[patternId] || 'xxxx';
      if (soundPattern[sub] === 'o') {
        playSnare(time);
      }
    };
  }, [playSnare, toggleMetronome]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();
      
      if (key === '1') setMode('basic');
      if (key === '2') setMode('challenge');
      if (key === '3') setMode('custom');
      if (key === 'd' || key === 'ㅇ') {
        setMode(prev => {
          if (prev === 'basic') return 'challenge';
          if (prev === 'challenge') return 'custom';
          return 'basic';
        });
        setShowControls(true);
      }
      if (key === 'arrowleft') {
        if (mode === 'challenge' || mode === 'custom') setShowControls(true);
        setBpm(prev => Math.max(20, prev - 5));
      }
      if (key === 'arrowright') {
        if (mode === 'challenge' || mode === 'custom') setShowControls(true);
        setBpm(prev => Math.min(300, prev + 5));
      }
      if (key === 'enter') handleRefresh();
      if (key === 'arrowup') setLevel(prev => Math.min(15, prev + 1));
      if (key === 'arrowdown') setLevel(prev => Math.max(1, prev - 1));
      if (key === 'c' || key === 'ㅊ') {
        e.stopPropagation();
        setShowControls(prev => !prev);
      }
      if (key === 'backspace' && modeRef.current === 'custom') {
        setCustomSequence(prev => prev.slice(0, -1));
      }
      if (key === ' ') {
        e.preventDefault();
        handleToggle(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh, handleToggle]);

  const [portalNodes, setPortalNodes] = useState<{ controls: HTMLElement | null; start: HTMLElement | null; tools: HTMLElement | null }>({ controls: null, start: null, tools: null });
  useEffect(() => {
    const controls = document.getElementById('speed-up-controls-portal');
    const start = document.getElementById('speed-up-start-portal');
    const tools = document.getElementById('custom-tools-portal');
    setPortalNodes({ controls, start, tools });
  }, []);

  useEffect(() => {
    if (isPlaying) {
      setShowControls(false);
    }
  }, [isPlaying]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showControls) {
        setShowControls(false);
      }
    };
    const handleCloseControls = () => setShowControls(false);

    window.addEventListener('click', handleClickOutside);
    window.addEventListener('closeControls', handleCloseControls);
    window.addEventListener('closeSettings', handleCloseControls);
    window.addEventListener('openSidebar', handleCloseControls);

    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('closeControls', handleCloseControls);
      window.removeEventListener('closeSettings', handleCloseControls);
      window.removeEventListener('openSidebar', handleCloseControls);
    };
  }, [showControls]);

  return (
    <div className="flex flex-col items-center gap-0.5 w-full h-full p-0.5 overflow-y-auto justify-start pt-2">
      {portalNodes.controls && createPortal(
        <div className="flex items-center gap-2 relative">
          <button 
            id="sight-reading-controls-trigger"
            onClick={(e) => {
              e.stopPropagation();
              const next = !showControls;
              if (next) {
                window.dispatchEvent(new CustomEvent('closeSettings'));
              }
              setShowControls(next);
            }}
            className={`p-2.5 rounded-xl transition-all active:scale-95 border ${showControls ? 'bg-[#ff7c5c] text-white border-[#ff7c5c]' : 'bg-[#d6cdc4]/20 border-[#d6cdc4]/30 text-[#b47e6a] hover:bg-[#d6cdc4]/30'}`}
          >
            <Sliders size={18} />
          </button>

          <AnimatePresence>
            {showControls && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 z-[60] w-[320px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white rounded-3xl border border-[#b47e6a]/10 p-6 shadow-2xl space-y-6">
                  <div className="space-y-6">
                    <ControlGroup label="BPM" value={bpm} onChange={setBpm} min={20} max={300} />
                    <ControlGroup label="Level" value={level} onChange={setLevel} min={1} max={15} />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-[#b47e6a]/40 uppercase tracking-widest">Mode</label>
                    <div className="flex p-1 bg-[#b47e6a]/5 rounded-xl border border-[#b47e6a]/10">
                      <ModeSelect active={mode === 'basic'} onClick={() => setMode('basic')} label="Basic" shortcut="1" />
                      <ModeSelect active={mode === 'challenge'} onClick={() => setMode('challenge')} label="Challenge" shortcut="2" />
                      <ModeSelect active={mode === 'custom'} onClick={() => setMode('custom')} label="Custom" shortcut="3" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        portalNodes.controls
      )}

      {portalNodes.tools && createPortal(
        <div className="flex items-center gap-4">
          {mode !== 'custom' && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-[#b47e6a]/20 uppercase tracking-widest leading-none">Level</span>
              <span className="text-xl font-black text-[#ff7c5c] leading-none">{level}</span>
            </div>
          )}
          <button 
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-[#d6cdc4]/20 border border-[#d6cdc4]/30 text-[#b47e6a] hover:bg-[#d6cdc4]/30 transition-all active:rotate-180 duration-500"
            title="Refresh (Enter)"
          >
            <RefreshCw size={18} />
          </button>
        </div>,
        portalNodes.tools
      )}

      {portalNodes.start && createPortal(
        <button 
          onClick={() => handleToggle(0)}
          className={`px-6 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all min-w-[120px] text-white ${isPlaying ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20' : isFinished ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-[#ff7c5c] hover:bg-[#ff6b4a] shadow-lg shadow-[#ff7c5c]/20'}`}
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

      <AnimatePresence>
        {/* Controls moved to portal overlay */}
      </AnimatePresence>

      <div className="w-full flex flex-col gap-0.5 items-center flex-1 justify-start max-w-4xl min-h-0">
        <div className="bg-white rounded-3xl display-box-shadow p-6 flex flex-col items-center justify-center relative w-full border border-[#b47e6a]/5">
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

          <div className={`w-full flex flex-col gap-2 ${mode === 'challenge' || mode === 'custom' ? 'max-w-3xl' : 'max-w-md'}`}>
            {mode === 'basic' && (
              <div className="grid grid-rows-3 gap-2 w-full">
                {[0, 1, 2].map(row => (
                  <div key={row} className="grid grid-cols-4 gap-1.5">
                    {sequence.slice(row * 4, (row + 1) * 4).map((patternId, i) => {
                      const idx = row * 4 + i;
                      return (
                        <Tile 
                          key={idx} 
                          patternId={patternId} 
                          active={currentTileIndex === idx} 
                          onClick={() => handleToggle(idx)}
                          isPlaying={isPlaying}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {mode === 'challenge' && (
              <div className="grid grid-rows-4 gap-2 w-full">
                {[0, 1, 2, 3].map(row => (
                  <div key={row} className="flex gap-2">
                    <div className="grid grid-cols-4 gap-1 flex-1">
                      {sequence.slice(row * 8, row * 8 + 4).map((patternId, i) => {
                        const idx = row * 8 + i;
                        return <Tile key={idx} patternId={patternId} active={currentTileIndex === idx} onClick={() => handleToggle(idx)} isPlaying={isPlaying} isSmall />;
                      })}
                    </div>
                    <div className="w-4" />
                    <div className="grid grid-cols-4 gap-1 flex-1">
                      {sequence.slice(row * 8 + 4, row * 8 + 8).map((patternId, i) => {
                        const idx = row * 8 + 4 + i;
                        return <Tile key={idx} patternId={patternId} active={currentTileIndex === idx} onClick={() => handleToggle(idx)} isPlaying={isPlaying} isSmall />;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {mode === 'custom' && (
              <div className="flex flex-col gap-2 w-full">
                <div className="grid grid-rows-2 gap-2">
                  {[0, 1].map(row => (
                    <div key={row} className="flex gap-2">
                      <div className="grid grid-cols-4 gap-1 flex-1">
                        {Array.from({ length: 4 }).map((_, i) => {
                          const idx = row * 8 + i;
                          return (
                            <Tile 
                              key={idx} 
                              patternId={customSequence[idx]} 
                              active={currentTileIndex === idx} 
                              onClick={() => handleToggle(idx)}
                              isPlaying={isPlaying}
                              isSmall
                              isEmpty={customSequence[idx] === undefined}
                            />
                          );
                        })}
                      </div>
                      <div className="w-4" />
                      <div className="grid grid-cols-4 gap-1 flex-1">
                        {Array.from({ length: 4 }).map((_, i) => {
                          const idx = row * 8 + 4 + i;
                          return (
                            <Tile 
                              key={idx} 
                              patternId={customSequence[idx]} 
                              active={currentTileIndex === idx} 
                              onClick={() => handleToggle(idx)}
                              isPlaying={isPlaying}
                              isSmall
                              isEmpty={customSequence[idx] === undefined}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl display-box-shadow border border-[#b47e6a]/10 p-2">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-[#b47e6a]/40 uppercase tracking-widest">Add Patterns</span>
                      <div className="flex p-0.5 bg-[#b47e6a]/5 rounded-lg border border-[#b47e6a]/10">
                        {(['beginner', 'intermediate', 'advanced'] as PatternFilter[]).map(f => (
                          <button
                            key={f}
                            onClick={() => setPatternFilter(f)}
                            className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase transition-all ${patternFilter === f ? 'bg-[#ff7c5c] text-white shadow-lg shadow-[#ff7c5c]/20' : 'text-[#b47e6a]/40 hover:text-[#b47e6a]'}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setCustomSequence(prev => prev.slice(0, -1))} className="p-1.5 rounded-lg bg-[#b47e6a]/5 hover:bg-[#b47e6a]/10 text-[#b47e6a]/40 hover:text-[#b47e6a] transition-all"><Delete size={12} /></button>
                      <button onClick={() => setCustomSequence([])} className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="grid grid-rows-2 gap-2">
                    {[0, 1].map(row => (
                      <div key={row} className="grid grid-cols-8 gap-1">
                        {Array.from({ length: 8 }).map((_, i) => {
                          const patternId = row * 8 + i;
                          const isVisible = 
                            patternFilter === 'advanced' || 
                            (patternFilter === 'intermediate' && patternId <= 10) || 
                            (patternFilter === 'beginner' && patternId <= 5);
                          
                          return (
                            <button
                              key={patternId}
                              onClick={() => {
                                if (customSequence.length < 16) {
                                  setCustomSequence(prev => [...prev, patternId]);
                                }
                              }}
                              disabled={isPlaying || customSequence.length >= 16 || !isVisible}
                              className={`aspect-square bg-white rounded-xl border border-[#b47e6a]/10 flex items-center justify-center transition-all active:scale-95 p-1 ${!isVisible ? 'opacity-10 grayscale pointer-events-none' : 'hover:bg-[#ff7c5c]/5 shadow-sm'}`}
                            >
                              <SightNotation patternId={patternId} isSmall />
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
