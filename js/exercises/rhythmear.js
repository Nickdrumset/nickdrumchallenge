/**
 * Nick Drum Challenge V3 - Rhythm Ear Training Module
 * (최종 수정: 모바일 세로 스크롤/여백 확보 & 모바일 가로 비율 1/3 축소 최적화)
 */

const RHYTHM_ASSETS = {
    TILE_PREFIX: 'Ear_',
    CONGRATS_PREFIX: 'congrat_', 
    CONGRATS_IMG_COUNT: 15,
    CONGRATS_SFX_COUNT: 3
};

const RhythmEarExercise = {
    state: {
        difficulty: 'beginner',
        maxTile: 5,
        paletteSel: 0,
        seq: [],
        answerSeq: [],
        autoFillPtr: 0
    },

    PATTERNS: {
        0:'xxxx', 1:'oxxx', 2:'oxox', 3:'oooo',
        4:'ooox', 5:'oxoo', 6:'xxox', 7:'xxoo',
        8:'ooxo', 9:'oxxo', 10:'ooxx', 11:'xooo',
        12:'xoox', 13:'xxxo', 14:'xoxo', 15:'xoxx'
    },

    init(container) {
        this._injectStyles();
        this.render(container);
        this.setDifficulty('beginner');
        this._resetBpmTo60();
        window.addEventListener('resize', () => this.renderPalette());
    },

    _resetBpmTo60() {
        Main.state.bpm = 60;
        const el = document.getElementById('bpmInput');
        if (el) el.value = 60;
    },

    _injectStyles() {
        if (document.getElementById('rhythm-ear-styles')) return;
        const css = `
            /* === 기본 공통 스타일 === */
            .re-container { display: flex; flex-direction: column; gap: 20px; width: 100%; align-items: center; }
            .re-panel { display: flex; flex-direction: column; gap: 12px; width: 100%; align-items: center; background: rgba(255,255,255,0.5); padding: 16px; border-radius: 16px; border: 1px solid var(--border); }
            .re-game-area { display: flex; flex-direction: column; gap: 20px; width: 100%; align-items: center; }
            
            .re-seg { display: flex; gap: 6px; padding: 6px; border-radius: 12px; background: rgba(245,248,250,0.85); border: 1px solid var(--border); width: 100%; justify-content: center; }
            .re-seg button { padding: 10px; border-radius: 8px; cursor: pointer; flex: 1; background: transparent; border: 1px solid transparent; color: var(--text); font-size: 14px; font-weight: 600; display: flex; justify-content: center; align-items: center; gap: 4px; }
            .re-seg button span { font-size: 11px; opacity: 0.6; font-family: monospace; }
            .re-seg button.active { background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); color: var(--accent); border-color: var(--accent); }

            .re-ctrl-grp { display: flex; align-items: center; gap: 8px; background: #fff; padding: 6px 12px; border-radius: 12px; border: 1px solid var(--border); }
            .re-label { font-size: 13px; font-weight: 700; color: var(--sub-text); }
            .re-select { padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border); text-align: center; width: 60px; font-weight:bold; }
            
            .re-btn { padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: 700; background: #fff; border: 1px solid var(--border); transition: all 0.2s; }
            .re-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .re-btn.primary { background: #f0fbff; color: var(--accent); border-color: var(--accent); }
            .re-btn.check { background: var(--ok); color: white; border-color: var(--ok); width: 100%; }

            #re-systems { width: 100%; }
            .re-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 20px; border-radius: 16px; background: rgba(255,255,255,0.7); border: 1px solid var(--border); box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
            .re-cell { aspect-ratio: 621 / 726; width: 100%; border-radius: 10px; background: rgba(255,255,255,0.9); border: 1px solid var(--border); cursor: pointer; overflow: hidden; position: relative; transition: all 0.1s; }
            .re-cell.empty { opacity: 0.6; background: rgba(0,0,0,0.03); border: 2px dashed var(--border); }
            .re-cell img { width: 100%; height: 100%; object-fit: contain; }
            .re-cell.playing { outline: 3px solid var(--accent); box-shadow: 0 0 15px var(--accent); z-index: 10; }
            .re-cell.correct { box-shadow: inset 0 0 0 4px var(--ok); border-color: var(--ok); }
            .re-cell.wrong { box-shadow: inset 0 0 0 4px var(--warn); border-color: var(--warn); }

            #re-palette { display: grid; gap: 10px; width: 100%; grid-template-columns: repeat(6, 1fr); }
            .re-swatch { border-radius: 12px; padding: 6px; cursor: pointer; background: rgba(255,255,255,0.6); border: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; transition: all 0.15s; }
            .re-swatch:hover { transform: scale(1.05); background: #fff; }
            .re-swatch.active { border: 2px solid var(--accent); background: #fff; transform: scale(1.05); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .re-swatch img { width: 100%; aspect-ratio: 621/726; object-fit: contain; }
            .re-swatch-num { font-size: 11px; color: var(--sub-text); margin-top: 4px; font-weight: bold; }

            #re-overlay { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; z-index: 9999; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); }
            #re-overlay.show { display: flex; animation: pop 0.4s cubic-bezier(.2,.7,.2,1); }
            #re-overlay img { width: min(80vw, 500px); border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }

            /* ==========================================
               [데스크탑/태블릿 가로 모드] (기존 완벽한 세팅 유지)
               - 너비 900px 이상일 때만 적용
               ========================================== */
            @media (min-width: 900px) {
                .re-container { flex-direction: row; align-items: stretch; height: 100%; }
                .re-panel { flex: 1; max-width: 300px; justify-content: center; height: auto; margin: auto 0; }
                .re-seg { flex-direction: column; }
                .re-seg button { justify-content: space-between; padding: 12px 16px; }
                .re-game-area { flex: 2.5; justify-content: center; height: 100%; padding: 20px; background: rgba(255,255,255,0.3); border-radius: 20px; }
                #re-systems, #re-palette { max-width: 900px; }
                #re-palette { grid-template-columns: repeat(8, 1fr); }
            }

            /* ==========================================
               [모바일 세로 모드 최적화] (너비 < 900px & 세로)
               - 상단 여백 확보 (주소창 가림 방지)
               - 스크롤 활성화
               ========================================== */
            @media (max-width: 899px) and (orientation: portrait) {
                /* 전역 스크롤 락 해제 및 상단 패딩 추가 */
                .game-layout-wrapper {
                    display: block !important; /* flex 센터링 해제 */
                    height: auto !important;
                    min-height: 100vh;
                    padding-top: 80px !important; /* 상단 여백 대폭 추가 */
                    padding-bottom: 40px;
                    overflow-y: auto !important; /* 스크롤 허용 */
                    -webkit-overflow-scrolling: touch;
                }
                .re-container { height: auto !important; }
                .re-seg button span { display: none; }
                #re-palette { grid-template-columns: repeat(5, 1fr); }
            }

            /* ==========================================
               [모바일 가로 모드 최적화] (폰을 옆으로 눕혔을 때)
               - 높이가 낮을 때 (600px 이하)
               - 타일 크기를 1/3 수준으로 강제 축소
               ========================================== */
            @media (max-height: 600px) and (orientation: landscape) {
                .game-layout-wrapper {
                    height: 100vh !important;
                    padding: 5px !important;
                    align-items: center !important;
                    overflow: hidden !important; /* 가로모드는 한 화면에 담기 */
                }
                .re-container {
                    flex-direction: row !important; /* 좌우 배치 강제 */
                    height: 100% !important;
                    gap: 10px !important;
                    align-items: center !important;
                }
                
                /* 좌측 패널 축소 */
                .re-panel {
                    width: 200px !important;
                    min-width: 200px;
                    padding: 8px !important;
                    gap: 6px !important;
                    overflow-y: auto; /* 패널 내부만 스크롤 */
                    max-height: 95vh;
                }
                .re-seg { flex-direction: column !important; } /* 버튼 세로 배열 */
                .re-seg button { padding: 6px !important; font-size: 12px !important; }
                .re-seg button span { display: none; }
                .re-btn { padding: 6px 10px !important; font-size: 12px !important; }
                .re-ctrl-grp { padding: 4px !important; }
                .re-select { padding: 2px !important; height: 24px !important; }

                /* 우측 게임 영역 (비율 축소 핵심) */
                .re-game-area {
                    padding: 5px !important;
                    justify-content: center !important;
                    height: 100% !important;
                    gap: 8px !important;
                }
                
                /* [핵심] 타일 박스 너비 강제 축소 -> 높이 비율 자동 축소 */
                #re-systems {
                    width: 55% !important; /* 너비를 줄여서 높이도 줄임 */
                    margin: 0 auto !important;
                }
                .re-bar { padding: 8px !important; gap: 6px !important; }
                
                #re-palette {
                    width: 75% !important; /* 팔레트도 축소 */
                    gap: 6px !important;
                    grid-template-columns: repeat(8, 1fr) !important; /* 한 줄에 많이 */
                }
                .re-swatch { padding: 2px !important; }
            }
        `;
        const style = document.createElement('style');
        style.id = 'rhythm-ear-styles';
        style.textContent = css;
        document.head.appendChild(style);
    },

    render(container) {
        container.innerHTML = `
            <div class="game-layout-wrapper" style="max-width: 98vw; height: 100%;">
                <div id="count-overlay"></div>
                <div id="re-overlay"><img id="re-congrats-img"></div>
                
                <div class="re-container">
                    <aside class="re-panel">
                        <div class="re-seg">
                            <button id="btn-beg" onclick="RhythmEarExercise.setDifficulty('beginner')">Beginner <span>(Q)</span></button>
                            <button id="btn-int" onclick="RhythmEarExercise.setDifficulty('intermediate')">Intermediate <span>(W)</span></button>
                            <button id="btn-adv" onclick="RhythmEarExercise.setDifficulty('advanced')">Advanced <span>(E)</span></button>
                        </div>
                        
                        <div class="re-ctrl-grp">
                            <span class="re-label">BPM</span>
                            <button class="re-btn" onclick="Main.updateBpm(Main.state.bpm-5)">-5</button>
                            <input id="bpmInput" type="number" class="re-select" value="${Main.state.bpm}" readonly>
                            <button class="re-btn" onclick="Main.updateBpm(Main.state.bpm+5)">+5</button>
                        </div>
                        
                        <div style="display:flex; gap:10px; width:100%;">
                            <button class="re-btn" style="flex:1;" onclick="RhythmEarExercise.newQuestion()">New (Esc)</button>
                            <button id="btnStart" class="re-btn primary" style="flex:1;" onclick="Main.togglePlay()">Play (Space)</button>
                        </div>
                        
                        <div style="display:flex; gap:10px; width:100%;">
                            <button class="re-btn" style="flex:1;" onclick="RhythmEarExercise.clearSeq()">Clear</button>
                        </div>
                        
                        <button class="re-btn check" onclick="RhythmEarExercise.checkAnswer()">Check Answer (Enter)</button>
                    </aside>

                    <main class="re-game-area">
                        <div id="re-systems"></div>
                        <div id="re-palette"></div>
                    </main>
                </div>
            </div>
        `;
    },

    setDifficulty(diff) {
        if (Main.state.isPlaying) Main.stopGame();
        this.state.difficulty = diff;
        this.state.maxTile = diff === 'beginner' ? 5 : (diff === 'intermediate' ? 10 : 15);
        ['beg', 'int', 'adv'].forEach(k => {
            document.getElementById(`btn-${k}`).classList.toggle('active', k.startsWith(diff.substr(0,3)));
        });
        this.renderPalette();
        this.newQuestion();
    },

    clearSeq() { this.state.seq.fill(-1); this.state.autoFillPtr = 0; this.renderSeq(); },

    newQuestion() {
        const total = 4; 
        this.state.answerSeq = new Array(total);
        for(let i=0; i<total; i++) this.state.answerSeq[i] = Math.floor(Math.random() * (this.state.maxTile + 1));
        Main.state.soundPattern = this.state.answerSeq.map(id => this.PATTERNS[id]);
        this.state.seq = new Array(total).fill(-1);
        this.state.autoFillPtr = 0;
        this.renderSystems();
        this.renderSeq();
    },

    renderSystems() {
        const container = document.getElementById('re-systems');
        container.innerHTML = '';
        Main.state.images = [];
        const bar = document.createElement('div');
        bar.className = 're-bar';
        for(let i=0; i<4; i++) {
            const cell = document.createElement('div');
            cell.className = 're-cell empty';
            cell.onclick = () => this.slotInsert(i);
            bar.appendChild(cell);
            Main.state.images.push(cell);
        }
        container.appendChild(bar);
    },

    renderSeq() {
        Main.state.images.forEach((cell, i) => {
            const v = this.state.seq[i];
            cell.innerHTML = '';
            cell.classList.remove('correct', 'wrong');
            if (v === -1 || v === undefined) {
                cell.className = 're-cell empty';
            } else {
                cell.className = 're-cell';
                const img = document.createElement('img');
                img.src = `${CONFIG.paths.images}${RHYTHM_ASSETS.TILE_PREFIX}${v}.png`;
                cell.appendChild(img);
            }
        });
        if (this.state.seq.every(v => v !== -1)) {
            let correct = true;
            for(let i=0; i<4; i++) if (this.state.seq[i] !== this.state.answerSeq[i]) { correct = false; break; }
            if (correct) this.checkAnswer(true);
        }
    },

    renderPalette() {
        const palContainer = document.getElementById('re-palette');
        if (!palContainer) return;
        palContainer.innerHTML = '';
        const max = this.state.maxTile;
        for (let i = 0; i <= max; i++) {
            const sw = document.createElement('div');
            sw.className = 're-swatch';
            if (i === this.state.paletteSel) sw.classList.add('active');
            sw.innerHTML = `<img src="${CONFIG.paths.images}${RHYTHM_ASSETS.TILE_PREFIX}${i}.png"><div class="re-swatch-num">#${i}</div>`;
            sw.onclick = () => { this._selectPalette(i); this.insertFromPalette(); };
            palContainer.appendChild(sw);
        }
    },

    _selectPalette(idx) {
        this.state.paletteSel = idx;
        document.querySelectorAll('.re-swatch').forEach((el, i) => el.classList.toggle('active', i === idx));
    },

    slotInsert(idx) {
        let target = -1;
        for(let i=0; i<4; i++) if (this.state.seq[i] === -1) { target = i; break; }
        if (target === -1) target = idx;
        this.state.seq[target] = this.state.paletteSel;
        this.state.autoFillPtr = Math.min(4, target + 1);
        this.renderSeq();
        const cell = Main.state.images[target];
        if(cell) { cell.classList.add('playing'); setTimeout(()=>cell.classList.remove('playing'), 120); }
    },

    insertFromPalette() {
        let idx = this.state.seq.indexOf(-1);
        if (idx === -1) return; 
        this.state.seq[idx] = this.state.paletteSel;
        this.state.autoFillPtr = idx + 1;
        this.renderSeq();
        const cell = Main.state.images[idx];
        if(cell) { cell.classList.add('playing'); setTimeout(()=>cell.classList.remove('playing'), 120); }
    },

    deleteLast() {
        let idx = -1;
        for (let i = 3; i >= 0; i--) if (this.state.seq[i] !== -1) { idx = i; break; }
        if (idx >= 0) { this.state.seq[idx] = -1; this.state.autoFillPtr = idx; this.renderSeq(); }
    },

    playNote(time, stepIndex) {
        const idx = stepIndex;
        if (idx >= 4) { Main.stopGame(); return 0; }
        const cell = Main.state.images[idx];
        if (cell) setTimeout(() => { if(Main.state.isPlaying) { cell.classList.add('playing'); setTimeout(() => cell.classList.remove('playing'), 90); } }, (time - audio.currentTime) * 1000);
        const beatDur = 60.0 / Main.state.bpm;
        audio.playClick(time, idx === 0);
        const patStr = this.PATTERNS[this.state.answerSeq[idx]] || 'xxxx';
        for (let i = 0; i < 4; i++) if (patStr[i] === 'o') audio.playSnare(time + i * (beatDur/4), false);
        return idx + 1;
    },

    checkAnswer(silentSuccess = false) {
        if (Main.state.isPlaying) Main.stopGame();
        let correctCount = 0;
        const cells = Main.state.images;
        for(let i=0; i<4; i++) {
            const isCorrect = (this.state.seq[i] === this.state.answerSeq[i]);
            if(isCorrect) correctCount++;
            cells[i].classList.remove('correct', 'wrong');
            void cells[i].offsetWidth;
            cells[i].classList.add(isCorrect ? 'correct' : 'wrong');
        }
        setTimeout(() => cells.forEach(c => c.classList.remove('correct', 'wrong')), 1000);
        if (correctCount === 4) this.showCongrats();
        else if (!silentSuccess) alert(`Try Again! (${correctCount}/4)`);
    },

    showCongrats() {
        const overlay = document.getElementById('re-overlay');
        const img = document.getElementById('re-congrats-img');
        const imgId = Math.floor(Math.random() * RHYTHM_ASSETS.CONGRATS_IMG_COUNT) + 1;
        img.src = `${CONFIG.paths.images}${RHYTHM_ASSETS.CONGRATS_PREFIX}${imgId}.png`;
        overlay.classList.add('show');
        const sfxId = Math.floor(Math.random() * RHYTHM_ASSETS.CONGRATS_SFX_COUNT) + 1;
        const congratsAudio = new Audio(`${CONFIG.paths.sounds}congrat_${sfxId}.mp3`);
        congratsAudio.play().catch(e => console.log(e));
        const close = () => {
            overlay.classList.remove('show');
            overlay.removeEventListener('click', close);
            congratsAudio.pause();
            this.newQuestion();
        };
        overlay.addEventListener('click', close);
    },

    handleKey(key) {
        if(key === 'q') this.setDifficulty('beginner');
        if(key === 'w') this.setDifficulty('intermediate');
        if(key === 'e') this.setDifficulty('advanced');
        if(key === 'r' || key === 'escape') this.newQuestion();
        if(key === 'backspace') this.deleteLast();
        if(key === 'enter') this.insertFromPalette();
        if(key === 'arrowleft') this._selectPalette(Math.max(0, this.state.paletteSel - 1));
        if(key === 'arrowright') this._selectPalette(Math.min(this.state.maxTile, this.state.paletteSel + 1));
        const cols = (window.innerWidth >= 900) ? 8 : 5;
        if(key === 'arrowup') this._selectPalette(Math.max(0, this.state.paletteSel - cols));
        if(key === 'arrowdown') this._selectPalette(Math.min(this.state.maxTile, this.state.paletteSel + cols));
    },

    getStepDuration(bpm) { return 60.0 / bpm; }
};