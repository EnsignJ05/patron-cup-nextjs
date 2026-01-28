'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, TextField, Button, Paper, Alert } from '@mui/material';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { useAuth } from '@/context/AuthContext';
 
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
     <Box
       sx={{
         minHeight: '100vh',
         width: '100vw',
         background: '#f5f5f5',
         display: 'flex',
         flexDirection: 'column',
         alignItems: 'center',
         justifyContent: 'center',
         p: 2,
       }}
     >
       <Paper
         elevation={3}
         sx={{
           p: 4,
           width: '100%',
           maxWidth: 420,
           display: 'flex',
           flexDirection: 'column',
           gap: 3,
         }}
       >
         <Typography variant="h4" component="h1" sx={{ textAlign: 'center', mb: 2 }}>
           Set a new password
         </Typography>
         <Typography variant="body2" sx={{ textAlign: 'center', color: '#666', mb: 1 }}>
           Please update your temporary password to continue.
         </Typography>
 
         {error && (
           <Alert severity="error" sx={{ mb: 2 }}>
             {error}
           </Alert>
         )}
         {success && (
           <Alert severity="success" sx={{ mb: 2 }}>
             {success}
           </Alert>
         )}
 
         <form onSubmit={handleSubmit}>
           <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
               sx={{ mt: 2 }}
             >
               {submitting ? 'Updating...' : 'Update password'}
             </Button>
           </Box>
         </form>
       </Paper>
     </Box>
   );
 }
