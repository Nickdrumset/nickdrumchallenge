/**
 * Nick Drum Challenge V2 - Main Controller
 * (수정: Go! 오버레이 중앙 관리, 단축키 및 재생 로직 통합)
 */
const Main = {
    state: {
        currentGameId: null, isPlaying: false, timerId: null,
        bpm: 80, targetBpm: 200, nextNoteTime: 0.0, isIntro: true, stepIndex: 0,
        images: [], soundPattern: [], level: 1
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
            
            // 모듈별 단축키 위임
            if (this.module && this.module.handleKey) {
                this.module.handleKey(key);
            }

            // 공통 BPM 조절 (Beat Exercise 제외 - 자체 키 사용)
            if (this.state.currentGameId !== 'beat4816') {
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
            // val이 증감값이 아니라 절대값으로 들어올 때 대응
            let current = parseInt(el.value);
            // 만약 val이 10, -10 처럼 작은 수면 증감으로 처리, 아니면 설정으로 처리
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
            // SightReading의 경우 _renderGrid 등을 호출해야 함 (모듈에 위임)
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
            container.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><h3>${config.title}</h3><p>준비 중</p></div>`;
        }
    },

    togglePlay() { this.state.isPlaying ? this.stopGame() : this.startGame(); },

    startGame() {
        audio.init(); audio.resume();
        this.state.isPlaying = true;
        document.getElementById('btnStart').innerText = "Stop";
        document.getElementById('btnStart').classList.replace('primary', 'warn');
        
        this.state.bpm = parseInt(document.getElementById('bpmInput').value);
        this.state.isIntro = true; this.state.stepIndex = 0;
        this.state.nextNoteTime = audio.currentTime + 0.1;
        this.state.timerId = setInterval(() => this._scheduler(), 25);
    },

    stopGame() {
        this.state.isPlaying = false;
        if (this.state.timerId) { clearInterval(this.state.timerId); this.state.timerId = null; }
        const btn = document.getElementById('btnStart');
        if(btn) { btn.innerText = "Start"; btn.classList.replace('warn', 'primary'); }
        
        this.state.images.forEach(i => i.classList.remove('playing'));
        this._showOverlay("");
    },

    _showOverlay(txt) {
        const el = document.getElementById('count-overlay'); if(!el) return;
        if(txt===""){ el.style.opacity=0; return; }
        el.innerText=txt; el.style.opacity=1;
        el.classList.remove('count-ani'); void el.offsetWidth; el.classList.add('count-ani');
    },

    _scheduler() {
        const ahead = 0.1;
        while (this.state.timerId && this.state.nextNoteTime < audio.currentTime + ahead) {
            this._playStep(this.state.nextNoteTime);
            this.state.nextNoteTime += this.module.getStepDuration(this.state.bpm);
        }
    },

    _playStep(time) {
        // 1. Intro Logic (공통)
        if (this.state.isIntro) {
            const is16th = this.state.currentGameId === 'beat4816';
            const introLen = is16th ? 16 : 4;
            const clickInterval = is16th ? 4 : 1; // 16비트면 4틱마다, 아니면 1틱마다 클릭
            
            if (this.state.stepIndex % clickInterval === 0) {
                audio.playClick(time, true);
                // 카운트다운 (4 -> 3 -> 2 -> 1)
                const cnt = 4 - Math.floor(this.state.stepIndex / clickInterval);
                setTimeout(() => { if(this.state.isPlaying) this._showOverlay(cnt); }, (time-audio.currentTime)*1000);
            }
            
            if (++this.state.stepIndex >= introLen) { 
                this.state.isIntro = false; this.state.stepIndex = 0; 
            }
            return;
        }

        // 2. [핵심 수정] Go! 표시 로직 (중앙 관리)
        // 첫 박자(stepIndex 0)일 때 무조건 실행
        if (this.state.stepIndex === 0) {
            const beatDur = 60.0 / this.state.bpm; // 1박자 시간
            setTimeout(() => { 
                if(this.state.isPlaying){ 
                    this._showOverlay("Go!"); 
                    // 다음 박자에 맞춰서 사라지게 함 (오디오 싱크)
                    setTimeout(() => this._showOverlay(""), beatDur * 1000); 
                }
            }, (time - audio.currentTime)*1000);
        }

        // 3. 모듈별 재생
        if (this.module.playNote) {
            const nextIdx = this.module.playNote(time, this.state.stepIndex);
            // 모듈이 다음 인덱스를 반환하면 업데이트
            if (nextIdx !== undefined) this.state.stepIndex = nextIdx;
            else this._defaultPlayNote(time);
        } else {
            this._defaultPlayNote(time);
        }
    },

    // Speed Up, Accents 등 일반 게임용 재생
    _defaultPlayNote(time) {
        const idx = this.state.stepIndex;
        const total = this.state.images.length;
        const beatDur = 60.0 / this.state.bpm;

        audio.playClick(time, idx % 4 === 0);

        const img = this.state.images[idx];
        if (img) setTimeout(() => { if (this.state.isPlaying) { this.state.images.forEach(x => x.classList.remove('playing')); img.classList.add('playing'); } }, (time - audio.currentTime)*1000);

        const pat = this.state.soundPattern[idx];
        if (typeof pat === 'number') { // Tuplets
            if (pat > 0) for(let i=0; i<pat; i++) audio.playSnare(time + i*(beatDur/pat));
        } else if (typeof pat === 'string') { // Pattern string
            for (let i = 0; i < 4; i++) {
                const ch = pat[i];
                if (ch === 'O') audio.playSnare(time + i * (beatDur/4), true);
                else if (ch === 'o') audio.playSnare(time + i * (beatDur/4), false);
            }
        }

        // Cycle End Logic
        if (++this.state.stepIndex >= total) {
            if (this.state.currentGameId === 'sightreading' || this.state.bpm >= this.state.targetBpm) {
                if (this.state.timerId) { clearInterval(this.state.timerId); this.state.timerId = null; }
                setTimeout(() => this.stopGame(), 1000);
            } else {
                const inc = 10;
                this.updateBpm(this.state.bpm + inc); // 값만 업데이트 (input 반영)
                this.state.isIntro = true; this.state.stepIndex = 0;
            }
        }
    },

    // 그리드 그리기 헬퍼
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