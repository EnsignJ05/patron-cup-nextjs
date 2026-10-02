import Image from 'next/image';

const getInitials = (first: string, last: string) =>
  `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

type AdminNameProps = {
  firstName: string;
  lastName: string;
  team?: string | null;
  teamColor?: string | null;
  profileImageUrl?: string | null;
  size?: number;
  sub?: string;
};

/** Avatar + team color chip + name, for admin tables (players/teams/travel/etc). */
export default function AdminName({
  firstName,
  lastName,
  team,
  teamColor,
  profileImageUrl,
  size = 30,
  sub,
}: AdminNameProps) {
  const name = `${firstName} ${lastName}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {profileImageUrl ? (
          <div
            style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden' }}
          >
            <Image src={profileImageUrl} alt={name} width={size} height={size} style={{ objectFit: 'cover' }} />
          </div>
        ) : (
          <div
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              background: 'var(--pc-fill)',
              color: 'var(--pc-ink-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--pc-font-sans)',
              fontWeight: 700,
              fontSize: Math.round(size * 0.38),
            }}
          >
            {getInitials(firstName, lastName)}
          </div>
        )}
        {team && teamColor && (
          <div
            style={{
              background: teamColor,
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 11,
              height: 11,
              border: '2px solid var(--pc-card)',
              borderRadius: 3,
            }}
          />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--pc-ink-3)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}
