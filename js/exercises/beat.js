/**
 * Nick Drum Challenge V2 - Beat Exercise Module
 * (수정 1: Study 모드 2회 반복 & 라벨 표시)
 * (수정 2: Maker 모드 Empty 슬롯에서 정박에 더블 클릭 재생)
 */
const BeatExercise = {
    state: {
        beatMode: '4', appMode: 'study',
        makerSlots: [null, null, null, null], selectedMakerSlot: 0,
        images: [], soundPattern: []
    },

    init(container) {
        this.state.beatMode = '4';
        this.state.appMode = 'study';
        this.state.makerSlots = [null, null, null, null];
        this.state.selectedMakerSlot = 0;
        this._renderUI(container);
    },

    _renderUI(container) {
        container.innerHTML = `
            <div class="game-layout-wrapper beat-context">
                <div id="count-overlay"></div>
                <section class="card section control-panel">
                    <div class="control-grid">
                        <div class="nav-grp">
                            <button id="btn-study" class="nav-btn active" onclick="BeatExercise.setAppMode('study')">Study <span>(Q)</span></button>
                            <button id="btn-maker" class="nav-btn" onclick="BeatExercise.setAppMode('maker')">Maker <span>(W)</span></button>
                        </div>
                        <div style="height:10px;"></div>
                        <div class="nav-grp">
                            <button id="btn-4" class="nav-btn active" onclick="BeatExercise.setBeatMode('4')">4 Beat <span>(↑)</span></button>
                            <button id="btn-8" class="nav-btn" onclick="BeatExercise.setBeatMode('8')">8 Beat</button>
                            <button id="btn-16" class="nav-btn" onclick="BeatExercise.setBeatMode('16')">16 Beat <span>(↓)</span></button>
                        </div>
                        <div class="grp">
                            <label class="label">BPM (← →)</label>
                            <input id="bpmInput" type="number" class="input-box" value="${Main.state.bpm}" min="30" max="240" step="5" 
                                   onchange="Main.updateBpm(this.value)">
                        </div>
                        <div class="grp start-grp"><button id="btnStart" class="btn primary" onclick="Main.togglePlay()">Start (Space)</button></div>
                    </div>
                </section>
                <section class="card pattern-panel">
                    <h3 id="patternTitle" style="margin:0 0 12px 0; text-align:center; color:var(--sub-text); font-size: 14px;">Study Mode</h3>
                    <div id="patternGrid" class="slots-container"></div>
                    <div id="libraryContainer" class="library-container" style="display:none;">
                        <div class="lib-title">Select Pattern</div>
                        <div id="libGrid" class="lib-grid"></div>
                    </div>
                </section>
            </div>
        `;
        this.setAppMode('study');
    },

    setAppMode(mode) {
        if (Main.state.isPlaying) Main.stopGame();
        this.state.appMode = mode;
        this._updateActiveButtons();
        document.getElementById('patternTitle').innerText = mode === 'study' ? 'Study Mode' : 'Maker Mode';
        
        const lib = document.getElementById('libraryContainer');
        if (mode === 'maker') {
            lib.style.display = 'block';
            this._renderLibrary();
            this._renderMakerGrid();
        } else {
            lib.style.display = 'none';
            this.setBeatMode(this.state.beatMode);
        }
    },

    setBeatMode(mode) {
        if (Main.state.isPlaying && this.state.appMode === 'study') Main.stopGame();
        this.state.beatMode = mode;
        this._updateActiveButtons();
        if (this.state.appMode === 'maker') this._renderLibrary();
        else this._renderStudyGrid();
    },

    _updateActiveButtons() {
        ['study', 'maker'].forEach(m => document.getElementById(`btn-${m}`)?.classList.toggle('active', this.state.appMode === m));
        ['4', '8', '16'].forEach(m => document.getElementById(`btn-${m}`)?.classList.toggle('active', this.state.beatMode === m));
    },

    _renderStudyGrid() {
        const layout = CONFIG.games.beat4816.layout; 
        const prefix = CONFIG.games.beat4816.prefixes[this.state.beatMode];
        const grid = document.getElementById('patternGrid');
        grid.innerHTML = '';
        grid.className = 'slots-container mode-beat-study';

        let imgCounter = 1;
        layout.forEach((rowConfig, rowIdx) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'bar';
            
            rowConfig.measures.forEach(measure => {
                const measureDiv = document.createElement('div');
                measureDiv.className = 'measure';
                measure.forEach(() => {
                    if (imgCounter > 9) return;
                    const img = document.createElement('img');
                    img.src = `${CONFIG.paths.images}${prefix}${imgCounter}.png`;
                    img.className = 'slot-img';
                    measureDiv.appendChild(img);
                    imgCounter++;
                });
                rowDiv.appendChild(measureDiv);
            });

            // [유지] 첫 번째 줄 우측 "2 times each" 라벨
            if (rowIdx === 0) {
                const label = document.createElement('span');
                label.innerText = "2 times each";
                label.style.marginLeft = "20px";
                label.style.color = "var(--sub-text)";
                label.style.fontWeight = "600";
                label.style.fontSize = "14px";
                label.style.display = "flex";
                label.style.alignItems = "center";
                label.style.opacity = "0.8";
                rowDiv.appendChild(label);
            }

            grid.appendChild(rowDiv);
        });
        this.state.images = Array.from(document.querySelectorAll('.slot-img'));
        this._generateStudySoundPattern();
    },

    _renderMakerGrid() {
        const grid = document.getElementById('patternGrid');
        grid.innerHTML = '';
        grid.className = 'slots-container mode-beat-maker';

        const rowDiv = document.createElement('div');
        rowDiv.className = 'bar maker-slots';

        for (let i = 0; i < 4; i++) {
            let el;
            const pattern = this.state.makerSlots[i];
            if (pattern) {
                const prefix = CONFIG.games.beat4816.prefixes[pattern.beatType || this.state.beatMode];
                el = document.createElement('img');
                el.src = `${CONFIG.paths.images}${prefix}${pattern.id}.png`;
                el.className = 'slot-img';
            } else {
                el = document.createElement('div');
                el.className = 'slot-empty';
                el.innerText = "Empty";
            }
            
            el.onclick = () => { 
                this.state.selectedMakerSlot = i; 
                this._updateHighlight(); 
            };
            rowDiv.appendChild(el);
        }
        grid.appendChild(rowDiv);
        this.state.images = Array.from(rowDiv.children);
        this.state.soundPattern = this.state.makerSlots;
        this._updateHighlight();
    },

    _updateHighlight() {
        this.state.images.forEach((el, idx) => {
            el.style.borderColor = (idx === this.state.selectedMakerSlot) ? 'var(--accent)' : 'var(--border)';
            el.style.borderWidth = (idx === this.state.selectedMakerSlot) ? '3px' : '1px';
        });
    },

    _renderLibrary() {
        const lib = document.getElementById('libGrid');
        lib.innerHTML = '';
        const prefix = CONFIG.games.beat4816.prefixes[this.state.beatMode];
        
        const groups = [[1], [2,3,4,5], [6,7,8,9]];
        groups.forEach(group => {
            group.forEach(i => {
                const img = document.createElement('img');
                img.src = `${CONFIG.paths.images}${prefix}${i}.png`;
                img.className = 'lib-img';
                img.onclick = () => this._fillMakerSlot(i);
                lib.appendChild(img);
            });
            const br = document.createElement('div'); br.className = 'lib-break'; lib.appendChild(br);
        });
    },

    _fillMakerSlot(id) {
        if (this.state.selectedMakerSlot === null) return;
        const mode = this.state.beatMode;
        const pattern = CONFIG.games.beat4816.patterns[mode].find(p => p.id === id);
        this.state.makerSlots[this.state.selectedMakerSlot] = { ...pattern, beatType: mode };
        this._renderMakerGrid();
        if(this.state.selectedMakerSlot < 3) { 
            this.state.selectedMakerSlot++; 
            this._updateHighlight(); 
        }
    },

    _removeLastMakerSlot() {
        const curr = this.state.selectedMakerSlot;
        if (curr !== null && this.state.makerSlots[curr] !== null) {
            this.state.makerSlots[curr] = null;
            this._renderMakerGrid(); return;
        }
        for (let i = 3; i >= 0; i--) {
            if (this.state.makerSlots[i] !== null) {
                this.state.makerSlots[i] = null;
                this.state.selectedMakerSlot = i;
                this._renderMakerGrid(); return;
            }
        }
    },

    _generateStudySoundPattern() {
        const mode = this.state.beatMode;
        const patterns = CONFIG.games.beat4816.patterns[mode];
        this.state.soundPattern = [];
        this.state.images.forEach(img => {
            const match = img.src.match(/Beat\d+_(\d+)\.png/);
            if (match) this.state.soundPattern.push(patterns.find(p => p.id === parseInt(match[1])));
        });
    },

    handleKey(key) {
        if(key==='q') this.setAppMode('study');
        if(key==='w') this.setAppMode('maker');
        if(key==='backspace' && this.state.appMode==='maker') this._removeLastMakerSlot();
        if(key==='arrowup') { const m=['4','8','16']; const idx=m.indexOf(this.state.beatMode); this.setBeatMode(m[(idx-1+3)%3]); }
        if(key==='arrowdown') { const m=['4','8','16']; const idx=m.indexOf(this.state.beatMode); this.setBeatMode(m[(idx+1)%3]); }
        if(key==='arrowleft') Main.updateBpm(Main.state.bpm-5);
        if(key==='arrowright') Main.updateBpm(Main.state.bpm+5);
    },

    getStepDuration(bpm) { return 15.0 / bpm; },

    playNote(time, stepIndex) {
        // Study 모드는 2회 반복, Maker 모드는 1회 반복
        const REPEATS = (this.state.appMode === 'study') ? 2 : 1;
        
        const STEPS_PER_PATTERN = 8;
        const STEPS_PER_TILE = STEPS_PER_PATTERN * REPEATS;

        const tileIdx = Math.floor(stepIndex / STEPS_PER_TILE);
        const stepInPattern = stepIndex % STEPS_PER_PATTERN;
        const stepInTile = stepIndex % STEPS_PER_TILE;

        const maxTiles = this.state.appMode === 'maker' ? 4 : this.state.images.length;

        if (this.state.appMode === 'study' && tileIdx >= maxTiles) { 
            Main.stopGame(); 
            return stepIndex; 
        }

        const actualTileIdx = tileIdx % maxTiles;
        const img = this.state.images[actualTileIdx];
        const pat = (this.state.appMode === 'maker' ? this.state.makerSlots[actualTileIdx] : this.state.soundPattern[actualTileIdx]);

        if (stepInTile === 0 && img) {
            setTimeout(() => {
                if(!Main.state.isPlaying) return;
                this.state.images.forEach(x => x.classList.remove('playing'));
                img.classList.add('playing');
            }, (time - audio.currentTime) * 1000);
        }

        if (pat) {
            // 패턴이 있으면 드럼 사운드 재생
            if(pat.hh?.includes(stepInPattern)) audio.playHiHat(time);
            if(pat.sd?.includes(stepInPattern)) audio.playSnare(time);
            if(pat.bd?.includes(stepInPattern)) audio.playKick(time);
        } else {
            // [수정] Maker 모드 Empty 슬롯일 경우
            // 정박(4스텝 간격: 0, 4)마다 더블 클릭 재생
            if (stepInPattern % 4 === 0) {
                audio.playClick(time, true);
                audio.playClick(time, true);
            }
        }
        return stepIndex + 1;
    }
};