import React, { useState, useEffect, useRef, useCallback, FC } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Sliders, Trash2, Delete, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
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
  const fontSize = isSmall ? 14 : 18;

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" className="text-black overflow-visible">
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
              <ellipse cx={x} cy={50} rx="7.5" ry="5.5" fill="black" transform={`rotate(-28 ${x} 50)`} />
              <line x1={x + 6.5} y1={50} x2={x + 6.5} y2={10} stroke="black" strokeWidth="1.8" />
              {hasFlag && (
                <g>
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

        const drawBeam = (iStart: number, iEnd: number, y: number = 10) => {
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
  isCorrect?: boolean;
  isWrong?: boolean;
}

const Tile: FC<TileProps> = ({ patternId, active, onClick, isPlaying, isSmall, isEmpty, isCorrect, isWrong }) => {
  return (
    <button 
      onClick={onClick}
      disabled={isEmpty}
      className={`aspect-square bg-white rounded-2xl border border-[#b47e6a]/10 flex items-center justify-center relative overflow-hidden transition-all 
        ${active ? 'ring-4 ring-[#ff7c5c] ring-inset shadow-[0_0_20px_rgba(255,124,92,0.3)]' : 'hover:bg-[#ff7c5c]/5'} 
        ${isSmall ? 'rounded-xl' : ''} 
        ${isEmpty ? 'bg-[#b47e6a]/5 border-dashed' : 'shadow-sm'}
        ${isCorrect ? 'bg-emerald-50 border-emerald-500/50' : ''}
        ${isWrong ? 'bg-rose-50 border-rose-500/50' : ''}
      `}
    >
      {!isEmpty && patternId !== undefined && <SightNotation patternId={patternId} isSmall={isSmall} />}
      {active && isPlaying && (
        <motion.div layoutId="active-glow" className="absolute inset-0 bg-[#ff7c5c]/10 z-0" />
      )}
      {isCorrect && <div className="absolute top-1 right-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>}
      {isWrong && <div className="absolute top-1 right-1"><XCircle className="w-4 h-4 text-rose-500" /></div>}
    </button>
  );
};

function ControlGroup({ label, value, onChange, min, max, step = 1 }: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <label className="text-[10px] font-medium text-[#b47e6a]/40 uppercase tracking-widest">{label}</label>
        <span className="text-lg font-bold text-[#ff7c5c]">{value}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-[#ff7c5c] h-1.5 bg-[#b47e6a]/10 rounded-full appearance-none cursor-pointer"
      />
    </div>
  );
}

type PatternFilter = 'beginner' | 'intermediate' | 'advanced';

const CONGRATS_MESSAGES = [
  "Wow! You have golden ears! 👂✨",
  "Are you a rhythm god? 🥁🔥",
  "Perfect! Even the metronome is jealous! ⏱️",
  "You nailed it! Time to join a band! 🎸",
  "Unbelievable! Your ears are 20/20! 👁️👂",
  "Rhythm Master in the house! 🏠👑",
];

const CONGRATS_IMAGES = [
  "https://picsum.photos/seed/cartoon-hero/400/300",
  "https://picsum.photos/seed/dinosaur-party/400/300",
  "https://picsum.photos/seed/space-adventure/400/300",
  "https://picsum.photos/seed/cute-robot/400/300",
  "https://picsum.photos/seed/magic-castle/400/300",
];

export default function EarTrainingMode({ metronomeVolume = 0.8, drumVolume = 1.0 }: { metronomeVolume?: number, drumVolume?: number }) {
  const [bpm, setBpm] = useState(60);
  const [slotCount, setSlotCount] = useState(4);
  const [patternFilter, setPatternFilter] = useState<PatternFilter>('beginner');
  const [answerSequence, setAnswerSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [currentTileIndex, setCurrentTileIndex] = useState(-1);
  const [showControls, setShowControls] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [congratsIndex, setCongratsIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const bpmRef = useRef(bpm);
  const answerSequenceRef = useRef(answerSequence);
  const currentTileIndexRef = useRef(-1);

  const { isPlaying, toggleMetronome, playSnare, onTickRef } = useMetronome(bpm, 4, true, metronomeVolume * 0.5, drumVolume * 1.3);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { answerSequenceRef.current = answerSequence; }, [answerSequence]);

  const generateNewChallenge = useCallback(() => {
    const maxId = patternFilter === 'beginner' ? 5 : patternFilter === 'intermediate' ? 10 : 15;
    const newSeq: number[] = [];
    for (let i = 0; i < slotCount; i++) {
      newSeq.push(Math.floor(Math.random() * (maxId + 1)));
    }
    setAnswerSequence(newSeq);
    setUserSequence([]);
    setIsSuccess(false);
    setCurrentTileIndex(-1);
    
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  }, [slotCount, patternFilter]);

  useEffect(() => {
    generateNewChallenge();
  }, [generateNewChallenge]);

  const handleToggle = useCallback(() => {
    if (!isPlaying) {
      if (isSuccess) {
        generateNewChallenge();
        return;
      }
      window.dispatchEvent(new CustomEvent('closeSettings'));
      window.dispatchEvent(new CustomEvent('closeControls'));
      setCurrentTileIndex(-1);
      currentTileIndexRef.current = -1;
      toggleMetronome(0);
    } else {
      toggleMetronome();
    }
  }, [isPlaying, isSuccess, generateNewChallenge, toggleMetronome]);

  const handleRefresh = useCallback(() => {
    generateNewChallenge();
  }, [generateNewChallenge]);

  useEffect(() => {
    onTickRef.current = (tick, beat, sub, time) => {
      const totalTiles = answerSequenceRef.current.length;

      if (sub === 0) {
        if (currentTileIndexRef.current === -1) {
          currentTileIndexRef.current = 0;
        } else {
          currentTileIndexRef.current += 1;
        }
        
        if (currentTileIndexRef.current >= totalTiles) {
          toggleMetronome();
          setCurrentTileIndex(-1);
          return;
        }
        setCurrentTileIndex(currentTileIndexRef.current);
      }

      const patternId = answerSequenceRef.current[currentTileIndexRef.current];
      const soundPattern = PATTERN_SOUNDS[patternId] || 'xxxx';
      if (soundPattern[sub] === 'o') {
        playSnare(time);
      }
    };
  }, [playSnare, toggleMetronome]);

  const checkAnswer = useCallback((newUserSeq: number[]) => {
    if (newUserSeq.length === answerSequence.length) {
      const isAllCorrect = newUserSeq.every((val, idx) => val === answerSequence[idx]);
      if (isAllCorrect) {
        setIsSuccess(true);
        setCongratsIndex(Math.floor(Math.random() * CONGRATS_MESSAGES.length));
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
      }
    }
  }, [answerSequence]);

  const addTile = (patternId: number) => {
    if (isSuccess || userSequence.length >= slotCount) return;
    const nextSeq = [...userSequence, patternId];
    setUserSequence(nextSeq);
    checkAnswer(nextSeq);
  };

  const removeLastTile = () => {
    if (isSuccess) return;
    setUserSequence(prev => prev.slice(0, -1));
  };

  const clearTiles = () => {
    if (isSuccess) return;
    setUserSequence([]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();
      
      if (isSuccess) {
        generateNewChallenge();
        return;
      }

      if (key === 'arrowleft') setBpm(prev => Math.max(20, prev - 10));
      if (key === 'arrowright') setBpm(prev => Math.min(240, prev + 10));
      if (key === 'enter') handleRefresh();
      if (key === 'c' || key === 'ㅊ') {
        e.stopPropagation();
        const next = !showControls;
        if (next) {
          window.dispatchEvent(new CustomEvent('closeSettings'));
        }
        setShowControls(next);
      }
      if (key === 'd' || key === 'ㅇ') {
        e.stopPropagation();
        setShowControls(true);
      }
      if (key === 'o' || key === 'ㅐ') {
        // App handles O for settings
      }
      if (key === 'backspace') {
        removeLastTile();
      }
      if (key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh, handleToggle, isSuccess, generateNewChallenge]);

  const [portalNodes, setPortalNodes] = useState<{ controls: HTMLElement | null; start: HTMLElement | null; tools: HTMLElement | null }>({ controls: null, start: null, tools: null });
  useEffect(() => {
    const controls = document.getElementById('speed-up-controls-portal');
    const start = document.getElementById('speed-up-start-portal');
    const tools = document.getElementById('custom-tools-portal');
    setPortalNodes({ controls, start, tools });
  }, []);

  useEffect(() => {
    if (isPlaying) setShowControls(false);
  }, [isPlaying]);

  useEffect(() => {
    const handleCloseControls = () => setShowControls(false);
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showControls && !target.closest('#ear-training-controls-container')) {
        setShowControls(false);
      }
    };

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
    <div className="flex flex-col items-center gap-0.5 w-full h-full p-0.5 overflow-y-auto relative justify-start pt-2">
      {portalNodes.controls && createPortal(
        <div className="flex items-center gap-2 relative">
          <button 
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
                id="ear-training-controls-container"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 z-[60] w-[320px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#b47e6a]/10 p-6 shadow-2xl space-y-6">
                  <div className="space-y-6">
                    <ControlGroup label="BPM" value={bpm} onChange={setBpm} min={20} max={240} step={10} />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-[#b47e6a]/40 uppercase tracking-widest">Slots</label>
                    <div className="flex p-1 bg-[#b47e6a]/5 rounded-xl border border-[#b47e6a]/10">
                      {[4, 8, 16].map(count => (
                        <button
                          key={count}
                          onClick={() => {
                            setSlotCount(count);
                            generateNewChallenge();
                          }}
                          className={`flex-1 flex items-center justify-center py-2 rounded-lg text-[9px] font-bold transition-all ${slotCount === count ? 'bg-[#ff7c5c] text-white shadow-lg shadow-[#ff7c5c]/20' : 'text-[#b47e6a]/40 hover:bg-[#b47e6a]/5'}`}
                        >
                          {count}
                        </button>
                      ))}
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#d6cdc4]/20 border border-[#d6cdc4]/30 rounded-xl">
            <span className="text-sm font-black text-[#ff7c5c]">{bpm}</span>
          </div>
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
          onClick={handleToggle}
          className={`px-6 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all min-w-[120px] text-white ${isPlaying ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20' : isSuccess ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-[#ff7c5c] hover:bg-[#ff6b4a] shadow-lg shadow-[#ff7c5c]/20'}`}
        >
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.span key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>NEXT</motion.span>
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

      <div className="w-full flex flex-col gap-0.5 items-center flex-1 justify-start max-w-4xl min-h-0">
        <div className="bg-white rounded-3xl display-box-shadow p-6 flex flex-col items-center justify-center relative w-full min-h-[400px] border border-[#b47e6a]/5">
          <AnimatePresence>
            {isSuccess && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={generateNewChallenge}
                className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md rounded-[32px] p-8 text-center cursor-pointer"
              >
                <motion.img 
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  src={CONGRATS_IMAGES[congratsIndex]} 
                  alt="Congrats" 
                  className="w-64 h-48 object-cover rounded-2xl mb-6 shadow-2xl border-4 border-[#ff7c5c]"
                  referrerPolicy="no-referrer"
                />
                <h2 className="text-3xl font-black mb-4 bg-gradient-to-r from-[#ff7c5c] to-[#b47e6a] bg-clip-text text-transparent">
                  {CONGRATS_MESSAGES[congratsIndex]}
                </h2>
                <p className="text-[#b47e6a]/40 text-sm animate-pulse">Click or press any key to continue</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <AnimatePresence mode="wait">
              {isRefreshing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  className="text-4xl font-black text-[#ff7c5c] drop-shadow-[0_0_20px_rgba(255,124,92,0.5)]"
                >
                  NEW CHALLENGE
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={`w-full flex flex-col gap-4 ${slotCount === 4 ? 'max-w-xl' : 'max-w-3xl'}`}>
            <div className="flex flex-col gap-2">
              <div className={`grid ${slotCount === 4 ? 'grid-cols-4' : 'grid-rows-2'} gap-2`}>
                {slotCount === 4 ? (
                  Array.from({ length: 4 }).map((_, idx) => {
                    const isFilled = userSequence[idx] !== undefined;
                    const isCorrect = isFilled && userSequence[idx] === answerSequence[idx];
                    const isWrong = isFilled && userSequence[idx] !== answerSequence[idx];
                    
                    return (
                      <Tile 
                        key={idx} 
                        patternId={userSequence[idx]} 
                        active={currentTileIndex === idx} 
                        onClick={() => {}}
                        isPlaying={isPlaying}
                        isEmpty={!isFilled}
                        isCorrect={isCorrect}
                        isWrong={isWrong}
                      />
                    );
                  })
                ) : (
                  [0, 1].map(row => (
                    <div key={row} className="flex gap-2">
                      <div className="grid grid-cols-4 gap-1 flex-1">
                        {Array.from({ length: 4 }).map((_, i) => {
                          const idx = row * 8 + i;
                          if (idx >= slotCount) return <div key={idx} className="aspect-square" />;
                          const isFilled = userSequence[idx] !== undefined;
                          const isCorrect = isFilled && userSequence[idx] === answerSequence[idx];
                          const isWrong = isFilled && userSequence[idx] !== answerSequence[idx];
                          
                          return (
                            <Tile 
                              key={idx} 
                              patternId={userSequence[idx]} 
                              active={currentTileIndex === idx} 
                              onClick={() => {}}
                              isPlaying={isPlaying}
                              isSmall
                              isEmpty={!isFilled}
                              isCorrect={isCorrect}
                              isWrong={isWrong}
                            />
                          );
                        })}
                      </div>
                      <div className="w-4" />
                      <div className="grid grid-cols-4 gap-1 flex-1">
                        {Array.from({ length: 4 }).map((_, i) => {
                          const idx = row * 8 + 4 + i;
                          if (idx >= slotCount) return <div key={idx} className="aspect-square" />;
                          const isFilled = userSequence[idx] !== undefined;
                          const isCorrect = isFilled && userSequence[idx] === answerSequence[idx];
                          const isWrong = isFilled && userSequence[idx] !== answerSequence[idx];

                          return (
                            <Tile 
                              key={idx} 
                              patternId={userSequence[idx]} 
                              active={currentTileIndex === idx} 
                              onClick={() => {}}
                              isPlaying={isPlaying}
                              isSmall
                              isEmpty={!isFilled}
                              isCorrect={isCorrect}
                              isWrong={isWrong}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white rounded-2xl display-box-shadow border border-[#b47e6a]/10 p-2">
                <div className="flex justify-between items-center mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-[#b47e6a]/40 uppercase tracking-widest">Select Rhythms</span>
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
                    <button onClick={removeLastTile} className="p-1.5 rounded-lg bg-[#b47e6a]/5 hover:bg-[#b47e6a]/10 text-[#b47e6a]/40 hover:text-[#b47e6a] transition-all"><Delete size={12} /></button>
                    <button onClick={clearTiles} className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all"><Trash2 size={12} /></button>
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
                            onClick={() => addTile(patternId)}
                            disabled={userSequence.length >= slotCount || !isVisible}
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
          </div>
        </div>
      </div>
    </div>
  );
}
