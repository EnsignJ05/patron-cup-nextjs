'use client';

export interface GlobeDestination {
  lat: number;
  lon: number;
  label: string;
}

interface GlobeOrigin {
  lat: number;
  lon: number;
  label: string;
}

interface GlobeAnimationProps {
  size?: number;
  destination?: GlobeDestination;
  origins?: GlobeOrigin[];
  /** Degrees to complete one full rotation */
  rotate?: number;
  showLabels?: boolean;
  /** Orthographic view center — defaults to CONUS center */
  viewLat?: number;
  viewLon?: number;
  /** Zoom factor > 1 enlarges the projected region */
  zoom?: number;
}

const DEFAULT_ORIGINS: GlobeOrigin[] = [
  { lat: 33.4, lon: -112.1, label: 'PHX' },
  { lat: 40.8, lon: -111.9, label: 'SLC' },
  { lat: 41.5, lon:  -81.7, label: 'CLE' },
  { lat: 30.3, lon:  -81.7, label: 'JAX' },
  { lat: 29.8, lon:  -95.4, label: 'HOU' },
];

export const STREAMSONG_DEST: GlobeDestination = { lat: 27.65, lon: -81.85, label: 'STREAMSONG' };
export const BIG_CEDAR_DEST: GlobeDestination  = { lat: 36.65, lon: -93.20, label: 'BIG CEDAR'  };

/** Orthographic projection with lat/lon center and optional zoom. */
function project(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  radius: number,
  zoom: number,
): { x: number; y: number } | null {
  const φ  = (lat  * Math.PI) / 180;
  const λ  = ((lon - centerLon) * Math.PI) / 180;
  const φ0 = (centerLat * Math.PI) / 180;
  const cosC = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ);
  if (cosC < 0) return null;
  return {
    x:  radius * zoom * Math.cos(φ) * Math.sin(λ),
    y: -radius * zoom * (Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ)),
  };
}

