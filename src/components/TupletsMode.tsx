import { useState, useEffect, useRef, useCallback, FC } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Sliders, RotateCcw, Delete } from 'lucide-react';
import { useMetronome } from '../hooks/useMetronome';
import confetti from 'canvas-confetti';

interface TupletType {
  id: string;
  notesPerBeat: number;
  label: string;
}

const TUPLET_TYPES: TupletType[] = [
  { id: 'quarter', notesPerBeat: 1, label: 'Quarter' },
  { id: '8th', notesPerBeat: 2, label: '8th' },
  { id: 'triplets', notesPerBeat: 3, label: 'Triplets' },
  { id: '16th', notesPerBeat: 4, label: '16th' },
  { id: 'sextuplets', notesPerBeat: 6, label: 'Sextuplets' },
  { id: '32nd', notesPerBeat: 8, label: '32nd' },
];

const BEATS_PER_TUPLET = 4;

export default function TupletsMode({ metronomeVolume = 0.8, drumVolume = 1.0, isHandwriting = false }: { metronomeVolume?: number, drumVolume?: number, isHandwriting?: boolean }) {
  const [startBpm, setStartBpm] = useState(60);
  const [endBpm, setEndBpm] = useState(100);
  const [bpm, setBpm] = useState(60);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customSequence, setCustomSequence] = useState<string[]>([]);
  const [selectedTupletIds, setSelectedTupletIds] = useState<string[]>(['quarter', '8th', 'triplets', '16th', 'sextuplets']);
  const [currentTupletIndex, setCurrentTupletIndex] = useState(-1); // Index in selectedTupletIds
  const [currentBeatIndex, setCurrentBeatIndex] = useState(-1); // 0-3
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
  const selectedTupletIdsRef = useRef(selectedTupletIds);
  const currentTupletIndexRef = useRef(-1);
  const currentBeatIndexRef = useRef(-1);
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
    selectedTupletIdsRef.current = selectedTupletIds;
  }, [bpm, endBpm, isFixedSpeed, isPlaying, isCustomMode, customSequence, selectedTupletIds]);

  const isFirstPreCountTickRef = useRef(true);
  const isInitialStartRef = useRef(true);

  const handleToggle = useCallback(() => {
    const sequence = isCustomModeRef.current ? customSequenceRef.current : selectedTupletIdsRef.current;
    if (isCustomModeRef.current && sequence.length === 0) return;

    if (!isPlaying) {
      window.dispatchEvent(new CustomEvent('closeSettings'));
      window.dispatchEvent(new CustomEvent('closeControls'));
      setIsFinished(false);
      setBpm(startBpm);
      setSessionStartBpm(startBpm);
      setCurrentTupletIndex(-1);
      setCurrentBeatIndex(-1);
      setPreCountDisplay('READY');
      preCountRef.current = 0;
      currentTupletIndexRef.current = -1;
      currentBeatIndexRef.current = -1;
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
    if (currentTupletIndexRef.current === -1) {
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
              setPreCountDisplay('1');
            } else if (currentPreCount === 2) {
              setPreCountDisplay('2');
            } else if (currentPreCount === 3) {
              setPreCountDisplay('3');
            } else if (currentPreCount === 4) {
              setPreCountDisplay('4');
            } else if (currentPreCount === 5) {
              setPreCountDisplay('');
              setCurrentTupletIndex(0);
              setCurrentBeatIndex(0);
            }
          }, UI_DELAY);

          if (currentPreCount === 5) {
            currentTupletIndexRef.current = 0;
            currentBeatIndexRef.current = 0;
          }
        }
      }
      if (currentTupletIndexRef.current === -1) return;
    }

    // Pattern logic
    const sequence = isCustomModeRef.current ? customSequenceRef.current : selectedTupletIdsRef.current;
    const tupletId = sequence[currentTupletIndexRef.current];
    const tuplet = TUPLET_TYPES.find(t => t.id === tupletId);
    if (!tuplet) return;

    const notesPerBeat = tuplet.notesPerBeat;
    const beatDuration = 60 / bpmRef.current;
    const noteDuration = beatDuration / notesPerBeat;
    
    if (sub === 0) {
      for (let i = 0; i < notesPerBeat; i++) {
        playSnare(time + i * noteDuration);
      }
    }

    // Move to next beat/tuplet
    if (sub === 3) {
      const nextBeatIdx = currentBeatIndexRef.current + 1;
      const isCustom = isCustomModeRef.current;
      const beatsPerPattern = isCustom ? 1 : BEATS_PER_TUPLET;

      if (nextBeatIdx >= beatsPerPattern) {
        // Finished current tuplet (1 beat if custom, 4 beats if basic)
        const nextTupletIdx = currentTupletIndexRef.current + 1;
        if (nextTupletIdx >= sequence.length) {
          // Finished full cycle
          if (isFixedSpeedRef.current) {
            currentTupletIndexRef.current = 0;
            currentBeatIndexRef.current = 0;
            setTimeout(() => {
              if (!isPlayingRef.current) return;
              setCurrentTupletIndex(0);
              setCurrentBeatIndex(0);
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
              // Speed transition with 4-beat pre-count
              currentTupletIndexRef.current = -1;
              preCountRef.current = 0;
              isFirstPreCountTickRef.current = true;
              isInitialStartRef.current = false;
              
              setTimeout(() => {
                if (!isPlayingRef.current) return;
                setBpm(nextBpm);
                setStartBpm(nextBpm);
                setCurrentTupletIndex(-1);
                setCurrentBeatIndex(-1);
                setPreCountDisplay('');
              }, UI_DELAY);
            }
          }
        } else {
          currentTupletIndexRef.current = nextTupletIdx;
          currentBeatIndexRef.current = 0;
          setTimeout(() => {
            if (!isPlayingRef.current) return;
            setCurrentTupletIndex(nextTupletIdx);
            setCurrentBeatIndex(0);
          }, UI_DELAY);
        }
      } else {
        currentBeatIndexRef.current = nextBeatIdx;
        setTimeout(() => {
          if (!isPlayingRef.current) return;
          setCurrentBeatIndex(nextBeatIdx);
        }, UI_DELAY);
      }
    }
  }, [playSnare, toggleMetronome, setBpm]);

  const toggleTupletSelection = (id: string) => {
    setSelectedTupletIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== id);
      }
      const next = [...prev, id];
      return TUPLET_TYPES.filter(t => next.includes(t.id)).map(t => t.id);
    });
  };

  const sequenceToRender = isCustomMode ? customSequence : selectedTupletIds;
  const effectiveTupletIndex = currentTupletIndex === -1 ? 0 : currentTupletIndex;
  const activeTupletId = sequenceToRender[effectiveTupletIndex];

  return (
    <div className="flex flex-col h-full items-center justify-start pt-[5px] relative">
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

                  {!isCustomMode && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-[#b47e6a]/40 uppercase tracking-widest">Tuplet Selection</span>
                      <div className="grid grid-cols-3 gap-1 bg-[#b47e6a]/5 p-1 rounded-xl border border-[#b47e6a]/10">
                        {TUPLET_TYPES.map(type => (
                          <button
                            key={type.id}
                            onClick={() => toggleTupletSelection(type.id)}
                            disabled={isPlaying}
                            className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedTupletIds.includes(type.id) ? 'bg-[#ff7c5c] text-white shadow-lg' : 'text-[#b47e6a]/40 hover:bg-[#b47e6a]/5'}`}
                          >
                            {type.notesPerBeat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20"
            title="Backspace"
          >
            <Delete size={18} />
          </button>
          <button
            onClick={handleClear}
            disabled={isPlaying || customSequence.length === 0}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20"
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
            ${isPlaying ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20' : isFinished ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-[#ff7c5c] hover:bg-[#ff6b4a] shadow-lg shadow-[#ff7c5c]/20'}
            ${(isCustomMode && customSequence.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}
            text-white
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
        <div className="bg-white rounded-3xl display-box-shadow p-6 flex flex-col items-center justify-center relative w-full border border-[#b47e6a]/5">
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <AnimatePresence mode="wait">
              {isPlaying && currentTupletIndex < 0 && preCountDisplay && (
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

          <div className="w-full max-w-md flex flex-col gap-1">
            {/* Visualization Grid */}
            <div className="grid grid-cols-4 gap-1">
              {[0, 1, 2, 3].map((i) => {
                let tupletId = '';
                let active = false;

                if (isCustomMode) {
                  tupletId = customSequence[i] || '';
                  active = isPlaying && currentTupletIndex === i;
                } else {
                  tupletId = selectedTupletIds[currentTupletIndex === -1 ? 0 : currentTupletIndex];
                  active = isPlaying && currentBeatIndex === i;
                }

                return (
                  <Tile 
                    key={`curr-${i}`} 
                    active={active} 
                    type={tupletId} 
                    beatIndex={i}
                    isEmpty={isCustomMode && !tupletId}
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
                    const nextIdx = (effectiveTupletIndex + 1) % selectedTupletIds.length;
                    return <Tile key={`next-${i}`} active={false} type={selectedTupletIds[nextIdx]} beatIndex={i} isHandwriting={isHandwriting} />;
                  })}
                </div>
                {/* Next Next Row */}
                <div className="grid grid-cols-4 gap-1 opacity-10 scale-[0.9] origin-top">
                  {[0, 1, 2, 3].map((i) => {
                    const nextNextIdx = (effectiveTupletIndex + 2) % selectedTupletIds.length;
                    return <Tile key={`next-next-${i}`} active={false} type={selectedTupletIds[nextNextIdx]} beatIndex={i} isHandwriting={isHandwriting} />;
                  })}
                </div>
              </>
            )}

            {isCustomMode && (
              <div className="mt-4 bg-white rounded-2xl display-box-shadow border border-[#b47e6a]/10 overflow-hidden">
                <div className="p-4 border-b border-[#b47e6a]/5">
                  <span className="text-[10px] font-bold text-[#b47e6a]/40 uppercase tracking-widest block">Add Patterns</span>
                </div>
                <div className="p-2">
                  <div className="grid grid-cols-4 gap-1">
                    {TUPLET_TYPES.map(type => (
                      <button
                        key={type.id}
                        onClick={() => {
                          if (customSequence.length < 4) {
                            setCustomSequence(prev => [...prev, type.id]);
                          }
                        }}
                        disabled={isPlaying || customSequence.length >= 4}
                        className="aspect-square bg-white rounded-2xl border border-[#b47e6a]/10 flex items-center justify-center hover:bg-[#ff7c5c]/5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none p-2"
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <TupletNotation type={type.id} active={true} beatIndex={0} isHandwriting={isHandwriting} />
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
                  {isPlaying && activeTupletId && (
                    <span className="ml-2 text-[#ff7c5c] text-[10px]">
                      ({TUPLET_TYPES.find(t => t.id === activeTupletId)?.label})
                    </span>
                  )}
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

interface TupletTileProps {
  active: boolean;
  type: string;
  beatIndex: number;
  isEmpty?: boolean;
  isHandwriting?: boolean;
}

const Tile: FC<TupletTileProps> = ({ active, type, beatIndex, isEmpty, isHandwriting }) => {
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
      {!isEmpty && type && (
        <div className="w-full h-full flex items-center justify-center">
          <TupletNotation type={type} active={active} beatIndex={beatIndex} isHandwriting={isHandwriting} />
        </div>
      )}
    </motion.div>
  );
}

function TupletNotation({ type, active, beatIndex, isHandwriting }: { type: string; active: boolean; beatIndex: number; isHandwriting?: boolean }) {
  const BLUE_COLOR = "#3b82f6";
  const RED_COLOR = "#f43f5e";
  const stemColor = active ? "black" : "rgba(0,0,0,0.8)";

  const getNoteColor = (sticking: string) => {
    if (!active) return "rgba(0,0,0,0.7)";
    return sticking === 'L' ? RED_COLOR : BLUE_COLOR;
  };

  const noteHeadRotate = isHandwriting ? -28 : -20;
  const stemWidth = isHandwriting ? 1.8 : 1.5;
  const fontStyle = isHandwriting ? { fontFamily: '"Indie Flower", cursive' } : {};

  if (type === 'quarter') {
    const rx = isHandwriting ? 12 : 10;
    const ry = isHandwriting ? 9 : 7;
    const stemXOffset = isHandwriting ? 10.5 : 8.5;
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="60" rx={rx} ry={ry} fill={getNoteColor('R')} transform={`rotate(${noteHeadRotate} 50 60)`} />
        <line x1={50 + stemXOffset} y1="60" x2={50 + stemXOffset} y2="20" stroke={stemColor} strokeWidth={isHandwriting ? 2.5 : 2} strokeLinecap={isHandwriting ? "round" : "butt"} />
        <text x="50" y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>R</text>
      </svg>
    );
  }

  if (type === '8th') {
    const rx = isHandwriting ? 10 : 8;
    const ry = isHandwriting ? 7 : 5;
    const stemXOffset = isHandwriting ? 8.5 : 7.25;
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="30" cy="60" rx={rx} ry={ry} fill={getNoteColor('R')} transform={`rotate(${noteHeadRotate} 30 60)`} />
        <ellipse cx="70" cy="60" rx={rx} ry={ry} fill={getNoteColor('L')} transform={`rotate(${noteHeadRotate} 70 60)`} />
        <line x1={30 + stemXOffset} y1="60" x2={30 + stemXOffset} y2="20" stroke={stemColor} strokeWidth={stemWidth} strokeLinecap={isHandwriting ? "round" : "butt"} />
        <line x1={70 + stemXOffset} y1="60" x2={70 + stemXOffset} y2="20" stroke={stemColor} strokeWidth={stemWidth} strokeLinecap={isHandwriting ? "round" : "butt"} />
        <rect x={30 + stemXOffset} y="20" width="40" height={isHandwriting ? 8 : 5} fill={stemColor} rx={isHandwriting ? 3 : 0} />
        <text x="30" y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>R</text>
        <text x="70" y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>L</text>
      </svg>
    );
  }

  if (type === 'triplets') {
    const sticking = beatIndex % 2 === 0 ? ['R', 'L', 'R'] : ['L', 'R', 'L'];
    const rx = isHandwriting ? 9 : 7;
    const ry = isHandwriting ? 6 : 4.5;
    const stemXOffset = isHandwriting ? 7.5 : 6.25;
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="25" cy="60" rx={rx} ry={ry} fill={getNoteColor(sticking[0])} transform={`rotate(${noteHeadRotate} 25 60)`} />
        <ellipse cx="50" cy="60" rx={rx} ry={ry} fill={getNoteColor(sticking[1])} transform={`rotate(${noteHeadRotate} 50 60)`} />
        <ellipse cx="75" cy="60" rx={rx} ry={ry} fill={getNoteColor(sticking[2])} transform={`rotate(${noteHeadRotate} 75 60)`} />
        <line x1={25 + stemXOffset} y1="60" x2={25 + stemXOffset} y2="20" stroke={stemColor} strokeWidth={stemWidth} strokeLinecap={isHandwriting ? "round" : "butt"} />
        <line x1={50 + stemXOffset} y1="60" x2={50 + stemXOffset} y2="20" stroke={stemColor} strokeWidth={stemWidth} strokeLinecap={isHandwriting ? "round" : "butt"} />
        <line x1={75 + stemXOffset} y1="60" x2={75 + stemXOffset} y2="20" stroke={stemColor} strokeWidth={stemWidth} strokeLinecap={isHandwriting ? "round" : "butt"} />
        <rect x={25 + stemXOffset} y="20" width="50" height={isHandwriting ? 8 : 5} fill={stemColor} rx={isHandwriting ? 3 : 0} />
        <text x="50" y="15" textAnchor="middle" className={`text-[12px] font-black fill-black italic ${isHandwriting ? 'text-[14px]' : ''}`} style={fontStyle}>3</text>
        <text x="25" y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>{sticking[0]}</text>
        <text x="50" y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>{sticking[1]}</text>
        <text x="75" y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>{sticking[2]}</text>
      </svg>
    );
  }

  if (type === '16th') {
    const sticking = ['R', 'L', 'R', 'L'];
    const rx = isHandwriting ? 7.5 : 6;
    const ry = isHandwriting ? 5.5 : 4;
    const stemXOffset = isHandwriting ? 6.5 : 5.5;
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {[20, 40, 60, 80].map((x, i) => (
          <ellipse key={i} cx={x} cy="60" rx={rx} ry={ry} fill={getNoteColor(sticking[i])} transform={`rotate(${noteHeadRotate} ${x} 60)`} />
        ))}
        {[20, 40, 60, 80].map((x, i) => (
          <line key={i} x1={x + stemXOffset} y1="60" x2={x + stemXOffset} y2="20" stroke={stemColor} strokeWidth={stemWidth} strokeLinecap={isHandwriting ? "round" : "butt"} />
        ))}
        <rect x={20 + stemXOffset} y="20" width="60" height={isHandwriting ? 8 : 4} fill={stemColor} rx={isHandwriting ? 3 : 0} />
        <rect x={20 + stemXOffset} y={isHandwriting ? 34 : 28} width="60" height={isHandwriting ? 8 : 4} fill={stemColor} rx={isHandwriting ? 3 : 0} />
        <text x="55" y="15" textAnchor="middle" className={`text-[12px] font-black fill-black italic ${isHandwriting ? 'text-[14px]' : ''}`} style={fontStyle}>4</text>
        {[20, 40, 60, 80].map((x, i) => (
          <text key={i} x={x} y="85" textAnchor="middle" className={`text-[9px] font-black fill-black/40 ${isHandwriting ? 'text-[11px]' : ''}`} style={fontStyle}>{sticking[i]}</text>
        ))}
      </svg>
    );
  }

  if (type === 'sextuplets') {
    const sticking = ['R', 'L', 'R', 'L', 'R', 'L'];
    const rx = isHandwriting ? 6.5 : 5;
    const ry = isHandwriting ? 4.5 : 3.5;
    const stemXOffset = isHandwriting ? 5.5 : 4.5;
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {[15, 29, 43, 57, 71, 85].map((x, i) => (
          <ellipse key={i} cx={x} cy="60" rx={rx} ry={ry} fill={getNoteColor(sticking[i])} transform={`rotate(${noteHeadRotate} ${x} 60)`} />
        ))}
        {[15, 29, 43, 57, 71, 85].map((x, i) => (
          <line key={i} x1={x + stemXOffset} y1="60" x2={x + stemXOffset} y2="20" stroke={stemColor} strokeWidth={isHandwriting ? 1.8 : 1.2} strokeLinecap={isHandwriting ? "round" : "butt"} />
        ))}
        <rect x={15 + stemXOffset} y="20" width="70" height={isHandwriting ? 8 : 4} fill={stemColor} rx={isHandwriting ? 3 : 0} />
        <rect x={15 + stemXOffset} y={isHandwriting ? 34 : 28} width="70" height={isHandwriting ? 8 : 4} fill={stemColor} rx={isHandwriting ? 3 : 0} />
        <text x="55" y="15" textAnchor="middle" className={`text-[12px] font-black fill-black italic ${isHandwriting ? 'text-[14px]' : ''}`} style={fontStyle}>6</text>
        {[15, 29, 43, 57, 71, 85].map((x, i) => (
          <text key={i} x={x} y="85" textAnchor="middle" className={`text-[7px] font-black fill-black/40 ${isHandwriting ? 'text-[9px]' : ''}`} style={fontStyle}>{sticking[i]}</text>
        ))}
      </svg>
    );
  }

  if (type === '32nd') {
    const sticking = ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'];
    const rx = isHandwriting ? 5 : 4;
    const ry = isHandwriting ? 4 : 3;
    const stemXOffset = isHandwriting ? 4.5 : 3.5;
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {[10, 21, 32, 43, 54, 65, 76, 87].map((x, i) => (
          <ellipse key={i} cx={x} cy="60" rx={rx} ry={ry} fill={getNoteColor(sticking[i])} transform={`rotate(${noteHeadRotate} ${x} 60)`} />
        ))}
        {[10, 21, 32, 43, 54, 65, 76, 87].map((x, i) => (
          <line key={i} x1={x + stemXOffset} y1="60" x2={x + stemXOffset} y2="20" stroke={stemColor} strokeWidth={isHandwriting ? 1.5 : 1} strokeLinecap={isHandwriting ? "round" : "butt"} />
        ))}
        <rect x={10 + stemXOffset} y="20" width="77" height={isHandwriting ? 6 : 3} fill={stemColor} rx={isHandwriting ? 2 : 0} />
        <rect x={10 + stemXOffset} y={isHandwriting ? 28 : 26} width="77" height={isHandwriting ? 6 : 3} fill={stemColor} rx={isHandwriting ? 2 : 0} />
        <rect x={10 + stemXOffset} y={isHandwriting ? 36 : 32} width="77" height={isHandwriting ? 6 : 3} fill={stemColor} rx={isHandwriting ? 2 : 0} />
        <text x="52" y="15" textAnchor="middle" className={`text-[12px] font-black fill-black italic ${isHandwriting ? 'text-[14px]' : ''}`} style={fontStyle}>8</text>
        {[10, 21, 32, 43, 54, 65, 76, 87].map((x, i) => (
          <text key={i} x={x} y="85" textAnchor="middle" className={`text-[6px] font-black fill-black/40 ${isHandwriting ? 'text-[8px]' : ''}`} style={fontStyle}>{sticking[i]}</text>
        ))}
      </svg>
    );
  }

  return null;
}
