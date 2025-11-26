/**
 * Nick Drum Challenge V3 - Microphone Input Module
 * (Updated: Real Drum Sounds for Test & Early Bias Fix)
 */
const MicInput = {
    ctx: null,
    analyser: null,
    microphone: null,
    filter: null, 
    dataArray: null,
    stream: null,
    
    isReady: false,
    isListening: false,
    
    // [보정 상태 변수]
    calibState: 'idle', 
    calibStartTime: 0,
    maxNoiseLevel: 0,
    signalDetectTime: 0,
    
    // [설정값]
    threshold: 0.05,      
    latency: 40,          
    releaseTime: 0.05,    
    filterFreq: 3000,     
    lastHitTime: 0,       
    
    // [신규] 오토싱크 Early 편향 보정값 (ms)
    // 이 값을 높일수록 판정이 'Late' 쪽으로 밀립니다.
    autoSyncOffset: 20, 

    async init() {
        if (this.isReady) return true;
        this._updateStatusUI("connecting");

        try {
            if (typeof audio !== 'undefined') {
                if(audio.ctx && audio.ctx.state === 'suspended') await audio.ctx.resume();
                if(!audio.isInitialized) audio.init();
                this.ctx = audio.ctx;
            } else {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioContext({ latencyHint: 'interactive' });
            }

            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.value = this.filterFreq;

            await this._setupStream(true);

            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 512; 
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            this._connectMicrophone();

            this.isReady = true;
            this.isListening = true;
            
            this._detectLoop();
            
            this._updateStatusUI("connected");
            console.log(`MicInput: Connected (Offset -${this.autoSyncOffset}ms) 🎤`);
            return true;

        } catch (err) {
            console.error("MicInput Error:", err);
            this._updateStatusUI("error");
            return false;
        }
    },

    async _setupStream(enableEchoCancel) {
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            if (this.microphone) {
                try { this.microphone.disconnect(); } catch(e){}
            }

            this.stream = await navigator.mediaDevices.getUserMedia({ audio: {
                echoCancellation: enableEchoCancel,
                noiseSuppression: false, 
                autoGainControl: false
            }});

            this._connectMicrophone();
        } catch (e) {
            console.error("Stream setup failed:", e);
            throw e; 
        }
    },

    _connectMicrophone() {
        if (!this.stream || !this.ctx || !this.analyser || !this.filter) return;
        try {
            this.microphone = this.ctx.createMediaStreamSource(this.stream);
            this.microphone.connect(this.filter);
            this.filter.connect(this.analyser);
        } catch(e) {
            console.warn("Node connection warning:", e);
        }
    },

    disconnect() {
        this.isListening = false;
        this.isReady = false;
        this.calibState = 'idle';

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        try {
            if (this.microphone) this.microphone.disconnect();
            if (this.filter) this.filter.disconnect();
        } catch(e){}
        
        this.microphone = null;
        this._updateStatusUI("disconnected");
    },

    adjustFilter(delta) {
        let newVal = this.filterFreq + delta;
        newVal = Math.max(500, Math.min(8000, newVal));
        this.filterFreq = newVal;
        
        if(this.filter) {
            this.filter.frequency.value = this.filterFreq;
        }

        const el = document.getElementById('filter-display');
        if (el) el.innerText = `${this.filterFreq}Hz`;
    },

    async autoCalibrate() {
        if (!this.isReady) { alert("Please connect microphone first."); return; }

        const msgEl = document.getElementById('mic-status-msg');
        if(msgEl) {
            msgEl.innerText = "Analyzing environment...";
            msgEl.style.color = "#ff9800";
        }
        
        const originalFilterFreq = this.filterFreq;
        if(this.filter) this.filter.frequency.value = 8000; // 테스트 소리 잘 들리게 필터 개방

        try { await this._setupStream(false); } catch(e) { return; }

        this.maxNoiseLevel = 0;
        this.calibState = 'noise'; 
        
        setTimeout(() => {
            if(this.calibState !== 'noise') return;

            let smartSens = Math.max(0.03, this.maxNoiseLevel * 2.0);
            smartSens = Math.min(0.3, smartSens); 
            
            this.threshold = Number(smartSens.toFixed(2));
            this._updateKnobDisplay('sens-display', this.threshold);
            
            if(msgEl) msgEl.innerText = `Noise checked. Drum sound playing...`;

            this.calibState = 'signal';
            this._playTestTone();

        }, 600);
        
        this.savedFilterFreq = originalFilterFreq;
    },

    // [수정됨] 실제 드럼 사운드 재생 (킥+스네어+하이햇)
    _playTestTone() {
        const now = this.ctx.currentTime;
        this.calibStartTime = now;

        if (typeof audio !== 'undefined') {
            // 강한 어택감을 위해 3개를 동시에 재생
            audio.playKick(now);
            audio.playSnare(now, true); // Accent
            audio.playHiHat(now);
        } else {
            // 비상용 (audio 모듈 없을 때)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(1000, now);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        }

        // 2초 타임아웃
        setTimeout(async () => {
            if (this.calibState === 'signal' || this.calibState === 'decay') {
                this.calibState = 'idle';
                const msgEl = document.getElementById('mic-status-msg');
                if(msgEl) { msgEl.innerText = "Sync Failed (Too quiet?)"; msgEl.style.color = "red"; }
                await this._finishCalibration();
            }
        }, 2000);
    },

    _detectLoop() {
        if (!this.isReady || !this.isListening) return;

        this.analyser.getByteTimeDomainData(this.dataArray);

        let currentVol = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            const v = Math.abs(this.dataArray[i] - 128) / 128;
            if (v > currentVol) currentVol = v;
        }

        const now = this.ctx.currentTime;

        // [A] 보정 모드
        if (this.calibState === 'noise') {
            if (currentVol > this.maxNoiseLevel) this.maxNoiseLevel = currentVol;
        } 
        else if (this.calibState === 'signal') {
            if (currentVol > this.threshold) {
                // 측정된 지연 시간
                const measuredDelay = (now - this.calibStartTime) * 1000;
                
                // [핵심 수정] Early 방지를 위해 오프셋 차감
                // 측정된 값보다 20ms 정도 작게 잡아야 "덜 보정"해서 Early가 안 뜸
                const correctedLatency = measuredDelay - this.autoSyncOffset;
                
                this.latency = Math.round(Math.max(0, correctedLatency));
                this._updateLatencyDisplay();
                
                this.signalDetectTime = now;
                this.calibState = 'decay';
            }
        }
        else if (this.calibState === 'decay') {
            if (currentVol < this.threshold) {
                const duration = now - this.signalDetectTime;
                let smartRel = duration + 0.02;
                smartRel = Math.max(0.04, Math.min(0.3, smartRel));
                this.releaseTime = Number(smartRel.toFixed(2));
                const elRel = document.getElementById('release-display');
                if(elRel) elRel.innerText = `${Math.round(this.releaseTime * 1000)}ms`;
                this._finishCalibration();
            }
        }
        // [B] 게임 모드
        else if (this.calibState === 'idle') {
            if (currentVol > this.threshold && (now - this.lastHitTime > this.releaseTime)) {
                this.lastHitTime = now;
                const adjustedTime = now - (this.latency / 1000);
                if (typeof Main !== 'undefined' && Main.onDrumHit) {
                    Main.onDrumHit(adjustedTime); 
                }
                this._blinkMicIcon(currentVol);
            }
        }

        requestAnimationFrame(() => this._detectLoop());
    },

    async _finishCalibration() {
        this.calibState = 'idle';
        const msgEl = document.getElementById('mic-status-msg');
        if(msgEl) {
            msgEl.innerText = `Auto Set: Sens ${this.threshold} / Sync ${this.latency}ms / Rel ${Math.round(this.releaseTime*1000)}ms`;
            msgEl.style.color = "#279854";
        }
        
        await this._setupStream(true);
        
        if(this.savedFilterFreq) {
            this.filterFreq = this.savedFilterFreq;
            if(this.filter) this.filter.frequency.value = this.filterFreq;
        }
    },

    adjustSensitivity(delta) {
        let newVal = this.threshold + delta;
        newVal = Math.max(0.01, Math.min(0.5, newVal));
        this.threshold = Number(newVal.toFixed(2));
        this._updateKnobDisplay('sens-display', this.threshold);
    },
    adjustLatency(deltaMs) {
        this.latency += deltaMs;
        this._updateLatencyDisplay();
    },
    adjustRelease(deltaMs) {
        let newVal = this.releaseTime + (deltaMs / 1000);
        newVal = Math.max(0.03, Math.min(0.5, newVal));
        this.releaseTime = Number(newVal.toFixed(2));
        const el = document.getElementById('release-display');
        if (el) el.innerText = `${Math.round(this.releaseTime * 1000)}ms`;
    },

    _updateLatencyDisplay() {
        const el = document.getElementById('latency-display');
        if (el) el.innerText = `${this.latency > 0 ? '+' : ''}${this.latency}ms`;
    },
    _updateKnobDisplay(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    },
    _updateStatusUI(status) {
        const msgEl = document.getElementById('mic-status-msg');
        const boxEl = document.getElementById('mic-control-box');
        const btnConnect = document.getElementById('btn-mic-connect');
        const btnDisconnect = document.getElementById('btn-mic-disconnect');
        const btnAuto = document.getElementById('btn-auto-sync');
        
        if (!msgEl || !boxEl) return;

        if (status === 'connected') {
            msgEl.innerText = "🎤 Microphone Connected";
            msgEl.style.color = "#279854";
            boxEl.style.opacity = "1";
            if(btnConnect) btnConnect.style.display = 'none';
            if(btnDisconnect) btnDisconnect.style.display = 'inline-block';
            if(btnAuto) btnAuto.disabled = false;
        } else if (status === 'disconnected') {
            msgEl.innerText = "Connect mic to measure accuracy";
            msgEl.style.color = "var(--sub-text)";
            boxEl.style.opacity = "1"; 
            if(btnConnect) btnConnect.style.display = 'inline-block';
            if(btnDisconnect) btnDisconnect.style.display = 'none';
            if(btnAuto) btnAuto.disabled = true;
        } else if (status === 'error') {
            msgEl.innerText = "Connection Failed";
            msgEl.style.color = "red";
            if(btnConnect) btnConnect.style.display = 'inline-block';
            if(btnDisconnect) btnDisconnect.style.display = 'none';
        } else if (status === 'connecting') {
            msgEl.innerText = "Connecting...";
        }
    },
    _blinkMicIcon(vol) {
        const icon = document.getElementById('mic-icon');
        if (icon) {
            const opacity = Math.min(1, vol * 2); 
            icon.style.opacity = opacity;
            icon.style.background = "#00ff00"; 
            setTimeout(() => {
                icon.style.opacity = 0.2;
                icon.style.background = "var(--warn)";
            }, 100);
        }
    }
};