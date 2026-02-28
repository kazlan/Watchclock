import { useState, useEffect, useCallback, useRef } from 'react';
import './GoBoard.css';

// ─── Constants ───────────────────────────────────────────────────────────────
const SIZE = 9;
const TOTAL = SIZE * SIZE;
const STAR_POINTS = new Set([20, 24, 56, 60, 40]); // (2,2),(2,6),(6,2),(6,6),(4,4)
const AI_DELAY = 600;
const KOMI = 6.5; // Japanese rules compensation for White
const GAME_KEY = 'go_game_state';
const SKILL_KEY = 'go_ai_skill';
const PLAYER_SKILL_KEY = 'go_player_skill';
const COLOR_KEY = 'go_human_color';
const HISTORY_KEY = 'go_match_history';
const SOUND_KEY = 'go_sound_enabled';

// ─── Sound Effects (Web Audio API) ────────────────────────────────────────────
let _audioCtx = null;
function getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
}

function playStoneSound() {
    try {
        if (typeof window._goSoundEnabled !== 'undefined' && !window._goSoundEnabled) return;
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    } catch (_) { }
}

function playCaptureSound() {
    try {
        if (typeof window._goSoundEnabled !== 'undefined' && !window._goSoundEnabled) return;
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    } catch (_) { }
}

function playGameOverSound() {
    try {
        if (typeof window._goSoundEnabled !== 'undefined' && !window._goSoundEnabled) return;
        const ctx = getAudioCtx();
        [0, 0.12, 0.24].forEach((delay, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime([523, 659, 784][i], ctx.currentTime + delay);
            gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
            osc.connect(gain).connect(ctx.destination);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.3);
        });
    } catch (_) { }
}

// ─── Pure Go Logic ────────────────────────────────────────────────────────────

function idx(r, c) { return r * SIZE + c; }
function rc(i) { return [Math.floor(i / SIZE), i % SIZE]; }

function neighbors(i) {
    const [r, c] = rc(i);
    const ns = [];
    if (r > 0) ns.push(idx(r - 1, c));
    if (r < SIZE - 1) ns.push(idx(r + 1, c));
    if (c > 0) ns.push(idx(r, c - 1));
    if (c < SIZE - 1) ns.push(idx(r, c + 1));
    return ns;
}

/** Flood-fill to find a group and its liberty count */
function getGroupAndLiberties(board, start) {
    const color = board[start];
    if (!color) return null;
    const group = new Set();
    const liberties = new Set();
    const queue = [start];
    while (queue.length) {
        const cur = queue.pop();
        if (group.has(cur)) continue;
        group.add(cur);
        for (const n of neighbors(cur)) {
            if (board[n] === null) liberties.add(n);
            else if (board[n] === color && !group.has(n)) queue.push(n);
        }
    }
    return { group, liberties };
}

/** Apply a move: returns new board after captures, or null if illegal */
function applyMove(board, pos, color, prevBoard) {
    if (board[pos] !== null) return null;

    const newBoard = [...board];
    newBoard[pos] = color;
    const opponent = color === 'black' ? 'white' : 'black';

    // Remove opponent groups with 0 liberties
    const visited = new Set();
    for (const n of neighbors(pos)) {
        if (newBoard[n] === opponent && !visited.has(n)) {
            const { group, liberties } = getGroupAndLiberties(newBoard, n);
            group.forEach(i => visited.add(i));
            if (liberties.size === 0) {
                group.forEach(i => { newBoard[i] = null; });
            }
        }
    }

    // Suicide check: placed group must have liberties
    const { liberties: ownLibs } = getGroupAndLiberties(newBoard, pos);
    if (ownLibs.size === 0) return null;

    // Ko check
    if (prevBoard && newBoard.join('') === prevBoard.join('')) return null;

    return newBoard;
}

/** Count captures made by placing at pos */
function countCaptures(board, pos, color) {
    if (board[pos] !== null) return 0;
    const newBoard = [...board];
    newBoard[pos] = color;
    const opponent = color === 'black' ? 'white' : 'black';
    let captured = 0;
    const visited = new Set();
    for (const n of neighbors(pos)) {
        if (newBoard[n] === opponent && !visited.has(n)) {
            const { group, liberties } = getGroupAndLiberties(newBoard, n);
            group.forEach(i => visited.add(i));
            if (liberties.size === 0) captured += group.size;
        }
    }
    return captured;
}

