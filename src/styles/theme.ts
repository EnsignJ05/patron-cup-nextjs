export const colors = {
  primary: '#2c3e50',
  secondary: '#666666',
  background: '#f5f5f5',
  white: '#ffffff',
  shadow: {
    light: 'rgba(0,0,0,0.12)',
    medium: 'rgba(0,0,0,0.15)',
  }
};

export const spacing = {
  xs: 1,
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
};

export const borderRadius = {
  small: 2,
  medium: 3,
  large: 4,
};

export const typography = {
  h1: {
    fontWeight: 800,
    fontSize: { xs: '2.1rem', sm: '3rem', md: '4.5rem', lg: '5.5rem' },
    lineHeight: 1.08,
    letterSpacing: '-1.5px',
    color: colors.primary,
  },
  h3: {
    fontWeight: 700,
    fontSize: { xs: '2rem', sm: '2.5rem' },
    color: colors.primary,
  },
  h4: {
    fontWeight: 700,
    color: colors.primary,
  },
  body1: {
    color: colors.secondary,
    fontSize: 18,
  },
};

export const commonStyles = {
  pageContainer: {
    minHeight: '100vh',
    width: '100vw',
    background: colors.background,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    py: { xs: spacing.md, sm: spacing.xl },
    px: { xs: spacing.sm, sm: spacing.md },
  },
  card: {
    height: '100%',
    borderRadius: borderRadius.large,
    boxShadow: `0 8px 32px ${colors.shadow.light}`,
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: `0 12px 48px ${colors.shadow.medium}`,
    },
  },
  comingSoonCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    py: spacing.xl,
    px: spacing.md,
    bgcolor: colors.white,
    borderRadius: borderRadius.large,
    boxShadow: `0 8px 32px ${colors.shadow.light}`,
    maxWidth: '600px',
    width: '100%',
  },
}; 