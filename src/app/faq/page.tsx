import Image from 'next/image';
import styles from './page.module.css';

// ── Trip metadata ─────────────────────────────────────────────────────────
const FAQ_TRIP = {
  edition: '19th Annual',
  destination: 'Streamsong Resort',
  region: 'Bowling Green, FL',
  dateRange: 'April 7 — 11, 2027',
};

// ── Courses (from the 2027 flyer) ─────────────────────────────────────────
const COURSES = [
  { day: 'Thu AM', name: 'Bone Valley',     par: 72, isNew: false, photo: '/gallery/StreamsongPhotos/BoneValley.webp'      },
  { day: 'Thu PM', name: 'The Chain',        par: 56, isNew: true,  photo: '/gallery/StreamsongPhotos/TheChain.webp'         },
  { day: 'Fri',    name: 'Streamsong Red',   par: 72, isNew: false, photo: '/gallery/StreamsongPhotos/StreamsongRed.webp'   },
  { day: 'Sat',    name: 'Streamsong Blue',  par: 72, isNew: false, photo: '/gallery/StreamsongPhotos/StreamsongBlue.webp'  },
];

// ── Q&A (final state from design iteration) ───────────────────────────────
const FAQS = [
  {
    q: 'When is it?',
    a: 'April 7 – April 11, 2027.',
  },
  {
    q: 'Where are we playing?',
    a: 'Streamsong Resort in Bowling Green, FL — four rounds across Bone Valley, The Chain, Streamsong Red, and Streamsong Blue.',
  },
  {
    q: 'How much does it cost?',
    a: 'Shared room: $3,700 (18 available). Single room: $5,000 (12 available). Includes 4 rounds, 4 nights lodging, gear, Welcome Dinner, and Awards Dinner.',
  },
  {
    q: 'How do I lock in my spot?',
    a: "$500 deposit by June 8, 2026. Balance due January 15, 2027. Rooms can't be guaranteed without deposit + preference, first-come first-served.",
  },
  {
    q: 'How do I pay?',
    a: 'Zelle preferred',
  },
  {
    q: 'Who can come?',
    a: '2026 returning players first, then Patron Regulars, then friends and family.',
  },
  {
    q: "What's included in the price?",
    a: 'Golf (all 4 rounds), 4 nights of lodging, gear, the Welcome Dinner, and the Awards Dinner.',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────
export default function FAQPage() {
  return (
    <div className={styles.root}>
      <div className={styles.container}>

        {/* Trip hero */}
        <div className={styles.hero}>
          <span className={styles.label}>{FAQ_TRIP.edition} · Save the Date</span>
          <h1 className={styles.displayHeading}>Patron Cup 2027</h1>
          <div className={styles.heroMeta}>
            <div className={styles.heroMetaRow}>
              <PinIcon />
              <span>
                <strong>{FAQ_TRIP.destination}</strong> · {FAQ_TRIP.region}
              </span>
            </div>
            <div className={styles.heroMetaRow}>
              <RouteIcon />
              <span className={styles.monoText}>{FAQ_TRIP.dateRange.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Frequently Asked */}
        <SectionHeader label="Frequently Asked" />
        <div className={styles.qnaGrid}>
          {FAQS.map((f) => (
            <div key={f.q} className={styles.qnaItem}>
              <div className={styles.qnaQuestion}>{f.q}</div>
              <div className={styles.qnaAnswer}>{f.a}</div>
            </div>
          ))}
        </div>

        {/* Courses */}
        <SectionHeader label={`The Courses · ${COURSES.length} rounds`} />
        <div className={styles.courseGrid}>
          {COURSES.map((c) => (
            <div
              key={c.name}
              className={styles.courseCard}
              style={{ borderTopColor: c.isNew ? 'var(--pc-live-dot)' : 'var(--pc-team-b)' }}
            >
              <div className={styles.courseImage}>
                <Image
                  src={c.photo}
                  alt={c.name}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(min-width: 1024px) 25vw, 100vw"
                />
                <span className={styles.courseDayBadge}>{c.day.toUpperCase()}</span>
                {c.isNew && (
                  <span className={styles.courseNewPill}>★ NEW · 4TH ROUND</span>
                )}
              </div>
              <div className={styles.courseInfo}>
                <span className={styles.courseName}>{c.name}</span>
                <span className={styles.coursePar}>PAR {c.par}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionPill} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 8.5v3a4 4 0 004 4h4a4 4 0 014 4" />
    </svg>
  );
}
