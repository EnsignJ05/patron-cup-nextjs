export const colors = {
  primary: 'var(--text)',
  secondary: 'var(--text-muted)',
  background: 'var(--bg)',
  white: 'var(--surface)',
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
    boxShadow: 'var(--shadow-md)',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: 'var(--shadow-lg)',
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
    boxShadow: 'var(--shadow-md)',
    maxWidth: '600px',
    width: '100%',
  },
}; 