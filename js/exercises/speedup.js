/**
 * Nick Drum Challenge V2 - Speed Up Exercise Module
 * (수정: Target BPM 도달 시 즉시 스케줄러 정지)
 */
const SpeedUpExercise = {
    mode: 'single',

    init(container) {
        this.mode = 'single';
        this.render(container);
    },

    render(container) {
        container.innerHTML = `
            <div class="game-layout-wrapper">
                <div id="count-overlay"></div>
                <section class="card section control-panel">
                    <div class="control-grid">
                        <div class="nav-grp">
                            <button id="btn-single" class="nav-btn" onclick="SpeedUpExercise.setMode('single')">Single <span>(Q)</span></button>
                            <button id="btn-double" class="nav-btn" onclick="SpeedUpExercise.setMode('double')">Double <span>(W)</span></button>
                            <button id="btn-paradiddle" class="nav-btn" onclick="SpeedUpExercise.setMode('paradiddle')">Paradiddle <span>(E)</span></button>
                        </div>
                        <div class="grp">
                            <label class="label">Start BPM</label>
                            <input id="bpmInput" type="number" class="input-box" value="${Main.state.bpm}" min="30" max="240" step="5" onchange="Main.updateBpm(this.value)">
                        </div>
                        <div class="grp">
                            <label class="label">Target BPM</label>
                            <input id="targetInput" type="number" class="input-box" value="${Main.state.targetBpm}" min="40" max="300" step="5" onchange="Main.updateTargetBpm(this.value)">
                        </div>
                        <div class="grp start-grp"><button id="btnStart" class="btn primary" onclick="Main.togglePlay()">Start (Space)</button></div>
                    </div>
                </section>
                <section class="card pattern-panel">
                    <h3 id="patternTitle" style="margin:0 0 12px 0; text-align:center; color:var(--sub-text); font-size: 14px;">Pattern View</h3>
                    <div id="patternGrid" class="slots-container"></div>
                </section>
            </div>
        `;
        this.setMode('single');
    },

    setMode(mode) {
        if (Main.state.isPlaying) Main.stopGame();
        this.mode = mode;
        
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-${mode}`)?.classList.add('active');
        document.getElementById('patternTitle').innerText = `Pattern Slots (${mode.charAt(0).toUpperCase() + mode.slice(1)})`;
        
        const conf = CONFIG.games.speedup.modes[mode];
        const grid = document.getElementById('patternGrid');
        grid.className = `slots-container mode-${mode}`;
        
        Main.renderGrid(conf.layout, conf.prefix, conf.sizeClass);
        Main.state.soundPattern = this._generatePattern(mode, Main.state.images.length);
    },

    _generatePattern(mode, total) {
        const arr = [];
        for (let i = 0; i < total; i++) {
            if (mode === 'single') arr.push(((i >= 8 && i < 12) || (i >= 20 && i < 24)) ? 'oooo' : 'oxox');
            else arr.push(Main.state.images[i].src.includes('Var_0') ? 'xxxx' : 'oooo');
        }
        return arr;
    },

    handleKey(key) {
        if (key === 'q') this.setMode('single');
        if (key === 'w') this.setMode('double');
        if (key === 'e') this.setMode('paradiddle');
    },

    getStepDuration(bpm) { return 60.0 / bpm; }, 

    // [speedup.js]
playNote(time, stepIndex) {
    const idx = stepIndex;
    const total = Main.state.images.length;

    // 1. Go! 표시 (첫 박자)
    if (idx === 0) setTimeout(() => { if(Main.state.isPlaying){ Main.showOverlay("Go!"); setTimeout(() => Main.showOverlay(""), 1000); }}, (time - audio.currentTime)*1000);

    // 2. 메트로놈 & 비주얼 효과
    audio.playClick(time, idx % 4 === 0);
    const img = Main.state.images[idx];
    if (img) setTimeout(() => { if (Main.state.isPlaying) { Main.state.images.forEach(x => x.classList.remove('playing')); img.classList.add('playing'); } }, (time - audio.currentTime)*1000);

    // 3. 패턴 사운드 재생
    const pat = Main.state.soundPattern[idx];
    const beatDur = 60.0 / Main.state.bpm;
    
    if (pat) {
        for (let i = 0; i < 4; i++) {
            const ch = pat[i];
            if (ch === 'o') audio.playSnare(time + i * (beatDur/4), false);
        }
    }

    // 4. [핵심 수정] 마지막 노트일 때 즉시 다음 단계 준비
    // (기존 idx >= total에서 idx >= total - 1로 변경하여 빈 박자 제거)
    if (idx >= total - 1) {
        // 목표 BPM 도달 시 종료
        if (Main.state.bpm >= Main.state.targetBpm) {
            if (Main.state.timerId) {
                clearInterval(Main.state.timerId);
                Main.state.timerId = null;
            }
            setTimeout(() => Main.stopGame(), 1000);
            return idx + 1; 
        }

        // 속도 증가 및 카운트다운(Intro) 활성화
        const inc = CONFIG.games.speedup.increment;
        Main.updateBpm(Main.state.bpm + inc);
        Main.state.isIntro = true; // 바로 카운트다운 시작
        
        return 0; // 다음 스텝을 0(카운트 시작)으로 리셋
    }

    return idx + 1;
}
};