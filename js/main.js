/**
 * Nick Drum Challenge V3 - Main Controller
 * (Updated: Mic Input Logic with 100ms/300ms Judgment)
 */
const Main = {
    state: {
        currentGameId: null, isPlaying: false, timerId: null,
        bpm: 80, targetBpm: 200, nextNoteTime: 0.0, isIntro: true, stepIndex: 0,
        images: [], soundPattern: [], level: 1,
        
        // 판정 시스템용 대기열
        noteQueue: [] 
    },
    
    module: null,

    init() {
        if (typeof UI !== 'undefined') UI.init();
        this._setupHotkeys();
        console.log("Main Manager Initialized 🚀");
    },

    _setupHotkeys() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || document.getElementById('game-view').classList.contains('hidden')) return;
            const key = e.key.toLowerCase();
            
            if (key === ' ' || e.code === 'Space') { e.preventDefault(); this.togglePlay(); return; }
            
            if (this.module && this.module.handleKey) {
                this.module.handleKey(key);
            }

            if (this.state.currentGameId !== 'beat4816' && this.state.currentGameId !== 'rhythmear') {
                if (e.key === 'ArrowUp') { e.preventDefault(); this.state.currentGameId==='sightreading'?this.updateLevel(1):this.updateTargetBpm(5); }
                if (e.key === 'ArrowDown') { e.preventDefault(); this.state.currentGameId==='sightreading'?this.updateLevel(-1):this.updateTargetBpm(-5); }
                if (e.key === 'ArrowRight') { e.preventDefault(); this.updateBpm(5); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); this.updateBpm(-5); }
            }
        });
    },

    updateBpm(val) {
        const el = document.getElementById('bpmInput');
        if (el) {
            let current = parseInt(el.value);
            let next = (Math.abs(val) <= 50) ? current + val : val;
            next = Math.max(30, Math.min(240, next));
            el.value = next; 
            this.state.bpm = next;
        }
    },
    updateTargetBpm(val) {
        const el = document.getElementById('targetInput');
        if (el) {
            let current = parseInt(el.value);
            let next = (Math.abs(val) <= 50) ? current + val : val;
            next = Math.max(40, Math.min(300, next));
            el.value = next; 
            this.state.targetBpm = next;
        }
    },
    updateLevel(val) {
        const el = document.getElementById('levelInput');
        if(el) {
            const v = Math.max(1, Math.min(15, this.state.level + val));
            el.value = v; this.state.level = v; 
            if(this.module.setMode) this.module.setMode(this.module.isChallenge ? 'challenge' : 'study'); 
            if(this.module._renderGrid) this.module._renderGrid();
        }
    },

    loadGame(gameId) {
        this.state.currentGameId = gameId;
        const config = CONFIG.games[gameId];
        const container = document.getElementById('game-container');
        
        const map = {
            'speedup': SpeedUpExercise,
            'accents': AccentsExercise,
            'tuplets': TupletsExercise,
            'sightreading': SightReadingExercise,
            'beat4816': BeatExercise,
            'rhythmear': RhythmEarExercise
        };

        this.module = map[gameId];
        if (this.module) {
            this.state.bpm = config.bpmRange ? config.bpmRange.default : config.defaultBpm;
            this.state.targetBpm = config.targetRange ? config.targetRange.default : 0;
            this.state.level = 1;
            this.module.init(container);
        } else {
            container.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><h3>${config.title}</h3><p>Coming Soon</p></div>`;
        }
    },

    togglePlay() { this.state.isPlaying ? this.stopGame() : this.startGame(); },

    startGame() {
        audio.init(); audio.resume();
        this.state.isPlaying = true;
        
        // 큐 초기화
        this.state.noteQueue = [];
        
        const btnStart = document.getElementById('btnStart');
        if(btnStart) {
            btnStart.innerText = "Stop";
            btnStart.classList.replace('primary', 'warn');
        }
        
        const bpmEl = document.getElementById('bpmInput');
        if(bpmEl) this.state.bpm = parseInt(bpmEl.value);

        this.state.isIntro = true; 
        this.state.stepIndex = 0;
        this.state.nextNoteTime = audio.currentTime + 0.1;
        this.state.timerId = setInterval(() => this._scheduler(), 25);
    },

    stopGame() {
        this.state.isPlaying = false;
        if (this.state.timerId) { clearInterval(this.state.timerId); this.state.timerId = null; }
        
        // 큐 비우기
        this.state.noteQueue = [];

        const btnStart = document.getElementById('btnStart');
        if(btnStart) { 
            btnStart.innerText = "Start"; 
            btnStart.classList.replace('warn', 'primary'); 
        }
        
        this.state.images.forEach(i => i.classList.remove('playing'));
        this._showOverlay("");
    },

    _showOverlay(txt) {
        const el = document.getElementById('count-overlay'); if(!el) return;
        if(txt===""){ el.style.opacity=0; return; }
        el.innerText=txt; el.style.opacity=1;
        el.classList.remove('count-ani'); void el.offsetWidth; el.classList.add('count-ani');
    },

    showOverlay(txt) {
        this._showOverlay(txt);
    },

    _scheduler() {
        const ahead = 0.1;
        while (this.state.timerId && this.state.nextNoteTime < audio.currentTime + ahead) {
            this._playStep(this.state.nextNoteTime);
            
            const duration = this.module.getStepDuration ? 
                             this.module.getStepDuration(this.state.bpm) : 
                             (60.0 / this.state.bpm);
            
            this.state.nextNoteTime += duration;
        }
    },

    _playStep(time) {
        // [판정 로직] 노트 발생 시 큐에 등록
        if (!this.state.isIntro && this.state.isPlaying) {
            const currentImg = this.state.images[this.state.stepIndex];
            if (currentImg) {
                this.state.noteQueue.push({
                    targetTime: time,
                    element: currentImg,
                    processed: false
                });
                
                // 메모리 관리: 2초 지난 노트 제거
                const now = audio.currentTime;
                this.state.noteQueue = this.state.noteQueue.filter(n => n.targetTime > now - 2.0);
            }
        }

        const isRhythmEar = (this.state.currentGameId === 'rhythmear');

        if (this.state.isIntro && !isRhythmEar) {
            const is16th = this.state.currentGameId === 'beat4816';
            const introLen = is16th ? 16 : 4;
            const clickInterval = is16th ? 4 : 1; 
            
            if (this.state.stepIndex % clickInterval === 0) {
                audio.playClick(time, true);
                const cnt = 4 - Math.floor(this.state.stepIndex / clickInterval);
                setTimeout(() => { if(this.state.isPlaying) this._showOverlay(cnt); }, (time-audio.currentTime)*1000);
            }
            
            if (++this.state.stepIndex >= introLen) { 
                this.state.isIntro = false; this.state.stepIndex = 0; 
            }
            return;
        }

        if (this.state.stepIndex === 0 && !isRhythmEar) {
            const beatDur = 60.0 / this.state.bpm;
            setTimeout(() => { 
                if(this.state.isPlaying){ 
                    this._showOverlay("Go!"); 
                    setTimeout(() => this._showOverlay(""), beatDur * 1000); 
                }
            }, (time - audio.currentTime)*1000);
        }

        if (this.module.playNote) {
            const nextIdx = this.module.playNote(time, this.state.stepIndex);
            if (nextIdx !== undefined) this.state.stepIndex = nextIdx;
            else this._defaultPlayNote(time);
        } else {
            this._defaultPlayNote(time);
        }
    },

    _defaultPlayNote(time) {
        const idx = this.state.stepIndex;
        const total = this.state.images.length;
        const beatDur = 60.0 / this.state.bpm;

        audio.playClick(time, idx % 4 === 0);

        const img = this.state.images[idx];
        if (img) setTimeout(() => { if (this.state.isPlaying) { this.state.images.forEach(x => x.classList.remove('playing')); img.classList.add('playing'); } }, (time - audio.currentTime)*1000);

        const pat = this.state.soundPattern[idx];
        if (typeof pat === 'number') { 
            if (pat > 0) for(let i=0; i<pat; i++) audio.playSnare(time + i*(beatDur/pat));
        } else if (typeof pat === 'string') { 
            for (let i = 0; i < 4; i++) {
                const ch = pat[i];
                if (ch === 'O') audio.playSnare(time + i * (beatDur/4), true);
                else if (ch === 'o') audio.playSnare(time + i * (beatDur/4), false);
            }
        }

        if (++this.state.stepIndex >= total) {
            if (this.state.currentGameId === 'sightreading' || this.state.bpm >= this.state.targetBpm) {
                if (this.state.timerId) { clearInterval(this.state.timerId); this.state.timerId = null; }
                setTimeout(() => this.stopGame(), 1000);
            } else {
                const inc = 10;
                this.updateBpm(this.state.bpm + inc); 
                this.state.isIntro = true; this.state.stepIndex = 0;
            }
        }
    },

    // [마이크 모듈에서 호출]
    onDrumHit(hitTime) {
        if (!this.state.isPlaying || this.state.noteQueue.length === 0) return;

        let closestNote = null;
        let minDiff = Infinity;
        
        // 판정 범위: ±0.3초 (300ms) - 요청하신 넉넉한 기준
        const HIT_WINDOW = 0.3; 

        for (let note of this.state.noteQueue) {
            if (note.processed) continue; 
            
            const diff = hitTime - note.targetTime; 
            const absDiff = Math.abs(diff);
            
            if (absDiff < HIT_WINDOW && absDiff < minDiff) {
                minDiff = absDiff;
                closestNote = note;
                closestNote.diffRaw = diff;
            }
        }

        if (closestNote) {
            closestNote.processed = true;
            this._showHitFeedback(closestNote.element, closestNote.diffRaw * 1000);
        }
    },

    _showHitFeedback(element, diffMs) {
        if (!element) return;
        
        let text = "";
        let styleClass = "";
        const absMs = Math.abs(diffMs);

        // 1. Good: ±100ms 이내 (넉넉함)
        if (absMs <= 100) {
            text = "Good!";
            styleClass = "judge-perfect";
        } 
        // 2. Early / Late: 100ms ~ 300ms
        else if (absMs <= 300) {
            text = diffMs < 0 ? "Early" : "Late";
            styleClass = diffMs < 0 ? "judge-early" : "judge-late";
        }
        // 3. 그 외 (사실상 HIT_WINDOW 밖이라 실행 안 됨)
        else {
            text = "Miss";
            styleClass = "judge-bad";
        }

        const feedbackEl = document.createElement("div");
        feedbackEl.className = `hit-feedback ${styleClass}`;
        feedbackEl.innerText = text;

        if (element.parentNode) {
            element.parentNode.appendChild(feedbackEl);
            setTimeout(() => feedbackEl.remove(), 600);
        }
    },

    renderGrid(layout, prefix, sizeClass="") {
        const grid = document.getElementById('patternGrid'); 
        if(!grid) return;
        grid.innerHTML = '';
        layout.forEach(row => {
            const dRow = document.createElement('div'); dRow.className = 'bar';
            row.measures.forEach(m => {
                const dMeasure = document.createElement('div'); dMeasure.className = 'measure';
                m.forEach(n => {
                    const img = document.createElement('img');
                    img.src = `${CONFIG.paths.images}${prefix}${n}.png`;
                    img.className = `slot-img ${sizeClass}`;
                    dMeasure.appendChild(img);
                });
                dRow.appendChild(dMeasure);
            });
            grid.appendChild(dRow);
        });
        this.state.images = Array.from(document.querySelectorAll('.slot-img'));
    }
};

window.addEventListener('DOMContentLoaded', () => { Main.init(); });
