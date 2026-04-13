import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import styles from './MatchCard.module.css';

type MatchPlayer = {
  id: string;
  name: string;
  courseHandicap?: number | null;
  strokesGiven?: number | null;
  handicap?: number | null;
  profileImageUrl: string | null;
};

type MatchTeam = {
  id: string;
  name: string;
  color: string | null;
  players: MatchPlayer[];
};

type MatchCardProps = {
  matchNumber: number;
  matchType: string;
  teeTime: string;
  teamA: MatchTeam | null;
  teamB: MatchTeam | null;
  winnerTeamId: string | null;
  isHalved: boolean;
  showCardOutline?: boolean;
  /** Formatted match date (e.g. from page-level `formatDate`). */
  matchDateLabel?: string;
  /** Course name or placeholder such as "Course TBD". */
  courseLabel?: string;
};

const formatHandicap = (value: number | null | undefined) => (value == null ? '-' : value.toString());

export default function MatchCard({
  matchNumber,
  matchType,
  teeTime,
  teamA,
  teamB,
  winnerTeamId,
  isHalved,
  showCardOutline = true,
  matchDateLabel,
  courseLabel,
}: MatchCardProps) {
  const statusLabel = isHalved ? 'Halved' : winnerTeamId ? 'Final' : 'In progress';
  const outlineColor =
    !isHalved && winnerTeamId
      ? winnerTeamId === teamA?.id
        ? teamA?.color
        : winnerTeamId === teamB?.id
          ? teamB?.color
          : undefined
      : undefined;

  const renderTeam = (team: MatchTeam | null, position: 'left' | 'right') => {
    if (!team) {
      return (
        <Box
          className={`${styles.teamCard} ${position === 'left' ? styles.teamCardLeft : styles.teamCardRight}`}
        >
          <Box className={styles.teamHeader}>
            <Typography variant="subtitle2" className={styles.teamName}>
              Team {position === 'left' ? 'A' : 'B'}
            </Typography>
          </Box>
          <Typography variant="body2" className={styles.noPlayers}>
            No team assigned
          </Typography>
        </Box>
      );
    }

    const isWinner = winnerTeamId === team.id && !isHalved;
    const teamStyle = {
      ['--team-color' as string]: team.color || undefined,
    };
    const chevronState = isHalved
      ? styles.chevronMuted
      : winnerTeamId
        ? isWinner
          ? styles.chevronWinner
          : styles.chevronMuted
        : styles.chevronPending;
    const chevronSide = position === 'right' ? styles.chevronRight : '';
    const chevronVertical = position === 'right' ? styles.chevronUp : styles.chevronDown;
    const isPending = !winnerTeamId && !isHalved;
    const desktopPoints =
      position === 'right'
        ? '3,0 100,0 100,100 3,100 0,50'
        : '0,0 97,0 100,50 97,100 0,100';
    const mobilePoints =
      position === 'right'
        ? '0,8 50,0 100,8 100,100 0,100'
        : '0,0 100,0 100,92 50,100 0,92';

    return (
      <Box
        className={`${styles.teamCard} ${position === 'left' ? styles.teamCardLeft : styles.teamCardRight}`}
        style={teamStyle}
      >
        <Box className={styles.chevron}>
          {isPending && (
            <>
              <svg
                className={`${styles.chevronOutline} ${styles.chevronOutlineDesktop}`}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polygon className={styles.chevronOutlineStroke} points={desktopPoints} />
              </svg>
              <svg
                className={`${styles.chevronOutline} ${styles.chevronOutlineMobile}`}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polygon className={styles.chevronOutlineStroke} points={mobilePoints} />
              </svg>
            </>
          )}
          <Box className={`${styles.chevronContent} ${chevronSide} ${chevronVertical} ${chevronState}`}>
            <Box className={styles.teamHeader}>
              <Typography variant="subtitle2" className={styles.teamName}>
                {team.name}
              </Typography>
              {isWinner && (
                <Typography variant="caption" className={styles.winnerBadge}>
                  Winner
                </Typography>
              )}
            </Box>
            <Box className={styles.playerList}>
              {team.players.length ? (
                team.players.map((player) => (
                  <Box key={player.id} className={styles.playerRow}>
                    <Avatar
                      src={player.profileImageUrl || undefined}
                      alt={player.name}
                      className={styles.playerAvatar}
                    >
                      {!player.profileImageUrl && player.name
                        ? player.name
                            .split(' ')
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join('')
                        : ''}
                    </Avatar>
                    <Box className={styles.playerInfo}>
                      <Typography variant="body2" className={styles.playerName}>
                        {player.name}
                      </Typography>
                      <Typography variant="caption" className={styles.playerHandicap}>
                        Course Handicap: {formatHandicap(player.courseHandicap)}
                      </Typography>
                      <Typography variant="caption" className={styles.playerHandicap}>
                        Strokes Given: {formatHandicap(player.strokesGiven)}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" className={styles.noPlayers}>
                  No players assigned
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box className={`${styles.card} ${showCardOutline ? '' : styles.cardNoOutline}`}>
      <Box className={styles.header}>
        <Box>
          <Typography variant="subtitle1" className={styles.matchTitle}>
            Match #{matchNumber}
          </Typography>
          <Typography variant="body2" className={styles.matchType}>
            {matchType}
          </Typography>
          {matchDateLabel ? (
            <Typography variant="body2" className={styles.matchMetaLine}>
              {matchDateLabel}
            </Typography>
          ) : null}
          {courseLabel ? (
            <Typography variant="body2" className={styles.matchMetaLine}>
              {courseLabel}
            </Typography>
          ) : null}
        </Box>
        <Box className={styles.headerMeta}>
          <Typography variant="body2" className={styles.matchStatus}>
            {statusLabel}
          </Typography>
          <Typography variant="body2" className={styles.teeTime}>
            Tee Time: {teeTime}
          </Typography>
        </Box>
      </Box>
      <Box className={styles.teamGrid} style={{ ['--match-outline' as string]: outlineColor || undefined }}>
        {renderTeam(teamA, 'left')}
        <Typography variant="subtitle1" className={styles.vsLabel}>
          vs
        </Typography>
        {renderTeam(teamB, 'right')}
      </Box>
    </Box>
  );
}
