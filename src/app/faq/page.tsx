'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Playfair_Display } from 'next/font/google';
import { Inter } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });

const faqData = [
  {
    question: "When is the Patron Cup 2026?",
    answer: "April 22 – April 26, 2026"
  },
  {
    question: "Where is it being held?",
    answer: "Big Cedar Lodge, Branson, Missouri"
  },
  {
    question: "Where should I fly into?",
    answer: "Springfield, MO is the closest regional airport (SGF)"
  },
  {
    question: "What courses are we playing?",
    answer: (
      <Box>
        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong>Thursday:</strong> Buffalo Ridge
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong>Friday:</strong> Payne's Valley + Cliffhangers
        </Typography>
        <Typography variant="body1">
          <strong>Saturday:</strong> Ozarks National
        </Typography>
      </Box>
    )
  },
  {
    question: "What's the lodging situation?",
    answer: (
      <Box>
        <Typography variant="body1" sx={{ mb: 2 }}>
          We're staying in shared cabins on property:
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          • <strong>3 x 4-Bedroom Cabins</strong> (Sleeps 8) — includes putting green and pool
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          • <strong>7 x 2-Bedroom Cabins</strong> (Sleeps 4) — some with single beds
        </Typography>
        <Typography variant="body1">
          • <strong>4 x 1-Bedroom Cabins</strong> (Sleeps 2) — some with single beds
        </Typography>
      </Box>
    )
  },
  {
    question: "What does it cost?",
    answer: (
      <Box>
        <TableContainer component={Paper} sx={{ mb: 2, maxWidth: 500 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Lodging Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Cost</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>4-Bedroom (shared, 24 ppl)</TableCell>
                <TableCell>$3,900</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2-Bedroom Shared (12 ppl)</TableCell>
                <TableCell>$3,000</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2-Bedroom Solo (8 ppl)</TableCell>
                <TableCell>$4,000</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>1-Bedroom Solo (4 ppl)</TableCell>
                <TableCell>$4,000</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
          Includes:
        </Typography>
        <Typography variant="body1">
          4 rounds of golf, 4 nights of lodging, event gear, and a special awards dinner.
        </Typography>
      </Box>
    )
  },
  {
    question: "How do I pay?",
    answer: (
      <Box>
        <Typography variant="body1" sx={{ mb: 2 }}>
          <strong>Deposit:</strong> $500 due by <strong>July 15, 2025</strong>
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          <strong>Remaining Balance:</strong> Due by <strong>January 15, 2026</strong>
        </Typography>
        <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
          Payment Options:
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          You can pay <strong>Chris Bolton</strong> via <strong>check</strong>, <strong>Venmo</strong>, or <strong>Zelle</strong>.
        </Typography>
        <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#666' }}>
          See the original email for specific payment details.
        </Typography>
      </Box>
    )
  }
];

export default function FAQ() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        color: '#2c3e50',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        m: 0,
        p: 0,
        pt: { xs: 4, sm: 6, md: 7 },
        px: { xs: 1, sm: 2, md: 0 },
      }}
    >
      <Box sx={{ maxWidth: 800, width: '100%', px: { xs: 1, sm: 2 }, mb: { xs: 3, sm: 4 } }}>
        <Typography
          variant="h1"
          className={playfair.className}
          sx={{
            fontWeight: 800,
            fontSize: { xs: '2.1rem', sm: '3rem', md: '4rem' },
            lineHeight: 1.08,
            letterSpacing: '-1px',
            mb: { xs: 1, sm: 2 },
            textAlign: 'center',
            color: '#2c3e50',
            textShadow: '0 2px 12px rgba(0,0,0,0.1)',
          }}
        >
          Frequently Asked Questions
        </Typography>
        <Typography
          variant="h5"
          className={inter.className}
          sx={{
            fontWeight: 400,
            fontSize: { xs: '1rem', sm: '1.2rem' },
            color: '#666666',
            textAlign: 'center',
            mb: { xs: 3, sm: 4 },
          }}
        >
          Patron Cup 2026
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 800, width: '100%', px: { xs: 1, sm: 2 }, mb: 6 }}>
        {faqData.map((faq, index) => (
          <Accordion
            key={index}
            sx={{
              mb: 2,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              '&:before': {
                display: 'none',
              },
              '&.Mui-expanded': {
                margin: '16px 0',
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#2c3e50' }} />}
              sx={{
                backgroundColor: '#ffffff',
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: '#fafafa',
                },
                '&.Mui-expanded': {
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                },
              }}
            >
              <Typography
                className={inter.className}
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  color: '#2c3e50',
                }}
              >
                {faq.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails
              sx={{
                backgroundColor: '#ffffff',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
                pt: 3,
                pb: 3,
              }}
            >
              <Typography
                className={inter.className}
                sx={{
                  fontSize: { xs: '0.95rem', sm: '1rem' },
                  color: '#2c3e50',
                  lineHeight: 1.6,
                }}
              >
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
} 