import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Link from 'next/link';
import styles from './LodgingInfoCard.module.css';

export type LodgingRoommate = {
  id: string;
  name: string;
};

export type LodgingInfo = {
  buildingName: string | null;
  roomNumber: string | null;
  roomType: string | null;
  confirmationNum?: string | null;
  roommates: LodgingRoommate[];
};

type LodgingInfoCardProps = {
  lodgingInfo: LodgingInfo | null;
  showConfirmationNumber?: boolean;
  cardClassName?: string;
  heading?: string;
  emptyMessage?: string;
  roommatesLabel?: string;
  noRoommatesMessage?: string;
  linkBasePath?: string;
};

export default function LodgingInfoCard({
  lodgingInfo,
  showConfirmationNumber = false,
  cardClassName = '',
  heading = 'Lodging Info',
  emptyMessage = 'No room assignment found yet.',
  roommatesLabel = 'Roommates',
  noRoommatesMessage = 'No roommates assigned yet.',
  linkBasePath = '/players',
}: LodgingInfoCardProps) {
  return (
    <Paper elevation={2} className={`${styles.card} ${styles.cardAccent} ${cardClassName}`.trim()}>
      <Typography variant="h6" className={styles.sectionTitle}>
        {heading}
      </Typography>

      {!lodgingInfo ? (
        <Typography variant="body2" className={styles.emptyText}>
          {emptyMessage}
        </Typography>
      ) : (
        <>
          {showConfirmationNumber && (
            <Typography variant="h6" className={styles.confirmation}>
              Confirmation #: {lodgingInfo.confirmationNum || 'Not provided'}
            </Typography>
          )}

          <Box className={styles.contentCard}>
            <Typography variant="subtitle1" className={styles.roomTitle}>
              {(lodgingInfo.buildingName || 'Building TBD')}
              {lodgingInfo.roomNumber ? ` · Room ${lodgingInfo.roomNumber}` : ''}
              {lodgingInfo.roomType ? ` · ${lodgingInfo.roomType}` : ''}
            </Typography>

            <Typography variant="body2" className={styles.roommatesText}>
              {roommatesLabel}
            </Typography>

            {lodgingInfo.roommates.length > 0 ? (
              <Box component="ul" className={styles.roommatesList}>
                {lodgingInfo.roommates.map((roommate) => (
                  <li key={roommate.id}>
                    <Typography variant="body2" className={styles.roommatesText} component="span">
                      <Link href={`${linkBasePath}/${roommate.id}`} className={styles.roommateLink}>
                        {roommate.name}
                      </Link>
                    </Typography>
                  </li>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" className={styles.emptyText}>
                {noRoommatesMessage}
              </Typography>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}
