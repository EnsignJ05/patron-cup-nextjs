'use client';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Link from '@mui/material/Link';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import LanguageIcon from '@mui/icons-material/Language';

const lodgingOptions = [
  {
    name: 'Bandon Dunes Resort',
    image: '/gallery/BandonPhotos/hero.jpg',
    description: 'Experience world-class accommodations at Bandon Dunes Golf Resort. Our rooms offer stunning views of the golf course and Pacific Ocean.',
    address: '57744 Round Lake Drive, Bandon, OR 97411',
    phone: '(541) 347-4380',
    website: 'https://www.bandondunesgolf.com',
  },
  {
    name: 'The Inn at Face Rock',
    image: '/gallery/BandonPhotos/gallery-hero.webp',
    description: 'Located just minutes from downtown Bandon, The Inn at Face Rock offers comfortable accommodations with easy access to the beach and golf courses.',
    address: '3225 Beach Loop Dr, Bandon, OR 97411',
    phone: '(541) 347-6000',
    website: 'https://innatfacerock.com',
  },
];

export default function LodgingPage() {
  const showLodging = process.env.NEXT_PUBLIC_SHOW_LODGING === 'true';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: { xs: 4, sm: 8 },
        px: { xs: 2, sm: 4 },
      }}
    >
      <Typography 
        variant="h3" 
        sx={{ 
          mb: { xs: 4, sm: 6 }, 
          color: '#2c3e50',
          fontWeight: 700,
          textAlign: 'center'
        }}
      >
        Lodging
      </Typography>

      {!showLodging ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            px: 4,
            bgcolor: '#ffffff',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            maxWidth: '600px',
            width: '100%',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: '#2c3e50',
              fontWeight: 700,
              textAlign: 'center',
              mb: 2,
            }}
          >
            Coming Soon
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#666666',
              textAlign: 'center',
              fontSize: 18,
            }}
          >
            Don&apos;t worry, we&apos;ll get you your room information, so you can let your &quot;friend&quot; from Tryst.com know where to expect the envelope.
          </Typography>
        </Box>
      ) : (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 4, 
            maxWidth: '1200px',
            width: '100%'
          }}
        >
          {lodgingOptions.map((option) => (
            <Box key={option.name} sx={{ flex: 1, width: '100%' }}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderRadius: 4,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
                  },
                }}
              >
                <CardMedia
                  component="img"
                  height="300"
                  image={option.image}
                  alt={option.name}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      mb: 2,
                      color: '#2c3e50',
                      fontWeight: 700,
                    }}
                  >
                    {option.name}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      mb: 3,
                      color: '#666666',
                    }}
                  >
                    {option.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <LocationOnIcon sx={{ color: '#2c3e50', mr: 1 }} />
                    <Typography variant="body1" sx={{ color: '#2c3e50' }}>
                      {option.address}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <PhoneIcon sx={{ color: '#2c3e50', mr: 1 }} />
                    <Link 
                      href={`tel:${option.phone}`}
                      sx={{ 
                        color: '#2c3e50',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      {option.phone}
                    </Link>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LanguageIcon sx={{ color: '#2c3e50', mr: 1 }} />
                    <Link 
                      href={option.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        color: '#2c3e50',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      Visit Website
                    </Link>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
} 