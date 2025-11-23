/**
 * Nick Drum Challenge V2 - Sight Reading Exercise Module
 * (수정: 마지막 메트로놈 소리 제거)
 */
const SightReadingExercise = {
    isChallenge: false,
    
    init(container) {
        this.isChallenge = false;
        this.render(container);
    },

    render(container) {
        container.innerHTML = `
            <div class="game-layout-wrapper">
                <div id="count-overlay"></div>
                <section class="card section control-panel">
                    <div class="control-grid">
                        <div class="nav-grp">
                            <button id="btn-study" class="nav-btn active" onclick="SightReadingExercise.setMode('study')">Study <span>(Q)</span></button>
                            <button id="btn-challenge" class="nav-btn" onclick="SightReadingExercise.setMode('challenge')">Challenge <span>(W)</span></button>
                        </div>
                        <div class="grp">
                            <label class="label">Level (↑ ↓)</label>
                            <input id="levelInput" type="number" class="input-box" value="${Main.state.level}" min="1" max="15" onchange="Main.state.level=parseInt(this.value); SightReadingExercise._renderGrid();">
                        </div>
                        <div class="grp"><button class="btn" onclick="SightReadingExercise._renderGrid()">Refresh (Enter)</button></div>
                        <div class="grp">
                            <label class="label">Start BPM</label>
                            <input id="bpmInput" type="number" class="input-box" value="${Main.state.bpm}" min="30" max="240" step="5" onchange="Main.updateBpm(this.value)">
                        </div>
                        <div class="grp start-grp"><button id="btnStart" class="btn primary" onclick="Main.togglePlay()">Start (Space)</button></div>
                    </div>
                </section>
                <section class="card pattern-panel">
                    <h3 style="margin:0 0 12px 0; text-align:center; color:var(--sub-text); font-size: 14px;">Sight Reading</h3>
                    <div id="patternGrid" class="slots-container mode-sightreading"></div>
                </section>
            </div>
        `;
        this.setMode('study');
    },

    setMode(mode) {
        if (Main.state.isPlaying) Main.stopGame();
        this.isChallenge = (mode === 'challenge');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-${mode}`)?.classList.add('active');
        this._renderGrid();
    },

    _renderGrid() {
        const bars = this.isChallenge ? 8 : 4;
        const level = Main.state.level;
        const layout = [];
        for(let i=0; i<bars; i+=2) {
            const measuresInRow = [];
            const m1 = [];
            for(let j=0; j<4; j++) {
                let num = Math.floor(Math.random() * (level + 1));
                if (!this.isChallenge && i < 2) num = level;
                m1.push(num);
            }
            measuresInRow.push(m1);
            
            if(i+1 < bars) {
                const m2 = [];
                for(let j=0; j<4; j++) {
                    let num = Math.floor(Math.random() * (level + 1));
                    if (!this.isChallenge && i < 2) num = level;
                    m2.push(num);
                }
                measuresInRow.push(m2);
            }
            layout.push({ measures: measuresInRow });
        }
        Main.renderGrid(layout, "Sight_");
        Main.state.soundPattern = this._generatePattern();
    },

    _generatePattern() {
        const patterns = CONFIG.games.sightreading.patterns;
        const arr = [];
        Main.state.images.forEach(img => {
            const match = img.src.match(/Sight_(\d+)\.png/);
            const num = match ? parseInt(match[1]) : 0;
            arr.push(patterns[num] || 'xxxx');
        });
        return arr;
    },

    handleKey(key) {
        if (key === 'q') this.setMode('study');
        if (key === 'w') this.setMode('challenge');
        if (key === 'enter') { if(Main.state.isPlaying) Main.stopGame(); this._renderGrid(); }
    },
    
    getStepDuration(bpm) { return 60.0 / bpm; },

    playNote(time, stepIndex) {
        const idx = stepIndex;
        const total = Main.state.images.length;

        // 인덱스 초과 방지 (혹시 모를 안전장치)
        if (idx >= total) {
            Main.stopGame();
            return idx;
        }

        // 1. Go! 표시
        if (idx === 0) setTimeout(() => { if(Main.state.isPlaying){ Main.showOverlay("Go!"); setTimeout(() => Main.showOverlay(""), 1000); }}, (time - audio.currentTime)*1000);

        // 2. 메트로놈 & 비주얼
        audio.playClick(time, idx % 4 === 0);
        const img = Main.state.images[idx];
        if (img) setTimeout(() => { if (Main.state.isPlaying) { Main.state.images.forEach(x => x.classList.remove('playing')); img.classList.add('playing'); } }, (time - audio.currentTime)*1000);

        // 3. 패턴 재생
        const pat = Main.state.soundPattern[idx];
        const beatDur = 60.0 / Main.state.bpm;
        
        if (typeof pat === 'string') {
            for (let i = 0; i < 4; i++) {
                const ch = pat[i];
                if (ch === 'o') audio.playSnare(time + i * (beatDur/4), false);
            }
        }

        // 4. [핵심 수정] 마지막 노트일 경우, 즉시 타이머 해제
        // 이렇게 해야 다음 박자(idx + 1)의 playClick이 예약되지 않습니다.
        if (idx >= total - 1) {
            // 스케줄러 즉시 정지
            if (Main.state.timerId) {
                clearInterval(Main.state.timerId);
                Main.state.timerId = null;
            }
            
            // 마지막 음표가 충분히 들릴 시간(1박자)을 주고 UI 초기화
            setTimeout(() => Main.stopGame(), beatDur * 1000);
            
            return idx + 1;
        }

        return idx + 1;
    }
};