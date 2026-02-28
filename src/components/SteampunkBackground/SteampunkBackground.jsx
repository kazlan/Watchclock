import './SteampunkBackground.css';

/**
 * Generates a proper SVG polygon path for a cogwheel gear body.
 */
function cogPath(cx, cy, outerR, innerR, numTeeth) {
  const angleStep = (2 * Math.PI) / numTeeth;
  const toothHalf = angleStep * 0.2;
  let d = '';

  for (let i = 0; i < numTeeth; i++) {
    const baseAngle = i * angleStep - Math.PI / 2;

    const a0 = baseAngle - toothHalf;
    const a1 = baseAngle - toothHalf * 0.5;
    const a2 = baseAngle + toothHalf * 0.5;
    const a3 = baseAngle + toothHalf;

    const pts = [
      [cx + Math.cos(a0) * innerR, cy + Math.sin(a0) * innerR],
      [cx + Math.cos(a1) * outerR, cy + Math.sin(a1) * outerR],
      [cx + Math.cos(a2) * outerR, cy + Math.sin(a2) * outerR],
      [cx + Math.cos(a3) * innerR, cy + Math.sin(a3) * innerR],
    ];

    if (i === 0) d += `M ${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)} `;
    else d += `L ${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)} `;
    d += `L ${pts[1][0].toFixed(2)},${pts[1][1].toFixed(2)} `;
    d += `L ${pts[2][0].toFixed(2)},${pts[2][1].toFixed(2)} `;
    d += `L ${pts[3][0].toFixed(2)},${pts[3][1].toFixed(2)} `;
  }
  d += 'Z';
  return d;
}

const CogwheelSVG = ({ teeth = 12 }) => {
  const outer = 47;
  const inner = 36;
  const holeR = 9;
  const gear = cogPath(50, 50, outer, inner, teeth);

  return (
    <svg viewBox="0 0 100 100" className="steam-cog" fill="none" stroke="currentColor">
      {/* Gear outline */}
      <path d={gear} strokeWidth="1.5" />
      {/* Spoke lines from center to inner ring */}
      {Array.from({ length: teeth }).map((_, i) => {
        const a = (i * 2 * Math.PI) / teeth - Math.PI / 2;
        const x1 = (50 + Math.cos(a) * (holeR + 2)).toFixed(2);
        const y1 = (50 + Math.sin(a) * (holeR + 2)).toFixed(2);
        const x2 = (50 + Math.cos(a) * (inner - 2)).toFixed(2);
        const y2 = (50 + Math.sin(a) * (inner - 2)).toFixed(2);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="0.8" strokeOpacity="0.6" />;
      })}
      {/* Hub rings */}
      <circle cx="50" cy="50" r={holeR + 5} strokeWidth="1.2" />
      <circle cx="50" cy="50" r={holeR} strokeWidth="1" />
    </svg>
  );
};

const COGWHEELS = [
  { id: 1, size: 260, top: '-8%', left: '-8%', duration: '48s', direction: 'normal', opacity: 0.28, teeth: 14 },
  { id: 2, size: 140, top: '18%', left: '10%', duration: '32s', direction: 'reverse', opacity: 0.22, teeth: 10 },
  { id: 3, size: 320, top: '55%', left: '-12%', duration: '55s', direction: 'normal', opacity: 0.24, teeth: 16 },
  { id: 4, size: 110, top: '78%', left: '18%', duration: '22s', direction: 'reverse', opacity: 0.20, teeth: 8 },
  { id: 5, size: 420, top: '-18%', right: '-12%', duration: '65s', direction: 'reverse', opacity: 0.20, teeth: 18 },
  { id: 6, size: 190, top: '28%', right: '8%', duration: '38s', direction: 'normal', opacity: 0.28, teeth: 12 },
  { id: 7, size: 230, bottom: '8%', right: '3%', duration: '46s', direction: 'reverse', opacity: 0.24, teeth: 13 },
  { id: 8, size: 130, bottom: '-4%', right: '28%', duration: '28s', direction: 'normal', opacity: 0.22, teeth: 9 },
  { id: 9, size: 300, top: '42%', left: '38%', duration: '58s', direction: 'normal', opacity: 0.10, teeth: 15 },
];

const SteampunkBackground = () => {
  return (
    <div className="steampunk-bg">
      {COGWHEELS.map((cog) => (
        <div
          key={cog.id}
          className="cog-container"
          style={{
            width: cog.size,
            height: cog.size,
            top: cog.top,
            left: cog.left,
            bottom: cog.bottom,
            right: cog.right,
            opacity: cog.opacity,
            animationDuration: cog.duration,
            animationDirection: cog.direction,
          }}
        >
          <CogwheelSVG teeth={cog.teeth} />
        </div>
      ))}
    </div>
  );
};

export default SteampunkBackground;
