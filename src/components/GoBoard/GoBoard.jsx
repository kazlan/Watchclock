import { useState, useEffect, useCallback, useRef } from 'react';
import './GoBoard.css';

// ─── Constants ───────────────────────────────────────────────────────────────
const SIZE = 9;
const TOTAL = SIZE * SIZE;
const STAR_POINTS = new Set([20, 24, 56, 60, 40]); // (2,2),(2,6),(6,2),(6,6),(4,4)
const AI_DELAY = 600;
const GAME_KEY = 'go_game_state';
const SKILL_KEY = 'go_ai_skill';

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

/** Area scoring: returns { black, white } territory + stones */
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

    const blackStones = board.filter(c => c === 'black').length;
    const whiteStones = board.filter(c => c === 'white').length;

    return {
        black: blackStones + territory.black + (captures.black || 0),
        white: whiteStones + territory.white + (captures.white || 0),
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

function pickAIMove(board, prevBoard, skillLevel) {
    const color = 'white';
    const opponent = 'black';
    const legalMoves = getAllLegalMoves(board, color, prevBoard);
    if (legalMoves.length === 0) return null; // pass

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

    // Expert: pass if significantly behind
    if (skillLevel > 80) {
        const scores = computeScore(board, { black: 0, white: 0 });
        if (scores.white < scores.black - 15 && Math.random() < 0.3) return null;
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
        moveCount: 0,
    };
}

function loadState() {
    try {
        const raw = localStorage.getItem(GAME_KEY);
        if (raw) return JSON.parse(raw);
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function GoBoard({ onClose, isActive }) {
    const [state, setState] = useState(loadState);
    const [skillLevel, setSkillLevel] = useState(loadSkill);
    const [hoverPos, setHoverPos] = useState(null);
    const [aiThinking, setAiThinking] = useState(false);
    const aiTimerRef = useRef(null);

    const { board, currentPlayer, captures, consecutivePasses, previousBoard, gameOver, scores, moveCount } = state;

    // Persist state
    useEffect(() => { saveState(state); }, [state]);
    useEffect(() => { saveSkill(skillLevel); }, [skillLevel]);

    // Trigger AI move
    useEffect(() => {
        if (!isActive || gameOver || currentPlayer !== 'white' || aiThinking) return;

        setAiThinking(true);
        aiTimerRef.current = setTimeout(() => {
            setState(prev => {
                if (prev.gameOver || prev.currentPlayer !== 'white') return prev;

                const aiMove = pickAIMove(prev.board, prev.previousBoard, skillLevel);

                if (aiMove === null) {
                    // AI passes
                    const newPasses = prev.consecutivePasses + 1;
                    if (newPasses >= 2) {
                        const finalScores = computeScore(prev.board, prev.captures);
                        return { ...prev, consecutivePasses: newPasses, gameOver: true, scores: finalScores };
                    }
                    return { ...prev, currentPlayer: 'black', consecutivePasses: newPasses, moveCount: prev.moveCount + 1 };
                }

                const newBoard = applyMove(prev.board, aiMove, 'white', prev.previousBoard);
                if (!newBoard) return prev;

                const capturedCount = countCaptures(prev.board, aiMove, 'white');
                return {
                    ...prev,
                    board: newBoard,
                    previousBoard: [...prev.board],
                    currentPlayer: 'black',
                    captures: { ...prev.captures, white: prev.captures.white + capturedCount },
                    consecutivePasses: 0,
                    moveCount: prev.moveCount + 1,
                };
            });
            setAiThinking(false);
        }, AI_DELAY);

        return () => {
            clearTimeout(aiTimerRef.current);
            setAiThinking(false);
        };
    }, [isActive, currentPlayer, gameOver, skillLevel]);

    const handleClick = useCallback((pos) => {
        if (gameOver || currentPlayer !== 'black' || aiThinking) return;

        const newBoard = applyMove(board, pos, 'black', previousBoard);
        if (!newBoard) return;

        const capturedCount = countCaptures(board, pos, 'black');
        const newPasses = 0;

        setState(prev => ({
            ...prev,
            board: newBoard,
            previousBoard: [...prev.board],
            currentPlayer: 'white',
            captures: { ...prev.captures, black: prev.captures.black + capturedCount },
            consecutivePasses: newPasses,
            moveCount: prev.moveCount + 1,
        }));
    }, [board, currentPlayer, gameOver, previousBoard, aiThinking]);

    const handlePass = useCallback(() => {
        if (gameOver || currentPlayer !== 'black' || aiThinking) return;

        setState(prev => {
            const newPasses = prev.consecutivePasses + 1;
            if (newPasses >= 2) {
                const finalScores = computeScore(prev.board, prev.captures);
                const newSkill = finalScores.black > finalScores.white
                    ? Math.min(100, skillLevel + 5)
                    : Math.max(0, skillLevel - 3);
                saveSkill(newSkill);
                setSkillLevel(newSkill);
                return { ...prev, consecutivePasses: newPasses, gameOver: true, scores: finalScores };
            }
            return { ...prev, currentPlayer: 'white', consecutivePasses: newPasses, moveCount: prev.moveCount + 1 };
        });
    }, [gameOver, currentPlayer, aiThinking, skillLevel]);

    // Adjust skill after game ends via AI pass completing the game
    useEffect(() => {
        if (gameOver && scores) {
            const newSkill = scores.black > scores.white
                ? Math.min(100, skillLevel + 5)
                : Math.max(0, skillLevel - 3);
            if (newSkill !== skillLevel) {
                saveSkill(newSkill);
                setSkillLevel(newSkill);
            }
        }
    }, [gameOver]);

    const handleNewGame = useCallback(() => {
        clearTimeout(aiTimerRef.current);
        setAiThinking(false);
        const fresh = freshState();
        setState(fresh);
        saveState(fresh);
    }, []);

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
    const isValidHover = hoverPos !== null && board[hoverPos] === null && !gameOver && currentPlayer === 'black' && !aiThinking
        && applyMove(board, hoverPos, 'black', previousBoard) !== null;

    const winner = scores ? (scores.black > scores.white ? 'Black' : scores.white > scores.black ? 'White' : 'Draw') : null;

    if (!isActive) return null;

    return (
        <div className="goboard-container">
            {/* Top Bar */}
            <div className="goboard-topbar">
                <div className="goboard-title-group">
                    <span className="goboard-title">围棋 · Go</span>
                    <span className="goboard-skill">AI Lv. {skillLevel}</span>
                </div>
                <div className="goboard-topbar-actions">
                    {!gameOver && <button className="goboard-btn goboard-new" onClick={handleNewGame}>New</button>}
                    <button className="goboard-btn goboard-close" onClick={onClose} aria-label="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Status bar */}
            <div className="goboard-status">
                {gameOver ? (
                    <span className="goboard-gameover">
                        Game Over · {winner === 'Draw' ? 'Draw!' : `${winner} wins!`}
                    </span>
                ) : aiThinking ? (
                    <span className="goboard-thinking"><span className="thinking-dots" /><span> AI thinking…</span></span>
                ) : (
                    <span className={`goboard-turn ${currentPlayer}`}>
                        {currentPlayer === 'black' ? '\u23ef Your turn' : '\u25cb White\u2019s turn'}
                    </span>
                )}
            </div>

            {/* SVG Board */}
            <div className="goboard-board-wrap">
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
                                style={{ cursor: board[i] === null && !gameOver && currentPlayer === 'black' && !aiThinking ? 'pointer' : 'default' }}
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

            {/* Score panel */}
            <div className="goboard-scores">
                <div className="goboard-score-item black-score">
                    <span className="score-stone">⬤</span>
                    <span className="score-label">Black</span>
                    <span className="score-val">{scores ? scores.black.toFixed(0) : `${captures.black} cap`}</span>
                </div>
                <div className="goboard-score-divider" />
                <div className="goboard-score-item white-score">
                    <span className="score-stone">◯</span>
                    <span className="score-label">White</span>
                    <span className="score-val">{scores ? scores.white.toFixed(0) : `${captures.white} cap`}</span>
                </div>
            </div>

            {/* Action row */}
            <div className="goboard-actions">
                {gameOver ? (
                    <button className="goboard-btn goboard-primary" onClick={handleNewGame}>Play Again</button>
                ) : (
                    <button
                        className="goboard-btn goboard-pass"
                        onClick={handlePass}
                        disabled={currentPlayer !== 'black' || aiThinking}
                    >
                        Pass Turn
                    </button>
                )}
            </div>
        </div>
    );
}
