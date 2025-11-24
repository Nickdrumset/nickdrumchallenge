/**
 * Nick Drum Challenge V2 - Tuplets Exercise Module
 * (수정 1: "3_2" 파일명 인식 및 3연음 처리)
 * (수정 2: Target BPM 도달 시 메트로놈 즉시 정지)
 */
const TupletsExercise = {
    init(container) {
        const config = CONFIG.games.tuplets;
        container.innerHTML = `
            <div class="game-layout-wrapper wide-context">
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
                    <h3 style="margin:0 0 12px 0; text-align:center; color:var(--sub-text); font-size: 14px;">Tuplets Pattern</h3>
                    <div id="patternGrid" class="slots-container mode-tuplets"></div>
                </section>
            </div>
        `;
        Main.renderGrid(config.layout, config.assets.prefix);
        Main.state.soundPattern = this._generatePattern(Main.state.images.length);
    },

    _generatePattern(total) {
        const arr = [];
        // [수정] '3_2' 키 추가 (3연음으로 처리)
        const map = { 
            '1': 1, '2': 2, '3': 3, '3_2': 3, 
            '4': 4, '5': 6 
        };
        
        for (let i = 0; i < total; i++) {
            // [수정] 정규식 변경: (\d+) -> ([0-9_]+) 
            // 언더바(_)가 포함된 파일명(3_2)도 인식하도록 함
            const m = Main.state.images[i].src.match(/Tuplets_([0-9_]+)\.png/);
            arr.push(map[m ? m[1] : '1'] || 4);
        }
        return arr;
    },

    handleKey(key) {},
    getStepDuration(bpm) { return 60.0 / bpm; },

    playNote(time, stepIndex) {
        const idx = stepIndex;
        const total = Main.state.images.length;

        // 1. Go! 표시
        if (idx === 0) {
            setTimeout(() => { 
                if(Main.state.isPlaying){ 
                    Main.showOverlay("Go!"); 
                    setTimeout(() => Main.showOverlay(""), 1000); 
                }
            }, (time - audio.currentTime)*1000);
        }

        // 2. 메트로놈 & 비주얼
        audio.playClick(time, idx % 4 === 0);

        const img = Main.state.images[idx];
        if (img) {
            setTimeout(() => { 
                if (Main.state.isPlaying) { 
                    Main.state.images.forEach(x => x.classList.remove('playing')); 
                    img.classList.add('playing'); 
                } 
            }, (time - audio.currentTime)*1000);
        }

        // 3. Tuplets 재생
        const hits = Main.state.soundPattern[idx];
        const beatDur = 60.0 / Main.state.bpm;
        
        if (typeof hits === 'number' && hits > 0) {
            for(let i=0; i<hits; i++) {
                audio.playSnare(time + i * (beatDur / hits));
            }
        }

        // 4. 종료 및 반복 로직
        if (idx >= total - 1) {
            // [유지] Target BPM 도달 시 즉시 정지 (이전 요청사항)
            if (Main.state.bpm >= Main.state.targetBpm) {
                if (Main.state.timerId) {
                    clearInterval(Main.state.timerId);
                    Main.state.timerId = null;
                }
                setTimeout(() => Main.stopGame(), 1000);
                return idx + 1;
            }

            const inc = CONFIG.games.tuplets.increment;
            Main.updateBpm(Main.state.bpm + inc);
            Main.state.isIntro = true; 
            return 0;
        }

        return idx + 1;
    }
};