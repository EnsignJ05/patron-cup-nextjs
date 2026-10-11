'use client';
import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { AWARD_OPTIONS } from '@/lib/ceremonyAwards';
import type { CeremonyAwardKey } from '@/types/database';
import AdminHead from '@/components/admin/AdminHead';
import AdminName from '@/components/admin/AdminName';
import styles from './page.module.css';

type NominationRow = {
  id: string;
  created_at: string;
  award_key: string;
  reason: string;
  nominator_player_id: string;
  nominated_player_id: string;
};

type NomineeTally = {
  playerId: string;
  firstName: string;
  lastName: string;
  count: number;
  latestReason: string;
};

export default function AdminAwardNominationsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [activeEvent, setActiveEvent] = useState<{ id: string; name: string; year: number } | null>(null);
  const [rows, setRows] = useState<NominationRow[]>([]);
  const [nameById, setNameById] = useState<Map<string, { first_name: string; last_name: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAward, setSelectedAward] = useState<CeremonyAwardKey>(AWARD_OPTIONS[0].key);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: event } = await supabase.from('events').select('id, name, year').eq('is_active', true).maybeSingle();

      if (cancelled) return;
      setActiveEvent(event ?? null);

      if (!event) {
        setLoading(false);
        return;
      }

      const { data: nominations, error: nomError } = await supabase
        .from('ceremony_award_nominations')
        .select('id, created_at, award_key, reason, nominator_player_id, nominated_player_id')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (nomError) {
        setError('Could not load nominations.');
        setLoading(false);
        return;
      }

      const nominationRows = nominations ?? [];
      setRows(nominationRows);

      const playerIds = new Set<string>();
      nominationRows.forEach((r) => {
        playerIds.add(r.nominator_player_id);
        playerIds.add(r.nominated_player_id);
      });

      if (playerIds.size > 0) {
        const { data: players } = await supabase.from('players').select('id, first_name, last_name').in('id', [...playerIds]);
        if (!cancelled) {
          setNameById(new Map((players ?? []).map((p) => [p.id, { first_name: p.first_name, last_name: p.last_name }])));
        }
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const tallyForSelectedAward = useMemo<NomineeTally[]>(() => {
    const byNominee = new Map<string, NomineeTally>();
    for (const row of rows) {
      if (row.award_key !== selectedAward) continue;
      const existing = byNominee.get(row.nominated_player_id);
      const name = nameById.get(row.nominated_player_id);
      if (existing) {
        existing.count += 1;
        // rows are newest-first, so the first one seen per nominee is already the latest
      } else {
        byNominee.set(row.nominated_player_id, {
          playerId: row.nominated_player_id,
          firstName: name?.first_name ?? 'Unknown',
          lastName: name?.last_name ?? 'player',
          count: 1,
          latestReason: row.reason,
        });
      }
    }
    return Array.from(byNominee.values()).sort((a, b) => b.count - a.count);
  }, [rows, selectedAward, nameById]);

  const countsByAward = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.award_key, (counts.get(row.award_key) ?? 0) + 1);
    }
    return counts;
  }, [rows]);

  return (
    <div>
      <AdminHead
        crumb="Award Nominations"
        title="Award Nominations"
        sub={activeEvent ? `${activeEvent.name} ${activeEvent.year} · nominees so far, most votes first.` : undefined}
      />

      {error && <p className={styles.error}>{error}</p>}

      {!activeEvent ? (
        <p className={styles.emptyState}>No active event. Nominations will appear when an event is active.</p>
      ) : (
        <>
          <div className={styles.awardChips}>
            {AWARD_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className="ad-chip"
                data-on={selectedAward === option.key}
                onClick={() => setSelectedAward(option.key)}
              >
                {option.label}
                <span className={styles.chipCount}>{countsByAward.get(option.key) ?? 0}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className={styles.nomineeGrid}>
              {[0, 1].map((i) => (
                <div key={i} className="ad-card" style={{ padding: 16, display: 'grid', gap: 12 }}>
                  <div className="ad-sk" style={{ width: '50%' }} />
                  <div className="ad-sk" style={{ width: '80%' }} />
                </div>
              ))}
            </div>
          ) : tallyForSelectedAward.length === 0 ? (
            <p className={styles.emptyState}>No nominations yet for this award.</p>
          ) : (
            <div className={styles.nomineeGrid}>
              {tallyForSelectedAward.map((nominee, index) => (
                <div key={nominee.playerId} className="ad-card" style={{ padding: 16, display: 'grid', gap: 12 }}>
                  <div className={styles.nomineeTop}>
                    <AdminName firstName={nominee.firstName} lastName={nominee.lastName} size={40} />
                    <div className={index === 0 ? styles.countBadgePrimary : styles.countBadge}>
                      <div className={styles.countNumber}>{nominee.count}</div>
                      <div className={styles.countLabel}>{nominee.count === 1 ? 'Nomination' : 'Nominations'}</div>
                    </div>
                  </div>
                  <p className={styles.quote}>&ldquo;{nominee.latestReason}&rdquo;</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
