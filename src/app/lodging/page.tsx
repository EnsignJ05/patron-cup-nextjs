'use client';
import { Box, Typography, Card, CardContent, CardMedia } from '@mui/material';
import { LocationOn, Phone, Language } from '@mui/icons-material';
import { styles } from '@/styles/pages/lodging/styles';

// const lodgingOptions = [
//   {
//     name: 'Bandon Dunes Resort',
//     image: '/gallery/BandonPhotos/hero.jpg',
//     description: 'Experience world-class accommodations at Bandon Dunes Golf Resort. Our rooms offer stunning views of the golf course and Pacific Ocean.',
//     address: '57744 Round Lake Drive, Bandon, OR 97411',
//     phone: '(541) 347-4380',
//     website: 'https://www.bandondunesgolf.com',
//   },
//   {
//     name: 'The Inn at Face Rock',
//     image: '/gallery/BandonPhotos/gallery-hero.webp',
//     description: 'Located just minutes from downtown Bandon, The Inn at Face Rock offers comfortable accommodations with easy access to the beach and golf courses.',
//     address: '3225 Beach Loop Dr, Bandon, OR 97411',
//     phone: '(541) 347-6000',
//     website: 'https://innatfacerock.com',
//   },
// ];

export default function LodgingPage() {
  // const showLodging = process.env.NEXT_PUBLIC_SHOW_LODGING === 'true';

  return (
    <Box sx={styles.container}>
      <Typography variant="h3" sx={styles.title}>
        Lodging Options
      </Typography>

      <Box sx={styles.comingSoonContainer}>
        <Typography variant="h4" sx={styles.comingSoonTitle}>
          Coming Soon
        </Typography>
        <Typography sx={styles.comingSoonText}>
          We are currently working on securing the best lodging options for the 2025 Patron Cup.
          Please check back soon for updates!
        </Typography>
      </Box>

      {/* Example of how the lodging options will look once available */}
      <Box sx={styles.optionsContainer}>
        <Box sx={styles.optionBox}>
          <Card sx={styles.card}>
            <CardMedia
              component="img"
              height="200"
              image="/images/lodging-placeholder.jpg"
              alt="Lodging Option 1"
              sx={styles.cardMedia}
            />
            <CardContent>
              <Typography variant="h5" sx={styles.cardTitle}>
                Resort Name
              </Typography>
              <Typography variant="body1" sx={styles.cardDescription}>
                Description of the resort and its amenities. This will include information about
                the rooms, facilities, and any special features.
              </Typography>
              <Box sx={styles.infoRow}>
                <LocationOn sx={styles.icon} />
                <Typography sx={styles.infoText}>
                  123 Resort Drive, Location, State
                </Typography>
              </Box>
              <Box sx={styles.infoRow}>
                <Phone sx={styles.icon} />
                <Typography sx={styles.infoText}>
                  (555) 123-4567
                </Typography>
              </Box>
              <Box sx={styles.infoRow}>
                <Language sx={styles.icon} />
                <Typography
                  component="a"
                  href="https://example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={styles.link}
                >
                  Visit Website
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
} 