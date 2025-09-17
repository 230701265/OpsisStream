import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAccessibility } from '@/hooks/useAccessibility';
import { apiRequest } from '@/lib/queryClient';
import { 
  UserCheck, 
  Crown, 
  GraduationCap,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail
} from 'lucide-react';

interface SetupData {
  valid: boolean;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export default function Setup() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { announceForScreenReader } = useAccessibility();
  const [isAccepting, setIsAccepting] = useState(false);

  const token = params.token;

  const { data: setupData, isLoading, error } = useQuery({
    queryKey: ['/api/setup', token],
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (setupData?.valid) {
      announceForScreenReader(`Account setup for ${setupData.email} as ${setupData.role}. Click to complete setup and join the platform.`);
    } else if (error) {
      announceForScreenReader('Invalid or expired setup link.');
    }
  }, [setupData, error, announceForScreenReader]);

  const handleCompleteSetup = async () => {
    if (!setupData?.valid) return;
    
    setIsAccepting(true);
    
    // Store the setup data in localStorage for use after authentication
    localStorage.setItem('pendingSetup', JSON.stringify({
      token,
      email: setupData.email,
      role: setupData.role
    }));
    
    // Redirect to login to authenticate with Replit
    window.location.href = '/api/login';
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'instructor':
        return {
          icon: GraduationCap,
          label: 'Instructor',
          description: 'Create and manage exams, view student results',
          color: 'bg-blue-100 text-blue-800'
        };
      case 'student':
        return {
          icon: Users,
          label: 'Student',
          description: 'Take exams and view your results',
          color: 'bg-green-100 text-green-800'
        };
      default:
        return {
          icon: Users,
          label: role,
          description: 'Join the platform',
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Validating setup link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const setup = setupData as SetupData;

  if (error || !setup?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Invalid Setup Link</CardTitle>
            <CardDescription>
              This setup link is invalid or has expired. Please contact your administrator for a new setup link.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/')}
              data-testid="button-go-home"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleInfo = getRoleInfo(setup.role);
  const RoleIcon = roleInfo.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <UserCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Complete Your Account Setup</CardTitle>
          <CardDescription>
            Your administrator has created an account for you on OPSIS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Account Information */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {setup.email}
            </div>
            
            <div className="flex justify-center">
              <Badge variant="default" className={roleInfo.color}>
                <RoleIcon className="h-4 w-4 mr-2" />
                {roleInfo.label}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {roleInfo.description}
            </p>
            
            {(setup.firstName || setup.lastName) && (
              <p className="text-sm font-medium">
                Welcome, {setup.firstName} {setup.lastName}!
              </p>
            )}
          </div>

          {/* Features List */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">As a {setup.role}, you'll be able to:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {setup.role === 'instructor' ? (
                <>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Create and manage exams
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    View student results and analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Access accessibility features
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Take exams with full accessibility support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    View your results and progress
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Use text-to-speech and voice input
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Expiration Notice */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-yellow-50 p-3 rounded-lg">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span>This setup link expires 30 days from when it was created.</span>
          </div>

          {/* Complete Setup Button */}
          <Button 
            onClick={handleCompleteSetup}
            disabled={isAccepting}
            className="w-full"
            data-testid="button-complete-setup"
          >
            {isAccepting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Setting up...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Complete Account Setup
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By completing setup, you'll be redirected to sign in with your Replit account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}