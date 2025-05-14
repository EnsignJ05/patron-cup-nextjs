import { Box, Link, Typography } from '@mui/material';
import { colors } from '@/styles/theme';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

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
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
      <CalendarMonthIcon sx={{ color: colors.secondary, fontSize: 20 }} />
      <Typography variant="body2" sx={{ color: colors.secondary }}>
        Add to:
      </Typography>
      <Link 
        href={googleCalendarUrl()} 
        target="_blank"
        rel="noopener noreferrer"
        sx={{ 
          color: colors.primary,
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
          fontSize: '0.875rem',
        }}
      >
        Google
      </Link>
      <Typography variant="body2" sx={{ color: colors.secondary }}>•</Typography>
      <Link 
        href={iCalUrl()} 
        download="event.ics"
        sx={{ 
          color: colors.primary,
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
          fontSize: '0.875rem',
        }}
      >
        iOS
      </Link>
    </Box>
  );
} 