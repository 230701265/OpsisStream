import { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, AuthError } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAccessibility } from '@/hooks/useAccessibility';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';

export function FirebaseAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const { announceForScreenReader, speakWithPreferences } = useAccessibility();
  const { toast } = useToast();

  // Auto-announce the page when it loads
  useEffect(() => {
    const timer = setTimeout(() => {
      announceForScreenReader('OPSIS Authentication page loaded. Press Tab to navigate or use Ctrl+H for main content.');
      speakWithPreferences('Welcome to OPSIS, the accessible exam platform. This is the sign-in page. Use the Continue with Google button to sign in to your account.');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [announceForScreenReader, speakWithPreferences]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(auth, provider);
      
      announceForScreenReader('Successfully signed in with Google to OPSIS');
      toast({
        title: "Welcome to OPSIS!",
        description: `Hello ${result.user.displayName || result.user.email}! You've successfully signed in.`,
      });
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = "Failed to sign in with Google. Please try again.";
      
      switch (authError.code) {
        case 'auth/unauthorized-domain':
          errorMessage = "This domain is not authorized for Google sign-in. Please contact the administrator to add this domain to Firebase authorized domains.";
          break;
        case 'auth/popup-blocked':
          errorMessage = "Pop-up was blocked. Please allow pop-ups and try again.";
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = "Sign-in was cancelled. Please try again.";
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = "Sign-in was cancelled. Please try again.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your connection and try again.";
          break;
        default:
          console.error('Google sign-in error:', authError);
      }
      
      announceForScreenReader(errorMessage);
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">O</span>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to OPSIS</CardTitle>
          <CardDescription>
            Accessible Online Exam Platform
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to your OPSIS account using Google
              </p>
              
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm"
                size="lg"
                data-testid="button-google-signin"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-3"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
              
              <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Setup Required:</strong> This domain needs to be added to Firebase's authorized domains list. 
                  Please add the current domain to your Firebase project's Authentication settings.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Accessibility Features
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
              <li>• Advanced voice controls for navigation</li>
              <li>• Full screen reader compatibility</li>
              <li>• Customizable text-to-speech</li>
              <li>• High-contrast themes available</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}