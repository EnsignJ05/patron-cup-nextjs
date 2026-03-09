'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, TextField, Button, Paper, Alert } from '@mui/material';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';
 
 export default function ChangePasswordPage() {
   const { user, mustChangePassword } = useAuth();
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [error, setError] = useState('');
   const [success, setSuccess] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const router = useRouter();
   const supabase = useMemo(() => createSupabaseBrowserClient(), []);
 
   useEffect(() => {
     if (!user) {
       router.replace('/login');
       return;
     }
     if (!mustChangePassword) {
       router.replace('/dashboard');
     }
   }, [mustChangePassword, router, user]);
 
   const handleSubmit = async (event: React.FormEvent) => {
     event.preventDefault();
     setError('');
     setSuccess('');
 
     if (password.length < 8) {
       setError('Password must be at least 8 characters.');
       return;
     }
 
     if (password !== confirmPassword) {
       setError('Passwords do not match.');
       return;
     }
 
    if (!user) {
      setError('You must be signed in to update your password.');
      return;
    }

     setSubmitting(true);
     try {
       const { error: updateError } = await supabase.auth.updateUser({ password });
       if (updateError) {
         setError(updateError.message);
         return;
       }
 
       const { error: profileError } = await supabase
         .from('profiles')
         .update({ must_change_password: false })
        .eq('id', user.id);
 
       if (profileError) {
         setError(profileError.message);
         return;
       }
 
       setSuccess('Password updated.');
       router.replace('/dashboard');
     } catch (err) {
       const message = err instanceof Error ? err.message : 'Unable to update password.';
       setError(message);
     } finally {
       setSubmitting(false);
     }
   };
 
   return (
    <Box className={styles.pageRoot}>
       <Paper
         elevation={3}
        className={styles.formCard}
       >
        <Typography variant="h4" component="h1" className={styles.title}>
           Set a new password
         </Typography>
        <Typography variant="body2" className={styles.subtitle}>
           Please update your temporary password to continue.
         </Typography>
 
         {error && (
          <Alert severity="error" className={styles.alert}>
             {error}
           </Alert>
         )}
         {success && (
          <Alert severity="success" className={styles.alert}>
             {success}
           </Alert>
         )}
 
         <form onSubmit={handleSubmit}>
          <Box className={styles.formFields}>
             <TextField
               label="New password"
               type="password"
               value={password}
               onChange={(event) => setPassword(event.target.value)}
               required
               fullWidth
               autoComplete="new-password"
             />
             <TextField
               label="Confirm password"
               type="password"
               value={confirmPassword}
               onChange={(event) => setConfirmPassword(event.target.value)}
               required
               fullWidth
               autoComplete="new-password"
             />
             <Button
               type="submit"
               variant="contained"
               size="large"
               fullWidth
               disabled={submitting}
              className={styles.submitButton}
             >
               {submitting ? 'Updating...' : 'Update password'}
             </Button>
           </Box>
         </form>
       </Paper>
     </Box>
   );
 }
