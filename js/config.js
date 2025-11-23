/**
 * Nick Drum Challenge V2 - Configuration
 * (수정: 16 Beat 패턴 스네어 위치 변경 [2,6] -> [4])
 */
const CONFIG = {
    app: { version: "4.4.1", title: "Nick Drum Challenge", author: "Nick Drumset" },
    paths: { images: "assets/images/", sounds: "assets/sounds/" },
    
    audio: {
        masterVolume: 0.9,
        click: { accentFreq: 2000, normalFreq: 1700, duration: 0.05, accentVol: 0.35, normalVol: 0.25 },
        snare: { highPass: 1200, bandPass: 2500, duration: 0.18, accentVolume: 1.0, ghostVolume: 0.3 }
    },

    games: {
        speedup: {
            id: "speedup", title: "Speed Up Exercise",
            bpmRange: { min: 30, max: 240, default: 80 },
            targetRange: { min: 40, max: 300, default: 200 },
            increment: 10,
            modes: {
                single: { prefix: "SpeedUp_", sizeClass: "", layout: [{measures:[[1,1,1,1],[2,2,2,2]]}, {measures:[[3,3,3,3]]}, {measures:[[1,1,1,1],[2,2,2,2]]}, {measures:[[3,3,3,3]]}] },
                double: { prefix: "SpeedUp_Var_", sizeClass: "size-large", layout: [{measures:[[1,0,1,0],[1,0,1,0]]}, {measures:[[1,1,0,0],[1,1,0,0]]}, {measures:[[1,1,1,1]]}] },
                paradiddle: { prefix: "SpeedUp_Var_", sizeClass: "size-large", layout: [{measures:[[2,0,3,0],[2,0,3,0]]}, {measures:[[2,3,0,0],[2,3,0,0]]}, {measures:[[2,3,2,3]]}] }
            }
        },
        accents: {
            id: "accents", title: "Accents Exercise",
            bpmRange: { min: 30, max: 240, default: 60 },
            targetRange: { min: 40, max: 300, default: 180 },
            increment: 10, assets: { prefix: "Accents_" }, 
            layout: [{measures:[[1,1,1,1],[2,2,2,2]]}, {measures:[[3,3,3,3],[4,4,4,4]]}, {measures:[[1,1],[2,2],[3,3],[4,4]]}, {measures:[[1],[2],[3],[4],[1],[2],[3],[4]]}]
        },
        
        tuplets: {
            id: "tuplets", title: "Tuplets Exercise",
            bpmRange: { min: 30, max: 240, default: 60 },
            targetRange: { min: 40, max: 300, default: 130 },
            increment: 10, assets: { prefix: "Tuplets_" },
            layout: [
                { measures: [[1,1,1,1], [2,2,2,2]] }, 
                { measures: [[3, "3_2", 3, "3_2"], [4,4,4,4]] }, 
                { measures: [[5,5,5,5]] }
            ]
        },
        
        sightreading: {
            id: "sightreading", title: "Sight Reading Exercise",
            bpmRange: { min: 30, max: 240, default: 60 },
            assets: { prefix: "Sight_" },
            patterns: ["xxxx","oxxx","oxox","oooo","ooox","oxoo","xxox","xxoo","ooxo","oxxo","ooxx","xooo","xoox","xxxo","xoxo","xoxx"],
            maxLevel: 15
        },
        beat4816: {
            id: "beat4816", title: "4 / 8 / 16 Beat Exercise", defaultBpm: 60,
            prefixes: { "4": "Beat4_", "8": "Beat8_", "16": "Beat16_" },
            layout: [
                { measures: [[1]] }, 
                { measures: [[2], [3], [4], [5]] }, 
                { measures: [[6], [7], [8], [9]] }
            ],
            patterns: {
                "4": [ 
                    {id:1,hh:[0,4,8,12],sd:[4,12],bd:[]}, 
                    {id:2,hh:[0,4,8,12],sd:[4,12],bd:[0]}, 
                    {id:3,hh:[0,4,8,12],sd:[4,12],bd:[2]}, 
                    {id:4,hh:[0,4,8,12],sd:[4,12],bd:[4]}, 
                    {id:5,hh:[0,4,8,12],sd:[4,12],bd:[6]}, 
                    {id:6,hh:[0,4,8,12],sd:[4,12],bd:[0,2]}, 
                    {id:7,hh:[0,4,8,12],sd:[4,12],bd:[0,6]}, 
                    {id:8,hh:[0,4,8,12],sd:[4,12],bd:[0,4]}, 
                    {id:9,hh:[0,4,8,12],sd:[4,12],bd:[2,6]} 
                ],
                "8": [ 
                    {id:1,hh:[0,2,4,6,8,10,12,14],sd:[4,12],bd:[]}, 
                    {id:2,hh:[0,2,4,6,8,10,12,14],sd:[4,12],bd:[0]}, 
                    {id:3,hh:[0,2,4,6,8,10,12,14],sd:[4,12],bd:[2]}, 
                    {id:4,hh:[0,2,4,6,8,10,12,14],sd:[4,12],bd:[4]}, 
                    {id:5,hh:[0,2,4,6,8,10,12,14],sd:[4,12],bd:[6]}, 
                    {id:6,hh:[0,2,4,6,8,10,12,14],sd:[4,12],bd:[0,2]}, 
                    {id:7,hh:[0,2,4,6,8,10,12,14],sd:[4,12],bd:[0,6]}, 
                    {id:8,hh:[0,2,4,6,8,10,12,14],sd:[4,12],bd:[0,4]}, 
                    {id:9,hh:[0,2,4,6,8,10,12,14],sd:[4,12],bd:[2,6]} 
                ],
                // [수정됨] 16 Beat 스네어 위치 변경 (기존 [2,6] -> [4])
                "16": [ 
                    {id:1,hh:[0,1,2,3,4,5,6,7],sd:[4],bd:[]}, 
                    {id:2,hh:[0,1,2,3,4,5,6,7],sd:[4],bd:[0]}, 
                    {id:3,hh:[0,1,2,3,4,5,6,7],sd:[4],bd:[2]}, 
                    {id:4,hh:[0,1,2,3,4,5,6,7],sd:[4],bd:[4]}, 
                    {id:5,hh:[0,1,2,3,4,5,6,7],sd:[4],bd:[6]}, 
                    {id:6,hh:[0,1,2,3,4,5,6,7],sd:[4],bd:[0,2]}, 
                    {id:7,hh:[0,1,2,3,4,5,6,7],sd:[4],bd:[0,6]}, 
                    {id:8,hh:[0,1,2,3,4,5,6,7],sd:[4],bd:[0,4]}, 
                    {id:9,hh:[0,1,2,3,4,5,6,7],sd:[4],bd:[2,6]} 
                ]
            }
        },
        rhythmear: { id: "rhythmear", title: "Rhythm Ear Training", defaultBpm: 60 }
    }
};