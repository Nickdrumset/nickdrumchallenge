/**
 * Nick Drum Challenge V2 - Rhythm Ear Training Module
 * (Complete Port of Rhythm Ear Training.html)
 */
const RHYTHM_ASSETS = {
    TILE_PREFIX: 'Ear_',
    CONGRATS_DIR: 'Congrat/', // assets/images/Congrat/
    CONGRATS_IMG_COUNT: 10,  // congrat_1.png ~ 10.png
    CONGRATS_SFX_COUNT: 3    // congrat_1.mp3 ~ 3.mp3
};
const RhythmEarExercise = {
    // 내부 상태 관리
    state: {
        difficulty: 'beginner', // beginner, intermediate, advanced
        maxTile: 5,
        barsCount: 1,
        paletteSel: 0,
        seq: [],        // 사용자 입력 배열
        answerSeq: [],  // 정답 배열 (소리 재생용)
        autoFillPtr: 0, // 자동 입력 커서 위치
        localPlaying: false // 개별 마디 재생 상태
    },

    // 16비트 패턴 매핑 (0~15번 타일)
    PATTERNS: {
        0:'xxxx', 1:'oxxx', 2:'oxox', 3:'oooo',
        4:'ooox', 5:'oxoo', 6:'xxox', 7:'xxoo',
        8:'ooxo', 9:'oxxo', 10:'ooxx', 11:'xooo',
        12:'xoox', 13:'xxxo', 14:'xoxo', 15:'xoxx'
    },

    init(container) {
        this._injectStyles(); // CSS 주입
        this.render(container);
        this.newQuestion();
        
        // 반응형 레이아웃 리스너 등록
        window.addEventListener('resize', () => this._relayoutPalette());
        // 초기 레이아웃 실행
        setTimeout(() => this._relayoutPalette(), 0);
    },

    // 1. CSS 스타일 주입 (기존 CSS 파일 수정 없이 독립적으로 동작하도록 함)
    _injectStyles() {
        if (document.getElementById('rhythm-ear-styles')) return;
        const css = `
            /* Rhythm Ear Training Scoped Styles */
            .re-panel { display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content: center; }
            .re-row { display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content: center; width:100%; }
            
            .re-seg { display:inline-flex; gap:4px; padding:4px; border-radius:12px; background: rgba(245,248,250,.85); border: 1px solid var(--border); }
            .re-seg button { padding:8px 12px; border-radius:10px; cursor:pointer; background: transparent; border: 1px solid transparent; color: var(--text); font-size: 13px; font-weight: 600; }
            .re-seg button.active { background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); color: var(--accent); border-color: var(--accent); }
            
            .re-ctrl-grp { display:flex; align-items:center; gap:8px; background: rgba(245,248,250,.85); padding:6px 12px; border-radius:12px; border: 1px solid var(--border); }
            .re-label { font-size:13px; font-weight: 700; color: var(--sub-text); }
            .re-select { padding:4px 8px; border-radius:8px; border:1px solid var(--border); background: #fff; }
            
            .re-btn { padding:8px 16px; border-radius:10px; cursor:pointer; font-weight:700; background: #fff; border:1px solid var(--border); transition:all 0.2s; }
            .re-btn:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,0.1); }
            .re-btn.check { background: var(--ok); color:white; border-color:var(--ok); }
            
            /* Systems Grid */
            #re-systems { margin-top:20px; display:grid; gap:20px; width:100%; max-width: 1000px; margin: 20px auto; }
            /* 기본 2열 (데스크탑) */
            .re-systems-grid { display:grid; grid-template-columns: 1fr 1fr; gap:20px; }
            .re-systems-single { display:grid; grid-template-columns: 1fr; gap:20px; max-width: 600px; margin: 0 auto; }
            
            .re-bar { 
                position:relative; display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; 
                padding:12px; border-radius:14px; background: rgba(255,255,255,0.6); border: 1px solid var(--border);
            }
            .re-bar-title { position:absolute; top:-22px; left:0; font-size:12px; font-weight:bold; color:var(--sub-text); cursor:pointer; padding:2px 8px; background: rgba(255,255,255,0.8); border-radius:8px; }
            .re-bar-title:hover { color: var(--accent); }

            .re-cell { 
                aspect-ratio: 621 / 726; width: 100%; border-radius:10px; 
                background: rgba(255,255,255,0.9); border: 1px solid var(--border); 
                cursor:pointer; overflow:hidden; position:relative;
                transition: all 0.1s;
            }
            .re-cell.empty { opacity: 0.5; background: rgba(0,0,0,0.03); border: 2px dashed var(--border); }
            .re-cell img { width:100%; height:100%; object-fit:contain; }
            .re-cell.playing { outline: 3px solid var(--accent); box-shadow: 0 0 15px var(--accent); z-index:10; }
            .re-cell.correct { box-shadow: inset 0 0 0 4px var(--ok); border-color: var(--ok); }
            .re-cell.wrong { box-shadow: inset 0 0 0 4px var(--warn); border-color: var(--warn); }

            /* Palette */
            #re-palette { margin-top:20px; display:flex; flex-direction:column; gap:12px; align-items:center; }
            .re-pal-row { display:grid; gap:10px; }
            /* Desktop default: 8 cols */
            .re-pal-row.desktop { grid-template-columns: repeat(8, 1fr); }
            /* Mobile portrait: 6 cols */
            .re-pal-row.mobile { grid-template-columns: repeat(6, 1fr); }
            
            .re-swatch { 
                border-radius:12px; padding:6px; cursor:pointer; background: rgba(255,255,255,0.5); 
                border: 1px solid var(--border); display:flex; flex-direction:column; align-items:center; 
            }
            .re-swatch:hover { transform: scale(1.05); background: #fff; }
            .re-swatch.active { border: 2px solid var(--accent); background: #fff; }
            .re-swatch img { width: 100%; aspect-ratio: 621/726; object-fit:contain; }
            .re-swatch-num { font-size:11px; color: var(--sub-text); margin-top:4px; font-weight:bold; }

            /* Congrats Overlay */
            #re-overlay { position:fixed; inset:0; display:none; align-items:center; justify-content:center; z-index:9999; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); }
            #re-overlay.show { display:flex; animation: pop 0.4s cubic-bezier(.2,.7,.2,1); }
            #re-overlay img { width: min(80vw, 500px); border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }

            @media (max-width: 900px) {
                .re-systems-grid { grid-template-columns: 1fr; }
                .re-pal-row.desktop { display:none; }
                .re-pal-row.mobile { display:grid; }
                .re-row { flex-direction: column; }
            }
            @media (min-width: 901px) {
                .re-pal-row.desktop { display:grid; }
                .re-pal-row.mobile { display:none; }
            }
        `;
        const style = document.createElement('style');
        style.id = 'rhythm-ear-styles';
        style.textContent = css;
        document.head.appendChild(style);
    },

    render(container) {
        container.innerHTML = `
            <div class="game-layout-wrapper" style="max-width: 100%;">
                <div id="count-overlay"></div>
                <div id="re-overlay"><img id="re-congrats-img"></div>
                
                <section class="card section re-panel">
                    <div class="re-row">
                        <div class="re-seg">
                            <button id="btn-beg" onclick="RhythmEarExercise.setDifficulty('beginner')" class="active">Beginner (0-5)</button>
                            <button id="btn-int" onclick="RhythmEarExercise.setDifficulty('intermediate')">Inter (0-10)</button>
                            <button id="btn-adv" onclick="RhythmEarExercise.setDifficulty('advanced')">Adv (0-15)</button>
                        </div>
                        
                        <div class="re-ctrl-grp">
                            <span class="re-label">Bars</span>
                            <select id="re-bars-select" class="re-select" onchange="RhythmEarExercise.setBars(this.value)">
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="4">4</option>
                            </select>
                        </div>

                        <div class="re-ctrl-grp">
                            <span class="re-label">BPM</span>
                            <button class="re-btn" onclick="Main.updateBpm(Main.state.bpm-15)">-15</button>
                            <input id="bpmInput" type="number" class="re-select" style="width:50px; text-align:center;" value="${Main.state.bpm}" onchange="Main.updateBpm(this.value)">
                            <button class="re-btn" onclick="Main.updateBpm(Main.state.bpm+15)">+15</button>
                        </div>
                    </div>

                    <div class="re-row" style="margin-top:10px;">
                        <button class="re-btn" onclick="RhythmEarExercise.newQuestion()">New (Esc)</button>
                        <button id="btnStart" class="re-btn primary" onclick="Main.togglePlay()">Play (Space)</button>
                        <button class="re-btn" onclick="RhythmEarExercise.clearSeq()">Clear</button>
                        <button class="re-btn check" onclick="RhythmEarExercise.checkAnswer()">Check (Enter)</button>
                    </div>
                </section>

                <div id="re-systems"></div>

                <div id="re-palette">
                    <div id="re-pal-row1" class="re-pal-row desktop"></div>
                    <div id="re-pal-row2" class="re-pal-row desktop"></div>
                    
                    <div id="re-pal-row1-m" class="re-pal-row mobile"></div>
                    <div id="re-pal-row2-m" class="re-pal-row mobile"></div>
                    <div id="re-pal-row3-m" class="re-pal-row mobile"></div>
                </div>
            </div>
        `;
        this.setDifficulty('beginner');
    },

    /* ========= Logic Controllers ========= */
    setDifficulty(diff) {
        this.state.difficulty = diff;
        this.state.maxTile = diff === 'beginner' ? 5 : (diff === 'intermediate' ? 10 : 15);
        
        ['beg', 'int', 'adv'].forEach(k => {
            document.getElementById(`btn-${k}`).classList.toggle('active', k.startsWith(diff.substr(0,3)));
        });
        
        this.renderPalette();
        this.newQuestion();
        this._relayoutPalette();
    },

    setBars(val) {
        this.state.barsCount = parseInt(val);
        this.renderSystems();
        this.newQuestion();
    },

    clearSeq() {
        this.state.seq.fill(-1);
        this.state.autoFillPtr = 0;
        this.renderSeq();
    },

    newQuestion() {
        const total = 4 * this.state.barsCount;
        this.state.answerSeq = new Array(total);
        for(let i=0; i<total; i++) {
            this.state.answerSeq[i] = Math.floor(Math.random() * (this.state.maxTile + 1));
        }
        
        // 정답을 Main.state.soundPattern에 연결 (재생 시 이 패턴 사용)
        Main.state.soundPattern = this.state.answerSeq.map(id => this.PATTERNS[id]);
        
        // 사용자 입력 초기화
        this.state.seq = new Array(total).fill(-1);
        this.state.autoFillPtr = 0;
        
        this.renderSystems();
        this.renderSeq();
    },

    /* ========= Rendering ========= */
    renderSystems() {
        const container = document.getElementById('re-systems');
        container.className = this.state.barsCount > 1 ? 're-systems-grid' : 're-systems-single';
        container.innerHTML = '';
        
        // Main.js가 참조할 DOM 요소 배열 초기화
        Main.state.images = [];

        for(let b=0; b<this.state.barsCount; b++) {
            const bar = document.createElement('div');
            bar.className = 're-bar';
            
            const title = document.createElement('div');
            title.className = 're-bar-title';
            title.innerText = `Bar ${b+1}`;
            title.onclick = () => this.playBar(b);
            bar.appendChild(title);

            for(let i=0; i<4; i++) {
                const globalIdx = b*4 + i;
                const cell = document.createElement('div');
                cell.className = 're-cell empty';
                cell.onclick = () => this.slotInsert(globalIdx);
                
                bar.appendChild(cell);
                Main.state.images.push(cell); // Main.js 애니메이션용 참조
            }
            container.appendChild(bar);
        }
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
                // [수정] TILE_PREFIX 추가
                img.src = `${CONFIG.paths.images}${RHYTHM_ASSETS.TILE_PREFIX}${v}.png`;
                cell.appendChild(img);
            }
        });
        
        // Auto-check logic copied from HTML source
        if (this.state.seq.every(v => v !== -1)) {
            let correct = true;
            for(let i=0; i<this.state.seq.length; i++) {
                if (this.state.seq[i] !== this.state.answerSeq[i]) { correct = false; break; }
            }
            if (correct) this.checkAnswer(true);
        }
    },

    renderPalette() {
        // Desktop Rows
        const r1 = document.getElementById('re-pal-row1');
        const r2 = document.getElementById('re-pal-row2');
        if(r1) r1.innerHTML = ''; 
        if(r2) r2.innerHTML = '';

        // Mobile Rows
        const m1 = document.getElementById('re-pal-row1-m');
        const m2 = document.getElementById('re-pal-row2-m');
        const m3 = document.getElementById('re-pal-row3-m');
        if(m1) m1.innerHTML = ''; if(m2) m2.innerHTML = ''; if(m3) m3.innerHTML = '';

        const max = this.state.maxTile;

        for (let i = 0; i <= max; i++) {
            const sw = this._createSwatch(i);
            
            // Desktop Distribution (8 per row)
            if (i < 8) { if(r1) r1.appendChild(sw.cloneNode(true)); }
            else { if(r2) r2.appendChild(sw.cloneNode(true)); }

            // Mobile Distribution (6 per row)
            const mSw = sw.cloneNode(true);
            mSw.onclick = () => { this._selectPalette(i); this.insertFromPalette(); }; // Event Rebind
            if (i < 6) { if(m1) m1.appendChild(mSw); }
            else if (i < 12) { if(m2) m2.appendChild(mSw); }
            else { if(m3) m3.appendChild(mSw); }
        }
        
        this._rebindDesktopEvents();
        this._selectPalette(Math.min(this.state.paletteSel, max));
    },

    _createSwatch(i) {
        const sw = document.createElement('div');
        sw.className = 're-swatch';
        sw.dataset.idx = i;
        // [수정] TILE_PREFIX 및 경로 설정
        sw.innerHTML = `<img src="${CONFIG.paths.images}${RHYTHM_ASSETS.TILE_PREFIX}${i}.png"><div class="re-swatch-num">#${i}</div>`;
        return sw;
    },

    _rebindDesktopEvents() {
        document.querySelectorAll('.desktop .re-swatch').forEach(el => {
            el.onclick = () => {
                this._selectPalette(parseInt(el.dataset.idx));
                this.insertFromPalette();
            };
        });
    },

    _selectPalette(idx) {
        this.state.paletteSel = idx;
        document.querySelectorAll('.re-swatch').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.idx) === idx);
        });
    },

    /* ========= Interaction ========= */
    slotInsert(idx) {
        // Find leftmost empty in bar if clicked empty, otherwise overwrite
        const barIdx = Math.floor(idx / 4);
        const start = barIdx * 4;
        const end = start + 4;
        let target = -1;
        
        // 해당 마디 내에서 가장 왼쪽의 빈칸 찾기
        for(let i=start; i<end; i++) {
            if (this.state.seq[i] === -1) { target = i; break; }
        }
        
        // 빈칸이 없거나 클릭한 곳이 이미 채워져있으면 클릭한 곳 덮어쓰기
        if (target === -1) target = idx;
        
        this.state.seq[target] = this.state.paletteSel;
        this.state.autoFillPtr = Math.min(this.state.seq.length, target + 1);
        this.renderSeq();
        
        // Flash animation
        const cell = Main.state.images[target];
        if(cell) { cell.classList.add('playing'); setTimeout(()=>cell.classList.remove('playing'), 120); }
    },

    insertFromPalette() {
        // Find first empty from ptr
        let idx = -1;
        for(let i=this.state.autoFillPtr; i<this.state.seq.length; i++) {
            if (this.state.seq[i] === -1) { idx = i; break; }
        }
        // If not found, search from beginning
        if (idx === -1) idx = this.state.seq.indexOf(-1);
        if (idx === -1) return; // Full

        this.state.seq[idx] = this.state.paletteSel;
        this.state.autoFillPtr = Math.min(this.state.seq.length, idx + 1);
        this.renderSeq();
        
        const cell = Main.state.images[idx];
        if(cell) { cell.classList.add('playing'); setTimeout(()=>cell.classList.remove('playing'), 120); }
    },

    deleteLast() {
        let pos = this.state.autoFillPtr - 1;
        if (pos < 0) pos = this.state.seq.length - 1;
        // Skip empties going back
        while(pos >= 0 && this.state.seq[pos] === -1) pos--;
        
        if (pos >= 0) {
            this.state.seq[pos] = -1;
            this.state.autoFillPtr = pos;
            this.renderSeq();
        }
    },

    /* ========= Playback Logic ========= */
    // Main.js Loop calls this
    playNote(time, stepIndex) {
        // 전체 재생 (문제 듣기)
        const idx = stepIndex;
        const total = this.state.answerSeq.length;

        if (idx >= total) {
            Main.stopGame();
            return 0;
        }

        // Visual
        const cell = Main.state.images[idx];
        if (cell) {
            setTimeout(() => {
                if(Main.state.isPlaying) {
                    cell.classList.add('playing');
                    setTimeout(() => cell.classList.remove('playing'), 90);
                }
            }, (time - audio.currentTime) * 1000);
        }

        // Audio (Answer Pattern)
        const beatDur = 60.0 / Main.state.bpm;
        audio.playClick(time, idx % 4 === 0);
        
        const patStr = this.PATTERNS[this.state.answerSeq[idx]] || 'xxxx';
        for (let i = 0; i < 4; i++) {
            if (patStr[i] === 'o') {
                audio.playSnare(time + i * (beatDur/4), false);
            }
        }

        return idx + 1;
    },

    // Play Specific Bar (Independent from Main.js loop)
    playBar(barIndex) {
        if (Main.state.isPlaying) Main.stopGame();
        
        // 간단한 로컬 스케줄러 구현
        const startBeat = barIndex * 4;
        const beatCount = 4;
        const bpm = Main.state.bpm;
        const beatDur = 60.0 / bpm;
        let startTime = audio.currentTime + 0.1;

        for (let i = 0; i < beatCount; i++) {
            const beatTime = startTime + i * beatDur;
            const globalIdx = startBeat + i;
            
            // Audio
            audio.playClick(beatTime, i === 0);
            const patStr = this.PATTERNS[this.state.answerSeq[globalIdx]] || 'xxxx';
            for (let j = 0; j < 4; j++) {
                if (patStr[j] === 'o') {
                    audio.playSnare(beatTime + j * (beatDur/4), false);
                }
            }

            // Visual
            const cell = Main.state.images[globalIdx];
            setTimeout(() => {
                if(cell) {
                    cell.classList.add('playing');
                    setTimeout(() => cell.classList.remove('playing'), 90);
                }
            }, (beatTime - audio.currentTime) * 1000);
        }
    },

    /* ========= Grading ========= */
    checkAnswer(silentSuccess = false) {
        if (Main.state.isPlaying) Main.stopGame();
        
        let correctCount = 0;
        const cells = Main.state.images;
        
        for(let i=0; i<this.state.seq.length; i++) {
            const isCorrect = (this.state.seq[i] === this.state.answerSeq[i]);
            if(isCorrect) correctCount++;
            
            cells[i].classList.remove('correct', 'wrong');
            void cells[i].offsetWidth; // Trigger reflow
            cells[i].classList.add(isCorrect ? 'correct' : 'wrong');
        }

        setTimeout(() => {
            cells.forEach(c => c.classList.remove('correct', 'wrong'));
        }, 1000);

        if (correctCount === this.state.seq.length) {
            this.showCongrats();
        } else if (!silentSuccess) {
            const pct = Math.round((correctCount / this.state.seq.length) * 100);
            alert(`Score: ${pct}% (${correctCount}/${this.state.seq.length})`);
        }
    },

    showCongrats() {
        const overlay = document.getElementById('re-overlay');
        const img = document.getElementById('re-congrats-img');
        const imgId = Math.floor(Math.random() * 10) + 1;
        img.src = `${CONFIG.paths.images}Congrat/${imgId}.png`;
        
        overlay.classList.add('show');
        
        // One-time close listener
        const close = () => {
            overlay.classList.remove('show');
            overlay.removeEventListener('click', close);
            this.newQuestion();
        };
        overlay.addEventListener('click', close);
    },

    /* ========= Utilities & Events ========= */
    handleKey(key) {
        if(key === 'r') this.newQuestion();
        if(key === 'backspace') this.deleteLast();
        if(key === 'enter') this.insertFromPalette();
        if(key === 'arrowleft') this._selectPalette(this.state.paletteSel - 1);
        if(key === 'arrowright') this._selectPalette(this.state.paletteSel + 1);
        
        // Palette grid navigation
        const isDesktop = window.innerWidth > 900;
        const cols = isDesktop ? 8 : 6;
        if(key === 'arrowup') this._selectPalette(this.state.paletteSel - cols);
        if(key === 'arrowdown') this._selectPalette(this.state.paletteSel + cols);
        
        // Clamp selection
        if (this.state.paletteSel < 0) this.state.paletteSel = 0;
        if (this.state.paletteSel > this.state.maxTile) this.state.paletteSel = this.state.maxTile;
        this._selectPalette(this.state.paletteSel);
    },
    
    _relayoutPalette() {
        // CSS media queries handle display:none/grid
        // This function ensures the selection highlight is consistent
        this._selectPalette(this.state.paletteSel);
    },

    getStepDuration(bpm) { return 60.0 / bpm; }
};