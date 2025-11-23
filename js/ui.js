/**
 * Nick Drum Challenge V2 - UI Manager
 */
const UI = {
    elements: {
        scaleWrap: document.getElementById('scaleWrap'),
        menuView: document.getElementById('menu-view'),
        gameView: document.getElementById('game-view'),
        gameTitle: document.getElementById('game-title'),
        gameContainer: document.getElementById('game-container'),
        backBtn: document.getElementById('btn-back'),
        fsBtn: document.getElementById('fsBtn'),
        navBtns: document.querySelectorAll('.nav-btn[data-module]'),
        collapsibles: document.querySelectorAll('.collapsible')
    },

    init() {
        this._setupEventListeners();
        this._setupScaling();
        this._setupFullscreen();
        this._addHotkeysHint();
        console.log("UI Initialized");
    },

    _addHotkeysHint() {
        const map = { 'speedup': 'S', 'accents': 'A', 'tuplets': 'T', 'sightreading': 'R', 'beat4816': 'B', 'rhythmear': 'E' };
        this.elements.navBtns.forEach(btn => {
            const key = map[btn.dataset.module];
            if (key) btn.innerHTML += `<kbd>${key}</kbd>`;
        });
    },

    navigateToGame(moduleKey) {
        const gameConfig = CONFIG.games[moduleKey];
        if (!gameConfig) return;
        if (typeof audio !== 'undefined') audio.init();

        this.elements.gameTitle.innerText = gameConfig.title;
        this.elements.menuView.classList.add('hidden');
        this.elements.gameView.classList.remove('hidden');

        if (typeof Main !== 'undefined' && Main.loadGame) Main.loadGame(moduleKey);
        window.scrollTo(0, 0);
    },

    returnToMenu() {
        if (typeof Main !== 'undefined' && Main.stopGame) Main.stopGame();
        this.elements.gameView.classList.add('hidden');
        this.elements.menuView.classList.remove('hidden');
        this.elements.gameContainer.innerHTML = '';
    },

    _setupScaling() {
        const resize = () => {
            const wrap = this.elements.scaleWrap;
            if (!wrap) return;
            if (window.innerWidth < 800) { wrap.style.transform = 'none'; wrap.style.width='100%'; return; }
            wrap.style.transform = 'scale(1)'; wrap.style.width='auto';
            const scale = Math.max(0.5, Math.min(1.5, Math.min(window.innerWidth / wrap.scrollWidth, window.innerHeight / wrap.scrollHeight))) * 0.95;
            wrap.style.transform = `scale(${scale})`;
        };
        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', () => setTimeout(resize, 100));
        resize();
    },

    _setupEventListeners() {
        this.elements.navBtns.forEach(btn => btn.addEventListener('click', e => this.navigateToGame(e.currentTarget.dataset.module)));
        this.elements.backBtn.addEventListener('click', () => this.returnToMenu());
        this.elements.collapsibles.forEach(s => s.querySelector('.section-header')?.addEventListener('click', () => s.classList.toggle('collapsed')));

        // [글로벌 단축키]
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            const key = e.key.toLowerCase();
            
            // 전체화면 (F) - 어디서든 동작
            if (key === 'f') { 
                e.preventDefault(); 
                this._toggleFullscreenAction(); 
                return; 
            }

            if (!this.elements.menuView.classList.contains('hidden')) {
                if (key === 's') { e.preventDefault(); this.navigateToGame('speedup'); }
                if (key === 'a') { e.preventDefault(); this.navigateToGame('accents'); }
                if (key === 't') { e.preventDefault(); this.navigateToGame('tuplets'); }
                if (key === 'r') { e.preventDefault(); this.navigateToGame('sightreading'); }
                if (key === 'b') { e.preventDefault(); this.navigateToGame('beat4816'); }
                if (key === 'e') { e.preventDefault(); this.navigateToGame('rhythmear'); }
            } else {
                if (key === 'm') { e.preventDefault(); this.returnToMenu(); }
            }
        });
    },

    _setupFullscreen() {
        const btn = this.elements.fsBtn;
        if (!btn) return;
        btn.addEventListener('click', () => this._toggleFullscreenAction());
        
        // 아이콘 업데이트
        const update = () => {
            const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
            btn.querySelector('.enter').style.display = fs ? 'none' : 'block';
            btn.querySelector('.exit').style.display = fs ? 'block' : 'none';
        };
        document.addEventListener('fullscreenchange', update);
        document.addEventListener('webkitfullscreenchange', update);
        update(); // 초기상태
    },

    _toggleFullscreenAction() {
        const isFs = document.fullscreenElement || document.webkitFullscreenElement;
        if (isFs) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        } else {
            const el = document.documentElement;
            if (el.requestFullscreen) el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        }
    }
};