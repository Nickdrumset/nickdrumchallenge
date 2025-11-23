/**
 * Nick Drum Challenge V2 - Audio Engine
 * (수정: config.js의 볼륨 설정값 연동)
 */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.reverbNode = null;
        this.isInitialized = false;
        this.noiseBuffer = null;
    }

    init() {
        if (this.isInitialized) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext({ latencyHint: 'interactive' });

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = CONFIG.audio.masterVolume;
        this.masterGain.connect(this.ctx.destination);

        this.reverbNode = this.ctx.createConvolver();
        this.reverbNode.buffer = this._createReverbIR(1.5, 2.5);
        this.reverbNode.connect(this.masterGain);

        this._createNoiseBuffer();
        this.isInitialized = true;
        console.log("Audio Engine Initialized 🔊");
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    get currentTime() {
        return this.ctx ? this.ctx.currentTime : 0;
    }

    // --- 악기 재생 ---

    playClick(time, accent = false) {
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const hp = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        const conf = CONFIG.audio.click;
        const freq = accent ? conf.accentFreq : conf.normalFreq;
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);

        hp.type = 'highpass';
        hp.frequency.setValueAtTime(1200, time);

        // Config에서 볼륨값 가져오기
        const vol = accent ? conf.accentVol : conf.normalVol;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + conf.duration);

        osc.connect(hp).connect(gain).connect(this.masterGain);
        
        osc.start(time);
        osc.stop(time + conf.duration + 0.05);
    }

    playSnare(time, accent = false) {
        if (!this.ctx) return;

        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;

        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(CONFIG.audio.snare.highPass, time);

        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(CONFIG.audio.snare.bandPass, time);
        bp.Q.setValueAtTime(0.8, time);

        const gain = this.ctx.createGain();
        
        // [핵심] Config에 설정된 볼륨값 사용
        const vol = accent ? CONFIG.audio.snare.accentVolume : CONFIG.audio.snare.ghostVolume;
        
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + CONFIG.audio.snare.duration);

        source.connect(hp).connect(bp).connect(gain);
        gain.connect(this.masterGain);
        gain.connect(this.reverbNode); 

        source.start(time);
        source.stop(time + CONFIG.audio.snare.duration + 0.1);
    }

    playKick(time) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
        osc.connect(gain).connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.16);
    }

    playHiHat(time) {
        if (!this.ctx) return;
        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 8000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
        source.connect(hp).connect(gain);
        gain.connect(this.masterGain);
        source.start(time);
        source.stop(time + 0.08);
    }

    _createNoiseBuffer() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 2.0;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuffer = buffer;
    }

    _createReverbIR(seconds, decay) {
        if (!this.ctx) return null;
        const length = this.ctx.sampleRate * seconds;
        const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = impulse.getChannelData(ch);
            for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
        return impulse;
    }
}

const audio = new AudioManager();