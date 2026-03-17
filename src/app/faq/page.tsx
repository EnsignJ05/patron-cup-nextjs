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
import styles from './page.module.css';

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
        <Typography variant="body1" className={styles.answerParagraph}>
          <strong>Thursday:</strong> Buffalo Ridge
        </Typography>
        <Typography variant="body1" className={styles.answerParagraph}>
          <strong>Friday:</strong> Payne&apos;s Valley + Cliffhangers
        </Typography>
        <Typography variant="body1" className={styles.answerParagraph}>
          <strong>Saturday:</strong> Ozarks National
        </Typography>
      </Box>
    )
  },
  {
    question: "What's the lodging situation?",
    answer: (
      <Box>
        <Typography variant="body1" className={styles.answerParagraphLarge}>
          We&apos;re staying in shared cabins on property:
        </Typography>
        <Typography variant="body1" className={styles.answerParagraph}>
          • <strong>3 x 4-Bedroom Cabins</strong> (Sleeps 8) — includes putting green and pool
        </Typography>
        <Typography variant="body1" className={styles.answerParagraph}>
          • <strong>7 x 2-Bedroom Cabins</strong> (Sleeps 4) — some with single beds
        </Typography>
        <Typography variant="body1" className={styles.answerParagraph}>
          • <strong>4 x 1-Bedroom Cabins</strong> (Sleeps 2) — some with single beds
        </Typography>
      </Box>
    )
  },
  {
    question: "What does it cost?",
    answer: (
      <Box>
        <TableContainer component={Paper} className={styles.faqTable}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className={styles.tableHeaderCell}>Lodging Type</TableCell>
                <TableCell className={styles.tableHeaderCell}>Cost</TableCell>
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
        <Typography variant="body1" className={styles.answerStrong}>
          Includes:
        </Typography>
        <Typography variant="body1" className={styles.answerParagraph}>
          4 rounds of golf, 4 nights of lodging, event gear, and a special awards dinner.
        </Typography>
      </Box>
    )
  },
  {
    question: "How do I pay?",
    answer: (
      <Box>
        <Typography variant="body1" className={styles.answerParagraphLarge}>
          <strong>Deposit:</strong> $500 due by <strong>July 15, 2025</strong>
        </Typography>
        <Typography variant="body1" className={styles.answerParagraphLarge}>
          <strong>Remaining Balance:</strong> Due by <strong>January 15, 2026</strong>
        </Typography>
        <Typography variant="body1" className={styles.answerStrong}>
          Payment Options:
        </Typography>
        <Typography variant="body1" className={styles.answerParagraph}>
          You can pay <strong>Chris Bolton</strong> via <strong>check</strong>, <strong>Venmo</strong>, or <strong>Zelle</strong>.
        </Typography>
        <Typography variant="body2" className={styles.answerNote}>
          See the original email for specific payment details.
        </Typography>
      </Box>
    )
  }
];

export default function FAQ() {
  return (
    <Box className={styles.pageRoot}>
      <Box className={styles.headerWrap}>
        <Typography
          variant="h1"
          className={`${playfair.className} ${styles.pageTitle}`}
        >
          Frequently Asked Questions
        </Typography>
        <Typography
          variant="h5"
          className={`${inter.className} ${styles.pageSubtitle}`}
        >
          Patron Cup 2026
        </Typography>
      </Box>

      <Box className={styles.faqList}>
        {faqData.map((faq, index) => (
          <Accordion
            key={index}
            className={styles.accordion}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon className={styles.expandIcon} />}
              className={styles.accordionSummary}
            >
              <Typography
                className={`${inter.className} ${styles.questionText}`}
              >
                {faq.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails
              className={styles.accordionDetails}
            >
              <Typography
                className={`${inter.className} ${styles.answerText}`}
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