/** Japanese scoring: territory + prisoners (captures). Komi added to White. */
function computeScore(board, captures) {
    const territory = { black: 0, white: 0 };
    const visited = new Set();

    for (let i = 0; i < TOTAL; i++) {
        if (board[i] !== null || visited.has(i)) continue;

        // Flood fill empty region
        const region = new Set();
        const border = new Set();
        const queue = [i];
        while (queue.length) {
            const cur = queue.pop();
            if (region.has(cur)) continue;
            region.add(cur);
            visited.add(cur);
            for (const n of neighbors(cur)) {
                if (board[n] === null && !region.has(n)) queue.push(n);
                else if (board[n] !== null) border.add(board[n]);
            }
        }

        if (border.size === 1) {
            const owner = [...border][0];
            territory[owner] += region.size;
        }
    }

    return {
        black: territory.black + (captures.black || 0),
        white: territory.white + (captures.white || 0) + KOMI,
    };
}

// ─── AI Logic ────────────────────────────────────────────────────────────────

function getAllLegalMoves(board, color, prevBoard) {
    const moves = [];
    for (let i = 0; i < TOTAL; i++) {
        if (applyMove(board, i, color, prevBoard) !== null) moves.push(i);
    }
    return moves;
}

function getLibertyCount(board, pos) {
    if (board[pos] === null) return 0;
    return getGroupAndLiberties(board, pos).liberties.size;
}

function getTotalLiberties(board, color) {
    const visited = new Set();
    let total = 0;
    for (let i = 0; i < TOTAL; i++) {
        if (board[i] === color && !visited.has(i)) {
            const { group, liberties } = getGroupAndLiberties(board, i);
            group.forEach(j => visited.add(j));
            total += liberties.size;
        }
    }
    return total;
}

function pickAIMove(board, prevBoard, skillLevel, color = 'white') {
    const opponent = color === 'white' ? 'black' : 'white';
    const legalMoves = getAllLegalMoves(board, color, prevBoard);
    if (legalMoves.length === 0) return null; // pass

    const stonesOnBoard = board.filter(s => s !== null).length;

    // ── Opening Book (skill > 20, first ~6 stones) ──
    // Key points on a 9x9 board (row, col) -> idx
    //   Tengen (4,4)=40     3-3 corners: (2,2)=20, (2,6)=24, (6,2)=56, (6,6)=60
    //   4-4 corners: (3,3)=30, (3,5)=32, (5,3)=48, (5,5)=50
    //   Side: (2,4)=22, (4,2)=38, (4,6)=42, (6,4)=58
    if (skillLevel > 20 && stonesOnBoard < 6) {
        // Priority openings: Tengen first, then corners, then sides
        const openingPriority = skillLevel > 50
            ? [40, 30, 50, 32, 48, 20, 24, 56, 60, 22, 38, 42, 58]
            : [40, 20, 24, 56, 60, 30, 50, 32, 48];

        // Pick the first available opening position
        for (const pos of openingPriority) {
            if (board[pos] === null && applyMove(board, pos, color, prevBoard)) {
                // Add slight randomness: 80% chance to use book, 20% skip
                if (Math.random() < 0.8) return pos;
                break;
            }
        }
    }

    // ── Beginner (0–20): random ──
    if (skillLevel <= 20) {
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    // Tactical scoring helper
    function scoreMove(pos) {
        let score = 0;
        const newBoard = applyMove(board, pos, color, prevBoard);
        if (!newBoard) return -Infinity;

        // Captures
        const caps = countCaptures(board, pos, color);
        score += caps * 10;

        // Save own atari groups
        for (const n of neighbors(pos)) {
            if (board[n] === color) {
                const { liberties } = getGroupAndLiberties(board, n);
                if (liberties.size === 1) score += 8;
            }
        }

        // Opponent groups in atari after move
        for (const n of neighbors(pos)) {
            if (newBoard[n] === opponent) {
                const { liberties } = getGroupAndLiberties(newBoard, n);
                if (liberties.size === 1) score += 6;
            }
        }

        // Liberty count of placed stone
        const { liberties: ownLibs } = getGroupAndLiberties(newBoard, pos);
        score += ownLibs.size;

        // Expert: influence heuristic
        if (skillLevel > 80) {
            const myLibs = getTotalLiberties(newBoard, color);
            const theirLibs = getTotalLiberties(newBoard, opponent);
            score += (myLibs - theirLibs) * 0.3;
        }

        // Slight randomization to avoid purely deterministic play
        score += Math.random() * 0.5;

        return score;
    }

    // ── Intermediate (21–50): 60% tactical, 40% random ──
    if (skillLevel <= 50) {
        if (Math.random() < 0.4) {
            return legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }
    }

    // Score all legal moves and pick best
    let best = -Infinity;
    let bestMove = legalMoves[0];
    for (const pos of legalMoves) {
        const s = scoreMove(pos);
        if (s > best) { best = s; bestMove = pos; }
    }

    // Expert: pass or resign if significantly behind
    if (skillLevel > 80) {
        // AI considers resigning only if game is somewhat advanced (e.g., > 30 moves total approximation)
        const stonesOnBoard = board.filter(s => s !== null).length;
        if (stonesOnBoard > 30) {
            const scores = computeScore(board, { black: 0, white: 0 });
            const myScore = scores[color];
            const oppScore = scores[opponent];

            if (myScore < oppScore - 25 && Math.random() < 0.6) {
                return 'resign';
            } else if (myScore < oppScore - 15 && Math.random() < 0.3) {
                return null; // pass
            }
        }
    }

    return bestMove;
}

// ─── Initial / Persisted State ────────────────────────────────────────────────

function freshState() {
    return {
        board: Array(TOTAL).fill(null),
        currentPlayer: 'black',
        captures: { black: 0, white: 0 },
        consecutivePasses: 0,
        previousBoard: null,
        gameOver: false,
        scores: null,
        resignedBy: null,
        moveCount: 0,
        moveHistory: [],
    };
}

function loadState() {
    try {
        const raw = localStorage.getItem(GAME_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...freshState(), ...parsed };
        }
    } catch (_) { }
    return freshState();
}

