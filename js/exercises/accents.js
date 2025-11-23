/**
 * Nick Drum Challenge V2 - Accents Exercise Module
 * (수정: Target BPM 도달 시 즉시 스케줄러 정지)
 */
const AccentsExercise = {
    init(container) {
        const config = CONFIG.games.accents;
        container.innerHTML = `
            <div class="game-layout-wrapper">
                <div id="count-overlay"></div>
                <section class="card section control-panel">
                    <div class="control-grid">
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
                    <h3 id="patternTitle" style="margin:0 0 12px 0; text-align:center; color:var(--sub-text); font-size: 14px;">Accents Pattern</h3>
                    <div id="patternGrid" class="slots-container mode-accents"></div>
                </section>
            </div>
        `;
        Main.renderGrid(config.layout, config.assets.prefix);
        Main.state.soundPattern = this._generatePattern(Main.state.images.length);
    },

    _generatePattern(total) {
        const arr = [];
        const map = { '1': 'Oooo', '2': 'oOoo', '3': 'ooOo', '4': 'oooO' };
        for (let i = 0; i < total; i++) {
            const m = Main.state.images[i].src.match(/Accents_(\d+)\.png/);
            arr.push(map[m ? m[1] : '1'] || 'oxox');
        }
        return arr;
    },

    handleKey(key) {},
    getStepDuration(bpm) { return 60.0 / bpm; },

    // [accents.js]
playNote(time, stepIndex) {
    const idx = stepIndex;
    const total = Main.state.images.length;

    // 1. Go! 표시
    if (idx === 0) setTimeout(() => { if(Main.state.isPlaying){ Main.showOverlay("Go!"); setTimeout(() => Main.showOverlay(""), 1000); }}, (time - audio.currentTime)*1000);

    // 2. 메트로놈 & 비주얼
    audio.playClick(time, idx % 4 === 0);
    const img = Main.state.images[idx];
    if (img) setTimeout(() => { if (Main.state.isPlaying) { Main.state.images.forEach(x => x.classList.remove('playing')); img.classList.add('playing'); } }, (time - audio.currentTime)*1000);

    // 3. 패턴 재생
    const pat = Main.state.soundPattern[idx];
    const beatDur = 60.0 / Main.state.bpm;
    
    if (pat) {
        for (let i = 0; i < 4; i++) {
            const ch = pat[i];
            if (ch === 'O') audio.playSnare(time + i * (beatDur/4), true); 
            else if (ch === 'o') audio.playSnare(time + i * (beatDur/4), false);
        }
    }

    // 4. [핵심 수정] 사이클 종료 처리 (마지막 노트 시점)
    if (idx >= total - 1) {
        if (Main.state.bpm >= Main.state.targetBpm) {
            if (Main.state.timerId) {
                clearInterval(Main.state.timerId);
                Main.state.timerId = null;
            }
            setTimeout(() => Main.stopGame(), 1000);
            return idx + 1;
        }
        
        const inc = CONFIG.games.accents.increment;
        Main.updateBpm(Main.state.bpm + inc);
        Main.state.isIntro = true; // 즉시 카운트다운 활성화
        
        return 0; // 다음 루프 0번으로 리셋
    }

    return idx + 1;
    }
};