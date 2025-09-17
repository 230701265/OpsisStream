import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { 
  Mail,
  Send,
  Copy,
  Check,
  AlertCircle,
  Users,
  UserPlus
} from 'lucide-react';

interface EmailInvitationProps {
  onInvitationSent?: (inviteData: any) => void;
}

export function EmailInvitation({ onInvitationSent }: EmailInvitationProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const createInvitationMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const response = await apiRequest('/api/admin/invite', 'POST', { email, role });
      return response;
    },
    onSuccess: (data: any) => {
      setInviteUrl(data.inviteUrl);
      toast({
        title: "Invitation created",
        description: `Invitation link generated for ${email || 'new user'} as ${role}`,
      });
      onInvitationSent?.(data);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error creating invitation",
        description: error instanceof Error ? error.message : "Failed to create invitation",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      toast({
        title: "Error",
        description: "Please select a role for the invitation",
        variant: "destructive",
      });
      return;
    }
    createInvitationMutation.mutate({ email, role });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Invitation link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const emailTemplate = `Hi there!

You've been invited to join OPSIS, an accessible online exam platform.

Your role: ${role.charAt(0).toUpperCase() + role.slice(1)}

Click the link below to complete your registration:
${inviteUrl}

OPSIS is designed with accessibility in mind, featuring:
- Advanced voice controls for navigation and exam taking
- Screen reader compatibility
- Customizable text-to-speech
- High-contrast themes
- Keyboard navigation throughout

If you have any questions, please contact your administrator.

Welcome to OPSIS!`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Invitation
          </CardTitle>
          <CardDescription>
            Generate an invitation link for a new user to join the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-invitation-email"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to create a generic invitation link
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">User Role</Label>
                <Select value={role} onValueChange={(value: 'student' | 'instructor') => setRole(value)}>
                  <SelectTrigger data-testid="select-invitation-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={createInvitationMutation.isPending}
              data-testid="button-create-invitation"
              className="w-full"
            >
              {createInvitationMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Creating Invitation...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create Invitation Link
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {inviteUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitation Ready
            </CardTitle>
            <CardDescription>
              Share this link with the new user to complete their registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="capitalize">
                {role}
              </Badge>
              {email && <Badge variant="outline">{email}</Badge>}
            </div>

            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={inviteUrl}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-invitation-url"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  data-testid="button-copy-invitation"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Email Template</Label>
              <Textarea
                value={emailTemplate}
                readOnly
                rows={15}
                className="font-mono text-sm"
                data-testid="textarea-email-template"
              />
              <p className="text-xs text-muted-foreground">
                Copy this template to send via your preferred email service
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Email Service Setup
                  </p>
                  <p className="text-blue-700 dark:text-blue-200 mt-1">
                    To automatically send invitations, configure an email service like SendGrid, 
                    Mailgun, or use EmailJS for free email sending. The invitation link and 
                    template are ready to be sent through any email service.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}