function saveState(state) {
    try { localStorage.setItem(GAME_KEY, JSON.stringify(state)); } catch (_) { }
}

function loadSkill() {
    try {
        const v = localStorage.getItem(SKILL_KEY);
        if (v !== null) return Math.max(0, Math.min(100, parseInt(v, 10)));
    } catch (_) { }
    return 0;
}

function saveSkill(v) {
    try { localStorage.setItem(SKILL_KEY, String(v)); } catch (_) { }
}

function loadPlayerSkill() {
    try {
        const v = localStorage.getItem(PLAYER_SKILL_KEY);
        if (v !== null) return Math.max(0, Math.min(100, parseInt(v, 10)));
    } catch (_) { }
    return 30; // Default player skill is slightly higher than 0
}

function savePlayerSkill(v) {
    try { localStorage.setItem(PLAYER_SKILL_KEY, String(v)); } catch (_) { }
}

function loadHumanColor() {
    try {
        const v = localStorage.getItem(COLOR_KEY);
        if (v === 'black' || v === 'white') return v;
    } catch (_) { }
    return 'black';
}

function saveHumanColor(v) {
    try { localStorage.setItem(COLOR_KEY, v); } catch (_) { }
}

function loadMatchHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) { }
    return [];
}

function saveMatchHistory(h) {
    try {
        // Keep last 50 matches max
        localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-50)));
    } catch (_) { }
}