export default function GlobeAnimation({
  size       = 240,
  destination = STREAMSONG_DEST,
  origins     = DEFAULT_ORIGINS,
  rotate      = 36,
  showLabels  = true,
  viewLat     = 36,
  viewLon     = -96,
  zoom        = 1.75,
}: GlobeAnimationProps) {
  const r  = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;

  const proj = (lat: number, lon: number) =>
    project(lat, lon, viewLat, viewLon, r, zoom);

  const projOrigins = origins
    .map((o) => {
      const p = proj(o.lat, o.lon);
      return p ? { label: o.label, x: cx + p.x, y: cy + p.y } : null;
    })
    .filter((o): o is { label: string; x: number; y: number } => o !== null);

  const destP = proj(destination.lat, destination.lon);
  const dx = cx + (destP?.x ?? 0);
  const dy = cy + (destP?.y ?? 0);

  const longitudes = [0.25, 0.55, 0.85];
  const latitudes  = [-60, -30, 0, 30, 60];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="pc-globe-fill" cx="35%" cy="30%" r="80%">
          <stop offset="0%"   stopColor="var(--pc-card)"   />
          <stop offset="60%"  stopColor="var(--pc-fill)"   />
          <stop offset="100%" stopColor="var(--pc-fill-2)" />
        </radialGradient>
        <radialGradient id="pc-globe-glow" cx="50%" cy="50%" r="50%">
          <stop offset="50%"  stopColor="rgba(245,158,11,0)"    />
          <stop offset="100%" stopColor="rgba(245,158,11,0.18)" />
        </radialGradient>
        <clipPath id="pc-globe-clip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      <circle cx={cx} cy={cy} r={r + 3} fill="url(#pc-globe-glow)" />
      <circle cx={cx} cy={cy} r={r} fill="url(#pc-globe-fill)"
              stroke="var(--pc-rule-2)" strokeWidth="1" />

      {/* Rotating graticule — clipped to globe circle */}
      <g clipPath="url(#pc-globe-clip)"
         style={{ transformOrigin: `${cx}px ${cy}px`, animation: `pcGlobeSpin ${rotate}s linear infinite` }}>
        {longitudes.map((k, i) => (
          <ellipse key={`lng-${i}`} cx={cx} cy={cy} rx={r * k} ry={r}
                   fill="none" stroke="var(--pc-rule)" strokeWidth="0.7" />
        ))}
        {latitudes.map((deg, i) => {
          const yOff = r * Math.sin((deg * Math.PI) / 180);
          const rad  = r * Math.cos((deg * Math.PI) / 180);
          return (
            <ellipse key={`lat-${i}`} cx={cx} cy={cy + yOff}
                     rx={rad} ry={rad * 0.08}
                     fill="none" stroke="var(--pc-rule)" strokeWidth="0.7" />
          );
        })}
        <g fill="var(--pc-ink-3)" opacity="0.32">
          <path d={`M ${cx-r*0.55},${cy-r*0.15} q ${r*0.08},-${r*0.18} ${r*0.22},-${r*0.08} q ${r*0.14},${r*0.06} ${r*0.08},${r*0.22} q -${r*0.12},${r*0.16} -${r*0.24},${r*0.06} q -${r*0.12},-${r*0.1} -${r*0.06},-${r*0.2} z`} />
          <path d={`M ${cx+r*0.05},${cy-r*0.5} q ${r*0.12},-${r*0.1} ${r*0.24},0 q ${r*0.06},${r*0.18} -${r*0.06},${r*0.22} q -${r*0.2},${r*0.04} -${r*0.22},-${r*0.14} q ${r*0.0},-${r*0.06} ${r*0.04},-${r*0.08} z`} />
          <path d={`M ${cx+r*0.18},${cy+r*0.15} q ${r*0.12},-${r*0.04} ${r*0.22},${r*0.08} q ${r*0.06},${r*0.18} -${r*0.08},${r*0.24} q -${r*0.18},${r*0.02} -${r*0.22},-${r*0.14} q ${r*0.0},-${r*0.1} ${r*0.08},-${r*0.18} z`} />
          <path d={`M ${cx-r*0.32},${cy+r*0.35} q ${r*0.08},-${r*0.04} ${r*0.16},${r*0.04} q ${r*0.04},${r*0.12} -${r*0.06},${r*0.16} q -${r*0.14},${r*0.0} -${r*0.16},-${r*0.1} q ${r*0.0},-${r*0.06} ${r*0.06},-${r*0.1} z`} />
        </g>
      </g>

      {/* Flight paths + city dots — clipped to globe */}
      <g clipPath="url(#pc-globe-clip)">
        {projOrigins.map((o, i) => {
          const mx  = (o.x + dx) / 2;
          const my  = (o.y + dy) / 2;
          const dvx = dx - o.x;
          const dvy = dy - o.y;
          const len = Math.hypot(dvx, dvy) || 1;
          const bow = Math.min(40, len * 0.32);
          const cpx = mx + (-dvy / len) * bow;
          const cpy = my + ( dvx / len) * bow;
          return (
            <g key={i}>
              <path d={`M ${o.x},${o.y} Q ${cpx},${cpy} ${dx},${dy}`}
                    fill="none" stroke="var(--pc-ink-2)" strokeWidth="1.1"
                    strokeDasharray="3 4"
                    style={{ animation: `pcFlightDash 14s linear ${i * 0.8}s infinite`, opacity: 0.85 }} />
              <circle cx={o.x} cy={o.y} r={2.4} fill="var(--pc-ink)" />
              <circle cx={o.x} cy={o.y} r={5}   fill="none"
                      stroke="var(--pc-ink-2)" strokeWidth="0.8" opacity={0.5} />
              {showLabels && (
                <text x={o.x} y={o.y - 7}
                      fontFamily="var(--pc-font-mono)" fontSize="8" fontWeight="600"
                      fill="var(--pc-ink-3)" textAnchor="middle" letterSpacing="0.5">
                  {o.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Destination — pulsing target */}
        <circle cx={dx} cy={dy} r={4.5} fill="var(--pc-live-dot)" />
        <circle cx={dx} cy={dy} r={4.5} fill="none"
                stroke="var(--pc-live-dot)" strokeWidth="1.5">
          <animate attributeName="r"       values="4.5;18;4.5"   dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0;0.8"    dur="2.6s" repeatCount="indefinite" />
        </circle>
        {showLabels && (
          <g>
            <rect x={dx + 8} y={dy - 8}
                  width={Math.max(70, destination.label.length * 6 + 12)} height={16}
                  rx={3} fill="var(--pc-ink)" />
            <text x={dx + 12} y={dy + 3}
                  fontFamily="var(--pc-font-mono)" fontSize="9" fontWeight="700"
                  fill="var(--pc-bg)" letterSpacing="1">
              {destination.label}
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}
