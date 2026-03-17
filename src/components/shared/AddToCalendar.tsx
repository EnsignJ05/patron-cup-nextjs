import { Box, Link, Typography } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import styles from './AddToCalendar.module.css';

interface AddToCalendarProps {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
}

export default function AddToCalendar({ title, description, startDate, endDate, location }: AddToCalendarProps) {
  // Format dates for calendar links
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  // Generate Google Calendar link
  const googleCalendarUrl = () => {
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: description,
      location: location,
      dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    });
    return `${baseUrl}?${params.toString()}`;
  };

  // Generate iCal/iOS calendar link
  const iCalUrl = () => {
    const baseUrl = 'data:text/calendar;charset=utf8,';
    const content = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');
    
    return baseUrl + encodeURIComponent(content);
  };

  return (
    <Box className={styles.row}>
      <CalendarMonthIcon className={styles.icon} />
      <Typography variant="body2" className={styles.label}>
        Add to:
      </Typography>
      <Link 
        href={googleCalendarUrl()} 
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      >
        Google
      </Link>
      <Typography variant="body2" className={styles.separator}>•</Typography>
      <Link 
        href={iCalUrl()} 
        download="event.ics"
        className={styles.link}
      >
        iOS
      </Link>
    </Box>
  );
} 