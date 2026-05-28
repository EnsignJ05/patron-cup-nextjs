'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { getTeamTotals } from '@/lib/matchScoring';
import GlobeAnimation, { GlobeDestination, STREAMSONG_DEST, BIG_CEDAR_DEST } from '@/components/GlobeAnimation';
import styles from './page.module.css';

// ── Trip config — update each year ──────────────────────────────────────────
const NEXT_TRIP = {
  year: 2027,
  edition: '19th Annual',
  location: 'Streamsong Resort',
  region: 'Bowling Green, FL',
  dateRange: 'April 7 — 11, 2027',
  teeOffDate: new Date('2027-04-07T09:00:00-05:00'),
  destination: STREAMSONG_DEST,
};

// Known resort → globe destination mapping
const RESORT_DESTINATIONS: Record<string, GlobeDestination> = {
  'Streamsong Resort': STREAMSONG_DEST,
  'Big Cedar Lodge':   BIG_CEDAR_DEST,
};

// ── Types ────────────────────────────────────────────────────────────────────
interface TeamData {
  id: string;
  name: string;
  color: string | null;
}

interface ActiveEventData {
  id: string;
  resort_name: string | null;
  location_city: string;
  location_state: string;
}

function fmtPts(n: number): string {
  if (n === 0) return '0';
  const whole = Math.floor(n);
  const half = n % 1 === 0.5;
  if (whole === 0) return half ? '½' : '0';
  return `${whole}${half ? '½' : ''}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [phase, setPhase] = useState<'loading' | 'pre-trip' | 'on-trip'>('loading');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [teamScores, setTeamScores] = useState<Record<string, number>>({});
  const [activeEvent, setActiveEvent] = useState<ActiveEventData | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Countdown ticker
  useEffect(() => {
    const tick = () => {
      const diff = NEXT_TRIP.teeOffDate.getTime() - Date.now();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff / 3600000) % 24),
          minutes: Math.floor((diff / 60000) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Detect active event → on-trip state
  useEffect(() => {
    const init = async () => {
      const { data: event } = await supabase
        .from('events')
        .select('id, resort_name, location_city, location_state')
        .eq('is_active', true)
        .single();

      if (!event) {
        setPhase('pre-trip');
        return;
      }

      setActiveEvent(event as ActiveEventData);

      const [teamsRes, matchesRes] = await Promise.all([
        supabase.from('teams').select('id, name, color').eq('event_id', event.id).order('name'),
        supabase.from('matches').select('winner_team_id, is_halved').eq('event_id', event.id),
      ]);

      const teamsData = teamsRes.data ?? [];
      const matchesData = matchesRes.data ?? [];
      setTeams(teamsData);
      setTeamScores(getTeamTotals(matchesData, teamsData.map((t) => t.id)));
      setPhase('on-trip');
    };

    init().catch(console.error);
  }, [supabase]);

  if (phase === 'loading') return <div className={styles.root} />;

  if (phase === 'on-trip' && teams.length >= 2 && activeEvent) {
    const destination =
      (activeEvent.resort_name ? RESORT_DESTINATIONS[activeEvent.resort_name] : undefined)
      ?? STREAMSONG_DEST;
    return (
      <OnTripHome
        teams={teams}
        teamScores={teamScores}
        locationName={activeEvent.resort_name ?? activeEvent.location_city}
        region={`${activeEvent.location_city}, ${activeEvent.location_state}`}
        destination={destination}
      />
    );
  }

  return <PreTripHome timeLeft={timeLeft} />;
}

// ── Pre-trip ──────────────────────────────────────────────────────────────────
function PreTripHome({
  timeLeft,
}: {
  timeLeft: { days: number; hours: number; minutes: number; seconds: number };
}) {
  const units = [
    { n: String(timeLeft.days), u: 'DAYS' },
    { n: String(timeLeft.hours).padStart(2, '0'), u: 'HRS' },
    { n: String(timeLeft.minutes).padStart(2, '0'), u: 'MIN' },
    { n: String(timeLeft.seconds).padStart(2, '0'), u: 'SEC' },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.container}>

        {/* Desktop hero: identity left + globe right */}
        <div className={styles.heroGrid}>
          <div className={styles.identity}>
            <span className={styles.label}>{NEXT_TRIP.edition} · Save the Date</span>
            <h1 className={styles.displayHeading}>Patron Cup {NEXT_TRIP.year}</h1>
            <div className={styles.identityMeta}>
              <PinIcon />
              <span><strong>{NEXT_TRIP.location}</strong> · {NEXT_TRIP.region}</span>
            </div>
            <div className={styles.identityMeta}>
              <RouteIcon />
              <span className={styles.monoText}>{NEXT_TRIP.dateRange.toUpperCase()}</span>
            </div>
          </div>

          {/* Globe card */}
          <div className={styles.globeCard}>
            <div className={styles.globeCardTop}>
              <div className={styles.destRow}>
                <span className={styles.destDot} />
                <span className={styles.label} style={{ fontSize: 9 }}>Destination</span>
              </div>
              <span className={styles.coordLabel}>27.65°N · 81.85°W</span>
            </div>
            <div className={styles.globeCenter}>
              <GlobeAnimation size={260} destination={NEXT_TRIP.destination} />
            </div>
            <div className={styles.globeFooter}>
              <PinIcon size={13} />
              <span className={styles.globeLocation}>{NEXT_TRIP.location}</span>
              <span className={styles.globeRegion}>· {NEXT_TRIP.region}</span>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className={styles.countdownCard}>
          <div className={styles.countdownHeader}>
            <span className={styles.label}>Time to first tee</span>
            <span className={styles.dateRange}>{NEXT_TRIP.dateRange.toUpperCase()}</span>
          </div>
          <div className={styles.countdownGrid}>
            {units.map(({ n, u }, i) => (
              <div key={u} className={styles.countdownUnit}
                   style={{ borderRight: i < 3 ? '1px solid var(--pc-rule)' : 'none' }}>
                <span className={styles.countdownNumber}>{n}</span>
                <span className={styles.label} style={{ fontSize: 9, marginTop: 6 }}>{u}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ CTA */}
        <Link href="/faq" className={styles.faqButton}>
          <HelpIcon />
          Trip FAQ &amp; Details
        </Link>

      </div>
    </div>
  );
}

// ── On-trip ───────────────────────────────────────────────────────────────────
function OnTripHome({
  teams,
  teamScores,
  locationName,
  region,
  destination,
}: {
  teams: TeamData[];
  teamScores: Record<string, number>;
  locationName: string;
  region: string;
  destination: GlobeDestination;
}) {
  const teamA = teams[0];
  const teamB = teams[1];
  const aColor = teamA.color ?? '#c1272d';
  const bColor = teamB.color ?? '#1d4e89';
  const aPts = teamScores[teamA.id] ?? 0;
  const bPts = teamScores[teamB.id] ?? 0;
  const total = aPts + bPts;
  const aPct = total > 0 ? (aPts / total) * 100 : 50;
  const lead =
    aPts > bPts
      ? `+${fmtPts(aPts - bPts)} ${teamA.name}`
      : bPts > aPts
      ? `+${fmtPts(bPts - aPts)} ${teamB.name}`
      : 'Tied';

  return (
    <div className={styles.root}>
      <div className={styles.container}>

        <div className={styles.onTripHeader}>
          <span className={styles.label}>Patron Cup · Live</span>
          <span className={styles.livePill}>
            <span className={styles.liveDot} />
            LIVE
          </span>
        </div>

        {/* Cup score hero */}
        <div className={styles.scoreCard}>
          {/* Team A shoulder gradient */}
          <div className={styles.shoulder} style={{ left: 0, background: `linear-gradient(135deg, ${aColor} 0%, transparent 80%)` }} />
          {/* Team B shoulder gradient */}
          <div className={styles.shoulder} style={{ right: 0, background: `linear-gradient(-135deg, ${bColor} 0%, transparent 80%)` }} />

          <div className={styles.scoreInner}>
            <div className={styles.scoreTeam}>
              <div className={styles.scoreTeamName}>
                <span className={styles.teamChip} style={{ background: aColor }} />
                <span style={{ color: aColor }}>{teamA.name.toUpperCase()}</span>
              </div>
              <div className={styles.scoreNumber}>{fmtPts(aPts)}</div>
            </div>
            <div className={styles.scoreVs}>VS</div>
            <div className={`${styles.scoreTeam} ${styles.scoreTeamRight}`}>
              <div className={styles.scoreTeamName}>
                <span style={{ color: bColor }}>{teamB.name.toUpperCase()}</span>
                <span className={styles.teamChip} style={{ background: bColor }} />
              </div>
              <div className={styles.scoreNumber}>{fmtPts(bPts)}</div>
            </div>
          </div>

          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div style={{ width: `${aPct}%`, background: aColor, height: '100%' }} />
              <div style={{ width: `${100 - aPct}%`, background: bColor, height: '100%' }} />
            </div>
            <div className={styles.progressMeta}>
              <span>{lead}</span>
              <Link href="/matches" className={styles.matchesLink}>View matches →</Link>
            </div>
          </div>
        </div>

        {/* Mini globe — where we are */}
        <div className={styles.miniGlobe}>
          <div className={styles.miniGlobeViz}>
            <GlobeAnimation size={90} destination={destination} showLabels={false} />
          </div>
          <div className={styles.miniGlobeInfo}>
            <span className={styles.label} style={{ fontSize: 9 }}>Where We Are</span>
            <div className={styles.miniGlobeName}>{locationName}</div>
            <div className={styles.miniGlobeRegion}>{region.toUpperCase()}</div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Icon helpers ──────────────────────────────────────────────────────────────
function PinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function RouteIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 8.5v3a4 4 0 004 4h4a4 4 0 014 4" />
    </svg>
  );
}

function HelpIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.2a3 3 0 015.6 1.3c0 1.7-2.4 2.2-2.4 3.7" />
      <circle cx="12" cy="17.2" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}
