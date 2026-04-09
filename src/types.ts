export type Mode = 'speed-up' | 'tuplets' | 'accents' | 'beat-exercise' | 'sight-reading' | 'ear-training';

export interface ExerciseConfig {
  bpm: number;
  duration: number; // in seconds or bars
  targetBpm?: number;
  pattern?: string;
  accentPattern?: number[];
}

export interface MetronomeState {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  totalBeats: number;
}
