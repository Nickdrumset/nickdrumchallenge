/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Timer, 
  Music, 
  Zap, 
  Settings, 
  Play, 
  Square, 
  ChevronLeft, 
  ChevronRight,
  Keyboard,
  RotateCcw,
  Drum,
  Volume2,
  VolumeX,
  Delete,
  Trash2,
  Maximize,
  Minimize
} from 'lucide-react';
import { Mode } from './types';
import SpeedUpMode from './components/SpeedUpMode';
import TupletsMode from './components/TupletsMode';
import AccentsMode from './components/AccentsMode';
import BeatExercise from './components/BeatExercise';
import SightReadingMode from './components/SightReadingMode';
import EarTrainingMode from './components/EarTrainingMode';

const modes: Mode[] = ['speed-up', 'tuplets', 'accents', 'beat-exercise', 'sight-reading', 'ear-training'];

export default function App() {
  const [mode, setMode] = useState<Mode>('speed-up');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [metronomeVolume, setMetronomeVolume] = useState(0.8);
  const [drumVolume, setDrumVolume] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleCloseSettings = () => setShowSettings(false);
    window.addEventListener('closeSettings', handleCloseSettings);
    return () => window.removeEventListener('closeSettings', handleCloseSettings);
  }, []);

  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  useEffect(() => {
    if (showSettings) {
      window.dispatchEvent(new CustomEvent('closeControls'));
    }
  }, [showSettings]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;

    const key = e.key.toLowerCase();
    const code = e.code;

    if (key === 'm' || key === 'ㅡ' || code === 'KeyM') {
      setIsSidebarOpen(prev => !prev);
      setSelectedMenuIndex(modes.indexOf(mode));
      return;
    }

    if (key === 'o' || key === 'ㅐ' || code === 'KeyO') {
      e.preventDefault();
      toggleSettings();
      return;
    }

    if (key === 'f' || key === 'ㄹ' || code === 'KeyF') {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    if (key === 'escape') {
      setShowSettings(false);
    }

    if (isSidebarOpen) {
      if (key === 'arrowdown') {
        e.preventDefault();
        setSelectedMenuIndex(prev => (prev + 1) % modes.length);
      } else if (key === 'arrowup') {
        e.preventDefault();
        setSelectedMenuIndex(prev => (prev - 1 + modes.length) % modes.length);
      } else if (key === 'enter') {
        e.preventDefault();
        setMode(modes[selectedMenuIndex]);
        setIsSidebarOpen(false);
      } else if (key === 'escape') {
        setIsSidebarOpen(false);
      }
      return;
    }

    if (key === 's' || key === 'ㄴ' || code === 'KeyS') {
      setMode('speed-up');
    } else if (key === 't' || key === 'ㅅ' || code === 'KeyT') {
      setMode('tuplets');
    } else if (key === 'a' || key === 'ㅁ' || code === 'KeyA') {
      setMode('accents');
    } else if (key === 'b' || key === 'ㅠ' || code === 'KeyB') {
      setMode('beat-exercise');
    } else if (key === 'r' || key === 'ㄱ' || code === 'KeyR') {
      setMode('sight-reading');
    } else if (key === 'e' || key === 'ㄷ' || code === 'KeyE') {
      setMode('ear-training');
    }
  }, [isSidebarOpen, mode, selectedMenuIndex, toggleSettings]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen bg-[#fdfbf9] text-[#4a4a4a] font-sans overflow-hidden flex relative">
      {/* Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-[#b47e6a]/10 flex flex-col items-center py-4 z-50 overflow-y-auto fixed inset-y-0 left-0 shadow-2xl"
      >
        <div className="mb-4 w-full px-4 h-10 flex items-center">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex justify-center items-center"
          >
            <AnimatePresence mode="wait">
              {isSidebarOpen ? (
                <motion.div
                  key="text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center w-full"
                >
                  <span className="text-sm font-black bg-gradient-to-r from-[#ff7c5c] to-[#b47e6a] bg-clip-text text-transparent whitespace-nowrap block">
                    Nick Drum Challenge
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="icon"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center justify-center"
                >
                  <div className="w-10 h-10 bg-[#ff7c5c] rounded-lg flex items-center justify-center shadow-lg shadow-[#ff7c5c]/20">
                    <Drum className="w-6 h-6 text-white" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <ModeButton 
            active={mode === 'speed-up'} 
            isHighlighted={isSidebarOpen && selectedMenuIndex === 0}
            onClick={() => { setMode('speed-up'); setIsSidebarOpen(false); }}
            icon={<span className="w-5 h-5 flex items-center justify-center font-bold text-lg">S</span>}
            label="Speed Up"
            shortcut="S"
            isOpen={isSidebarOpen}
          />
          <ModeButton 
            active={mode === 'tuplets'} 
            isHighlighted={isSidebarOpen && selectedMenuIndex === 1}
            onClick={() => { setMode('tuplets'); setIsSidebarOpen(false); }}
            icon={<span className="w-5 h-5 flex items-center justify-center font-bold text-lg">T</span>}
            label="Tuplets"
            shortcut="T"
            isOpen={isSidebarOpen}
          />
          <ModeButton 
            active={mode === 'accents'} 
            isHighlighted={isSidebarOpen && selectedMenuIndex === 2}
            onClick={() => { setMode('accents'); setIsSidebarOpen(false); }}
            icon={<span className="w-5 h-5 flex items-center justify-center font-bold text-lg">A</span>}
            label="Accents"
            shortcut="A"
            isOpen={isSidebarOpen}
          />
          <ModeButton 
            active={mode === 'beat-exercise'} 
            isHighlighted={isSidebarOpen && selectedMenuIndex === 3}
            onClick={() => { setMode('beat-exercise'); setIsSidebarOpen(false); }}
            icon={<span className="w-5 h-5 flex items-center justify-center font-bold text-lg">B</span>}
            label="Beat"
            shortcut="B"
            isOpen={isSidebarOpen}
          />
          <ModeButton 
            active={mode === 'sight-reading'} 
            isHighlighted={isSidebarOpen && selectedMenuIndex === 4}
            onClick={() => { setMode('sight-reading'); setIsSidebarOpen(false); }}
            icon={<span className="w-5 h-5 flex items-center justify-center font-bold text-lg">R</span>}
            label="Sight Reading"
            shortcut="R"
            isOpen={isSidebarOpen}
          />
          <ModeButton 
            active={mode === 'ear-training'} 
            isHighlighted={isSidebarOpen && selectedMenuIndex === 5}
            onClick={() => { setMode('ear-training'); setIsSidebarOpen(false); }}
            icon={<span className="w-5 h-5 flex items-center justify-center font-bold text-lg">E</span>}
            label="Ear Training"
            shortcut="E"
            isOpen={isSidebarOpen}
          />
        </nav>

        <div className="mt-auto flex flex-col gap-2 w-full px-4 mb-4">
          <ModeButton 
            active={false} 
            onClick={toggleFullscreen}
            icon={isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            label={isFullscreen ? "Exit Full" : "Full Screen"}
            shortcut="F"
            isOpen={isSidebarOpen}
          />
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col ml-[80px]">
        <header className="h-14 border-b border-[#b47e6a]/10 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-4">
            <h1 className={`font-semibold tracking-tight text-[#b47e6a] transition-all text-2xl`}>
              {mode === 'speed-up' && 'Speed Up Challenge'}
              {mode === 'tuplets' && 'Tuplets Exercise'}
              {mode === 'accents' && 'Accents Exercise'}
              {mode === 'beat-exercise' && 'Beat Exercise'}
              {mode === 'sight-reading' && 'Sight Reading Exercise'}
              {mode === 'ear-training' && 'Rhythm Ear Training'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div id="custom-tools-portal" className="flex items-center gap-2 ml-auto" />
            <div className="relative">
              <button 
                onClick={toggleSettings}
                className={`p-2.5 rounded-xl transition-all active:scale-95 border ${showSettings ? 'bg-[#ff7c5c] text-white border-[#ff7c5c]' : 'bg-[#d6cdc4]/20 border-[#d6cdc4]/30 text-[#b47e6a] hover:bg-[#d6cdc4]/30'}`}
              >
                <Settings size={18} />
              </button>
              
              <AnimatePresence>
                {showSettings && (
                  <>
                    <div className="fixed inset-0 z-50" onClick={() => setShowSettings(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-2 w-72 bg-white/95 backdrop-blur-md border border-[#b47e6a]/10 rounded-2xl p-4 shadow-2xl z-[60]"
                    >
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Volume2 size={14} className="text-[#b47e6a]/40" />
                              <label className="text-[10px] font-medium text-[#b47e6a]/40 uppercase tracking-widest">Metronome</label>
                            </div>
                            <span className="text-xs font-bold text-[#ff7c5c]">{Math.round(metronomeVolume * 100)}%</span>
                          </div>
                          <input 
                            type="range" min={0} max={1} step={0.01} value={metronomeVolume} 
                            onChange={(e) => setMetronomeVolume(parseFloat(e.target.value))}
                            className="w-full accent-[#ff7c5c] h-1.5 bg-[#b47e6a]/10 rounded-full appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Drum size={14} className="text-[#b47e6a]/40" />
                              <label className="text-[10px] font-medium text-[#b47e6a]/40 uppercase tracking-widest">Drum Sound</label>
                            </div>
                            <span className="text-xs font-bold text-[#ff7c5c]">{Math.round(drumVolume * 100)}%</span>
                          </div>
                          <input 
                            type="range" min={0} max={1} step={0.01} value={drumVolume} 
                            onChange={(e) => setDrumVolume(parseFloat(e.target.value))}
                            className="w-full accent-[#ff7c5c] h-1.5 bg-[#b47e6a]/10 rounded-full appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="pt-4 border-t border-[#b47e6a]/5">
                          <div className="flex items-center gap-2 mb-3">
                            <Keyboard size={14} className="text-[#b47e6a]/40" />
                            <label className="text-[10px] font-medium text-[#b47e6a]/40 uppercase tracking-widest">Shortcuts</label>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#b47e6a]/5 p-2 rounded-lg border border-[#b47e6a]/5">
                              <div className="text-[8px] text-[#b47e6a]/20 uppercase mb-1">Space</div>
                              <div className="text-[10px] text-[#4a4a4a]/60">Start / Stop</div>
                            </div>
                            <div className="bg-[#b47e6a]/5 p-2 rounded-lg border border-[#b47e6a]/5">
                              <div className="text-[8px] text-[#b47e6a]/20 uppercase mb-1">C</div>
                              <div className="text-[10px] text-[#4a4a4a]/60">Controls</div>
                            </div>
                            <div className="bg-[#b47e6a]/5 p-2 rounded-lg border border-[#b47e6a]/5">
                                <div className="text-[8px] text-[#b47e6a]/20 uppercase mb-1">O</div>
                                <div className="text-[10px] text-[#4a4a4a]/60">Settings</div>
                              </div>
                              <div className="bg-[#b47e6a]/5 p-2 rounded-lg border border-[#b47e6a]/5">
                              <div className="text-[8px] text-[#b47e6a]/20 uppercase mb-1">M</div>
                              <div className="text-[10px] text-[#4a4a4a]/60">Menu</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div id="speed-up-controls-portal" className="flex items-center gap-2" />
            <div id="speed-up-start-portal" />
          </div>
        </header>

        <div className="flex-1 p-0.5 overflow-auto pt-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="h-full"
            >
              {mode === 'speed-up' && <SpeedUpMode metronomeVolume={metronomeVolume} drumVolume={drumVolume} />}
              {mode === 'tuplets' && <TupletsMode metronomeVolume={metronomeVolume} drumVolume={drumVolume} />}
              {mode === 'accents' && <AccentsMode metronomeVolume={metronomeVolume} drumVolume={drumVolume} />}
              {mode === 'beat-exercise' && <BeatExercise metronomeVolume={metronomeVolume} drumVolume={drumVolume} />}
              {mode === 'sight-reading' && <SightReadingMode metronomeVolume={metronomeVolume} drumVolume={drumVolume} />}
              {mode === 'ear-training' && <EarTrainingMode metronomeVolume={metronomeVolume} drumVolume={drumVolume} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Landscape Check */}
      <div className="fixed inset-0 z-[100] bg-[#fdfbf9] flex-col items-center justify-center p-8 text-center portrait:flex hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-6"
        >
          <RotateCcw className="w-16 h-16 text-[#ff7c5c]" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-3 tracking-tight text-[#4a4a4a]">Landscape Mode Required</h2>
        <p className="text-[#b47e6a]/40 max-w-xs mx-auto leading-relaxed">
          Please rotate your device to landscape to start your drum challenge.
        </p>
      </div>
    </div>
  );
}

function ModeButton({ active, isHighlighted, onClick, icon, label, shortcut, isOpen }: { 
  active: boolean; 
  isHighlighted?: boolean;
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  shortcut: string;
  isOpen: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative group flex items-center gap-4 p-3 rounded-xl transition-all duration-300
        ${active ? 'bg-white text-[#ff7c5c] shadow-[0_4px_20px_rgba(255,124,92,0.3)]' : isHighlighted ? 'bg-[#b47e6a]/10 text-[#b47e6a]' : 'text-[#b47e6a]/40 hover:bg-[#b47e6a]/5 hover:text-[#b47e6a]'}
      `}
    >
      <div className="flex-shrink-0">{icon}</div>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex items-center justify-between gap-8"
        >
          <span className="font-medium whitespace-nowrap">{label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${active ? 'border-[#ff7c5c]/30 text-[#ff7c5c]/70' : 'border-[#b47e6a]/10 text-[#b47e6a]/20'}`}>
            {shortcut}
          </span>
        </motion.div>
      )}
      {!isOpen && active && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute -left-1 w-1 h-6 bg-[#ff7c5c] rounded-full"
        />
      )}
    </button>
  );
}