function getGoRank(skill) {
    // Mapping 0-100 to traditional ranks:
    // 0-60 -> 30k to 1k (1 rank per 2 points)
    // 61-81 -> 1d to 7d (1 rank per 3 points)
    // 82-100 -> 1p to 9p (1 rank per 2 points approx)
    if (skill <= 60) {
        const kyu = 30 - Math.floor(skill / 2);
        return `${Math.max(1, kyu)}k`;
    }
    if (skill <= 81) {
        const dan = 1 + Math.floor((skill - 61) / 3);
        return `${Math.min(7, dan)}d`;
    }
    const pro = 1 + Math.floor((skill - 82) / 2);
    return `${Math.min(9, pro)}p`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GoBoard({ onClose, isActive }) {
    const [state, setState] = useState(loadState);
    const [skillLevel, setSkillLevel] = useState(loadSkill);
    const [playerSkill, setPlayerSkill] = useState(loadPlayerSkill);
    const [humanColor, setHumanColor] = useState(loadHumanColor);
    const [showNewGameModal, setShowNewGameModal] = useState(false);
    const [matchHistory, setMatchHistory] = useState(loadMatchHistory);
    const [soundEnabled, setSoundEnabled] = useState(() => {
        try { const v = localStorage.getItem(SOUND_KEY); return v !== 'false'; } catch (_) { return true; }
    });
    const [hoverPos, setHoverPos] = useState(null);
    const [aiThinking, setAiThinking] = useState(false);
    const aiTimerRef = useRef(null);

    // Sync sound state to global flag
    useEffect(() => {
        window._goSoundEnabled = soundEnabled;
        try { localStorage.setItem(SOUND_KEY, String(soundEnabled)); } catch (_) { }
    }, [soundEnabled]);

    const { board, currentPlayer, captures, consecutivePasses, previousBoard, gameOver, scores, moveCount } = state;
    const aiColor = humanColor === 'black' ? 'white' : 'black';

    // Persist state
    useEffect(() => { saveState(state); }, [state]);
    useEffect(() => { saveSkill(skillLevel); }, [skillLevel]);
    useEffect(() => { savePlayerSkill(playerSkill); }, [playerSkill]);
    useEffect(() => { saveHumanColor(humanColor); }, [humanColor]);

    // Trigger AI move
    useEffect(() => {
        if (!isActive || gameOver || currentPlayer !== aiColor || aiThinking) return;

        setAiThinking(true);
        aiTimerRef.current = setTimeout(() => {
            setState(prev => {
                if (prev.gameOver || prev.currentPlayer !== aiColor) return prev;

                const aiMove = pickAIMove(prev.board, prev.previousBoard, skillLevel, aiColor);

                if (aiMove === 'resign') {
                    const finalScores = computeScore(prev.board, prev.captures);
                    return { ...prev, gameOver: true, scores: finalScores, resignedBy: aiColor, moveHistory: [...prev.moveHistory, { color: aiColor, resign: true }] };
                }

                if (aiMove === null) {
                    // AI passes
                    const newPasses = prev.consecutivePasses + 1;
                    if (newPasses >= 2) {
                        const finalScores = computeScore(prev.board, prev.captures);
                        return { ...prev, consecutivePasses: newPasses, gameOver: true, scores: finalScores, moveHistory: [...prev.moveHistory, { color: aiColor, pass: true }] };
                    }
                    return { ...prev, currentPlayer: humanColor, consecutivePasses: newPasses, moveCount: prev.moveCount + 1, moveHistory: [...prev.moveHistory, { color: aiColor, pass: true }] };
                }

                const newBoard = applyMove(prev.board, aiMove, aiColor, prev.previousBoard);
                if (!newBoard) return prev;

                const capturedCount = countCaptures(prev.board, aiMove, aiColor);
                if (capturedCount > 0) playCaptureSound();
                else playStoneSound();
                return {
                    ...prev,
                    board: newBoard,
                    previousBoard: [...prev.board],
                    currentPlayer: humanColor,
                    captures: { ...prev.captures, [aiColor]: prev.captures[aiColor] + capturedCount },
                    consecutivePasses: 0,
                    moveCount: prev.moveCount + 1,
                    moveHistory: [...prev.moveHistory, { color: aiColor, pos: aiMove }],
                };
            });
            setAiThinking(false);
        }, AI_DELAY);

        return () => {
            clearTimeout(aiTimerRef.current);
            setAiThinking(false);
        };
    }, [isActive, currentPlayer, gameOver, skillLevel, humanColor, aiColor]);

    const handleClick = useCallback((pos) => {
        if (gameOver || currentPlayer !== humanColor || aiThinking) return;

        const newBoard = applyMove(board, pos, humanColor, previousBoard);
        if (!newBoard) return;

        const capturedCount = countCaptures(board, pos, humanColor);
        if (capturedCount > 0) playCaptureSound();
        else playStoneSound();
        const newPasses = 0;

        setState(prev => ({
            ...prev,
            board: newBoard,
            previousBoard: [...prev.board],
            currentPlayer: aiColor,
            captures: { ...prev.captures, [humanColor]: prev.captures[humanColor] + capturedCount },
            consecutivePasses: newPasses,
            moveCount: prev.moveCount + 1,
            moveHistory: [...prev.moveHistory, { color: humanColor, pos }],
        }));
    }, [board, currentPlayer, gameOver, previousBoard, aiThinking, humanColor, aiColor]);

    const handlePass = useCallback(() => {
        if (gameOver || currentPlayer !== humanColor || aiThinking) return;

        setState(prev => {
            const newPasses = prev.consecutivePasses + 1;
            if (newPasses >= 2) {
                const finalScores = computeScore(prev.board, prev.captures);
                const playerWon = finalScores[humanColor] > finalScores[aiColor];
                const newSkill = playerWon
                    ? Math.min(100, skillLevel + 5)
                    : Math.max(0, skillLevel - 3);
                saveSkill(newSkill);
                setSkillLevel(newSkill);
                return { ...prev, consecutivePasses: newPasses, gameOver: true, scores: finalScores, moveHistory: [...prev.moveHistory, { color: prev.currentPlayer, pass: true }] };
            }
            return { ...prev, currentPlayer: aiColor, consecutivePasses: newPasses, moveCount: prev.moveCount + 1, moveHistory: [...prev.moveHistory, { color: prev.currentPlayer, pass: true }] };
        });
    }, [gameOver, currentPlayer, aiThinking, skillLevel, humanColor, aiColor]);

    const handleResign = useCallback(() => {
        if (gameOver || currentPlayer !== humanColor || aiThinking) return;

        setState(prev => {
            const finalScores = computeScore(prev.board, prev.captures);
            return {
                ...prev,
                gameOver: true,
                scores: finalScores,
                resignedBy: humanColor,
                moveHistory: [...prev.moveHistory, { color: humanColor, resign: true }]
            };
        });
    }, [gameOver, currentPlayer, aiThinking, humanColor]);

    // Adjust skill after game ends
    useEffect(() => {
        if (gameOver && scores) {
            playGameOverSound();
            let playerWon = false;

            if (state.resignedBy) {
                playerWon = state.resignedBy === aiColor;
            } else {
                playerWon = scores[humanColor] > scores[aiColor];
            }

            // AI adjustment
            const newSkill = playerWon
                ? Math.min(100, skillLevel + 5)
                : Math.max(0, skillLevel - 3);
            if (newSkill !== skillLevel) {
                saveSkill(newSkill);
                setSkillLevel(newSkill);
            }

            // Player adjustment
            const newPSkill = playerWon
                ? Math.min(100, playerSkill + 4)
                : Math.max(0, playerSkill - 2);
            if (newPSkill !== playerSkill) {
                savePlayerSkill(newPSkill);
                setPlayerSkill(newPSkill);
            }

            // Record match result
            const result = state.resignedBy
                ? (state.resignedBy === humanColor ? 'loss' : 'win')
                : (playerWon ? 'win' : (scores[humanColor] === scores[aiColor] ? 'draw' : 'loss'));
            const entry = {
                date: new Date().toISOString().split('T')[0],
                color: humanColor,
                result,
                playerRank: getGoRank(playerSkill),
                aiRank: getGoRank(skillLevel),
                moves: (state.moveHistory || []).length,
            };
            const updated = [...matchHistory, entry];
            setMatchHistory(updated);
            saveMatchHistory(updated);
        }
    }, [gameOver]);

    // Replay a moveHistory to reconstruct a full game state
    function replayMoves(history) {
        let s = freshState();
        for (const move of history) {
            if (move.pass) {
                s.consecutivePasses += 1;
                s.currentPlayer = s.currentPlayer === 'black' ? 'white' : 'black';
                s.moveCount += 1;
            } else if (move.resign) {
                // shouldn't be replayed, but guard
                break;
            } else {
                const newBoard = applyMove(s.board, move.pos, move.color, s.previousBoard);
                if (newBoard) {
                    const captured = countCaptures(s.board, move.pos, move.color);
                    s.previousBoard = [...s.board];
                    s.board = newBoard;
                    s.captures[move.color] += captured;
                    s.consecutivePasses = 0;
                    s.currentPlayer = s.currentPlayer === 'black' ? 'white' : 'black';
                    s.moveCount += 1;
                }
            }
        }
        s.moveHistory = history;
        return s;
    }

    const handleUndo = useCallback(() => {
        if (gameOver || aiThinking) return;
        const history = state.moveHistory;
        if (history.length === 0) return;

        // Undo back to the human's previous turn: remove last 2 moves (AI + human)
        // If it's currently the human's turn, undo the last AI move + the human move before it
        let stepsBack = currentPlayer === humanColor ? 2 : 1;
        stepsBack = Math.min(stepsBack, history.length);

        const newHistory = history.slice(0, -stepsBack);
        const rebuilt = replayMoves(newHistory);
        setState(rebuilt);
        saveState(rebuilt);
    }, [gameOver, aiThinking, state.moveHistory, currentPlayer, humanColor]);

    const handleNewGameClick = useCallback(() => {
        setShowNewGameModal(true);
    }, []);

    const handleStartGame = useCallback((color) => {
        setHumanColor(color);
        saveHumanColor(color);
        clearTimeout(aiTimerRef.current);
        setAiThinking(false);
        const fresh = freshState();
        setState(fresh);
        saveState(fresh);
        setShowNewGameModal(false);
    }, []);

    const handleExportSGF = useCallback(() => {
        const letters = "abcdefghijklmnopqrstuvwxyz";
        const dateStr = new Date().toISOString().split('T')[0];

        let sgf = `(;FF[4]GM[1]SZ[${SIZE}]KM[${KOMI}]RU[Japanese]`;
        if (humanColor === 'black') {
            sgf += `PW[Watchclock AI]PB[Human]WR[${getGoRank(skillLevel)}]BR[${getGoRank(playerSkill)}]DT[${dateStr}]`;
        } else {
            sgf += `PB[Watchclock AI]PW[Human]BR[${getGoRank(skillLevel)}]WR[${getGoRank(playerSkill)}]DT[${dateStr}]`;
        }
        if (gameOver) {
            let resultStr = 'Draw';
            if (state.resignedBy) {
                const winner = state.resignedBy === 'black' ? 'W' : 'B';
                resultStr = `${winner}+R`;
            } else if (scores) {
                const diff = Math.abs(scores.black - scores.white);
                const winner = scores.black > scores.white ? 'B' : scores.white > scores.black ? 'W' : 'Draw';
                resultStr = winner === 'Draw' ? 'Draw' : `${winner}+${diff.toFixed(1)}`;
            }
            sgf += `RE[${resultStr}]`;
        }
        sgf += '\n';

        state.moveHistory.forEach(move => {
            const colorCode = move.color === 'black' ? 'B' : 'W';
            if (move.resign) {
                // SGF doesn't strictly log the resign turn as a coordinate, but we can stop.
                // The RE[] tag already dictates the result.
            } else if (move.pass) {
                sgf += `;${colorCode}[]`;
            } else {
                const [r, c] = rc(move.pos);
                sgf += `;${colorCode}[${letters[c]}${letters[r]}]`;
            }
        });
        sgf += ')';

        const blob = new Blob([sgf], { type: 'application/x-go-sgf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `watchclock_go_${dateStr}.sgf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [state.moveHistory, skillLevel, gameOver, scores]);

    // Find last placed stone
    const lastMove = useRef(null);
    useEffect(() => {
        if (moveCount > 0) {
            // Track last placed stone by diffing previous board — simplified: track via moveCount
        }
    }, [board]);

    // SVG Board rendering
    const CELL = 28;
    const PADDING = 20;
    const BOARD_PX = (SIZE - 1) * CELL + PADDING * 2;

    const svgCoord = (i) => {
        const [r, c] = rc(i);
        return [PADDING + c * CELL, PADDING + r * CELL];
    };

    // Determine ghost stone validity
    const isValidHover = hoverPos !== null && board[hoverPos] === null && !gameOver && currentPlayer === humanColor && !aiThinking
        && applyMove(board, hoverPos, humanColor, previousBoard) !== null;

    const winner = state.resignedBy
        ? (state.resignedBy === 'black' ? 'White (Resignation)' : 'Black (Resignation)')
        : (scores ? (scores.black > scores.white ? 'Black' : scores.white > scores.black ? 'White' : 'Draw') : null);

    if (!isActive) return null;

    return (
        <div className="goboard-container">
            {/* Board Column (Left) */}
            <div className="goboard-board-wrap">
                {/* Status indicator above the board */}
                <div className="goboard-status goboard-status-top">
                    {gameOver ? (
                        <span className="goboard-gameover">
                            Game Over · {winner === 'Draw' ? 'Draw!' : `${winner} wins!`}
                        </span>
                    ) : aiThinking ? (
                        <span className="goboard-thinking"><span className="thinking-dots" /><span> AI thinking…</span></span>
                    ) : (
                        <span className={`goboard-turn ${currentPlayer}`}>
                            {currentPlayer === humanColor ? '\u23ef Your turn' : `\u25cb AI's turn`}
                        </span>
                    )}
                </div>
                <svg
                    className="goboard-svg"
                    viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`}
                    preserveAspectRatio="xMidYMid meet"
                    onMouseLeave={() => setHoverPos(null)}
                >
                    {/* Wood background */}
                    <defs>
                        <linearGradient id="wood" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#c8a96e" />
                            <stop offset="50%" stopColor="#b8945a" />
                            <stop offset="100%" stopColor="#a07850" />
                        </linearGradient>
                        <filter id="stone-shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="1" dy="1.5" stdDeviation="1.5" floodOpacity="0.4" />
                        </filter>
                    </defs>
                    <rect x="0" y="0" width={BOARD_PX} height={BOARD_PX} rx="6" fill="url(#wood)" />

                    {/* Grid lines */}
                    {Array.from({ length: SIZE }, (_, i) => (
                        <g key={i}>
                            <line
                                x1={PADDING + i * CELL} y1={PADDING}
                                x2={PADDING + i * CELL} y2={PADDING + (SIZE - 1) * CELL}
                                stroke="#7a5c2e" strokeWidth="0.8" opacity="0.8"
                            />
                            <line
                                x1={PADDING} y1={PADDING + i * CELL}
                                x2={PADDING + (SIZE - 1) * CELL} y2={PADDING + i * CELL}
                                stroke="#7a5c2e" strokeWidth="0.8" opacity="0.8"
                            />
                        </g>
                    ))}

                    {/* Star points */}
                    {[...STAR_POINTS].map(i => {
                        const [x, y] = svgCoord(i);
                        return <circle key={i} cx={x} cy={y} r="2.5" fill="#7a5c2e" opacity="0.9" />;
                    })}

                    {/* Invisible hover targets */}
                    {Array.from({ length: TOTAL }, (_, i) => {
                        const [x, y] = svgCoord(i);
                        return (
                            <rect
                                key={i}
                                x={x - CELL / 2} y={y - CELL / 2}
                                width={CELL} height={CELL}
                                fill="transparent"
                                style={{ cursor: board[i] === null && !gameOver && currentPlayer === humanColor && !aiThinking ? 'pointer' : 'default' }}
                                onMouseEnter={() => setHoverPos(i)}
                                onClick={() => handleClick(i)}
                            />
                        );
                    })}

                    {/* Ghost stone */}
                    {isValidHover && (() => {
                        const [x, y] = svgCoord(hoverPos);
                        return (
                            <circle cx={x} cy={y} r={CELL * 0.43}
                                fill="rgba(0,0,0,0.35)" stroke="rgba(0,0,0,0.5)" strokeWidth="0.8" opacity="0.6"
                            />
                        );
                    })()}

                    {/* Stones */}
                    {board.map((color, i) => {
                        if (!color) return null;
                        const [x, y] = svgCoord(i);
                        const isLast = i === lastMove.current;
                        return (
                            <g key={i} filter="url(#stone-shadow)">
                                <circle
                                    cx={x} cy={y} r={CELL * 0.43}
                                    fill={color === 'black' ? '#1a1a1a' : '#f0ede8'}
                                    stroke={color === 'black' ? '#333' : '#ccc'}
                                    strokeWidth="0.8"
                                />
                                {isLast && (
                                    <circle cx={x} cy={y} r={CELL * 0.12}
                                        fill={color === 'black' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)'}
                                    />
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Sidebar Column (Right) */}
            <div className="goboard-sidebar">
                {/* Top Bar with actions */}
                <div className="goboard-topbar">
                    <div className="goboard-title-group">
                        <span className="goboard-title">围棋 · Go</span>
                        <span className="goboard-skill">AI: {getGoRank(skillLevel)}</span>
                    </div>
                    <div className="goboard-topbar-actions">
                        <button
                            className="goboard-btn goboard-close"
                            onClick={handleExportSGF}
                            disabled={!state.moveHistory || state.moveHistory.length === 0}
                            title="Export SGF"
                            aria-label="Export SGF"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </button>
                        <button
                            className="goboard-btn goboard-close"
                            onClick={() => setSoundEnabled(p => !p)}
                            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                            aria-label="Toggle sound"
                        >
                            {soundEnabled ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <line x1="23" y1="9" x2="17" y2="15"></line>
                                    <line x1="17" y1="9" x2="23" y2="15"></line>
                                </svg>
                            )}
                        </button>
                        <button className="goboard-btn goboard-close" onClick={onClose} aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Vertical spacer pushing everything below to its natural flow */}
                <div className="goboard-sidebar-content">

                    {/* Scores panel */}
                    <div className="goboard-scores">
                        <div className="goboard-score-item black-score">
                            <span className="score-stone">⬤</span>
                            <div className="score-col">
                                <span className="score-label">
                                    Black {humanColor === 'black' ? `(You - ${getGoRank(playerSkill)})` : `(AI - ${getGoRank(skillLevel)})`}
                                </span>
                                <span className="score-val">{scores ? scores.black.toFixed(0) : `${captures.black} cap`}</span>
                            </div>
                        </div>
                        <div className="goboard-score-divider" />
                        <div className="goboard-score-item white-score">
                            <span className="score-stone">◯</span>
                            <div className="score-col">
                                <span className="score-label">
                                    White {humanColor === 'white' ? `(You - ${getGoRank(playerSkill)})` : `(AI - ${getGoRank(skillLevel)})`}
                                </span>
                                <span className="score-val">{scores ? scores.white.toFixed(0) : `${captures.white} cap`}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    {matchHistory.length > 0 && (() => {
                        const wins = matchHistory.filter(m => m.result === 'win').length;
                        const losses = matchHistory.filter(m => m.result === 'loss').length;
                        const draws = matchHistory.filter(m => m.result === 'draw').length;
                        return (
                            <div className="goboard-stats">
                                <span className="score-label">Record: {wins}W / {losses}L / {draws}D</span>
                            </div>
                        );
                    })()}

                    {/* Action row at bottom */}
                    <div className="goboard-actions">
                        {gameOver ? (
                            <button className="goboard-btn goboard-primary" onClick={handleNewGameClick}>Play Again</button>
                        ) : (
                            <>
                                <button className="goboard-btn goboard-new" onClick={handleNewGameClick}>New Game</button>
                                <button
                                    className="goboard-btn goboard-pass"
                                    onClick={handlePass}
                                    disabled={currentPlayer !== humanColor || aiThinking}
                                >
                                    Pass
                                </button>
                                <div className="goboard-row">
                                    <button
                                        className="goboard-btn goboard-pass"
                                        onClick={handleUndo}
                                        disabled={!state.moveHistory || state.moveHistory.length === 0 || aiThinking}
                                    >
                                        ↩ Undo
                                    </button>
                                    <button
                                        className="goboard-btn goboard-resign"
                                        onClick={handleResign}
                                        disabled={currentPlayer !== humanColor || aiThinking}
                                    >
                                        Resign
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* New Game Modal */}
            {showNewGameModal && (
                <div className="goboard-modal-overlay">
                    <div className="goboard-modal">
                        <h3 className="goboard-modal-title">Choose your color</h3>
                        <div className="goboard-modal-buttons">
                            <button className="goboard-color-btn" onClick={() => handleStartGame('black')}>
                                Play as Black ⚫︎
                                <div className="goboard-color-desc">You move first</div>
                            </button>
                            <button className="goboard-color-btn" onClick={() => handleStartGame('white')}>
                                Play as White ⚪︎
                                <div className="goboard-color-desc">AI moves first</div>
                            </button>
                        </div>
                        <button className="goboard-modal-cancel" onClick={() => setShowNewGameModal(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
