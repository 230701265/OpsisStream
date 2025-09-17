import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AppLayout } from '@/components/layout/app-layout';
import type { User } from '@shared/schema';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Crown, 
  GraduationCap,
  Mail,
  Copy,
  Trash2,
  Edit3,
  RefreshCw,
  AlertTriangle,
  Link as LinkIcon
} from 'lucide-react';
import { EmailInvitation } from '@/components/ui/email-invitation';

interface InvitationResponse {
  inviteUrl: string;
  role: string;
  email: string | null;
  expiresIn: string;
}

interface CreateUserResponse {
  user: User;
  setupUrl: string;
  message: string;
}

export default function Admin() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const user = authUser as User;
  const { announceForScreenReader } = useAccessibility();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'instructor' | 'admin'>('all');
  const [inviteRole, setInviteRole] = useState<'student' | 'instructor'>('student');
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  
  // Create user form states
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [createUserRole, setCreateUserRole] = useState<'student' | 'instructor'>('student');
  const [createUserFirstName, setCreateUserFirstName] = useState('');
  const [createUserLastName, setCreateUserLastName] = useState('');
  const [generatedSetupLink, setGeneratedSetupLink] = useState<string | null>(null);

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: !!user && user.role === 'admin',
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      announceForScreenReader('Access denied. Admin privileges required.');
    } else {
      announceForScreenReader('Admin dashboard loaded. Manage users and send invitations.');
    }
  }, [user, announceForScreenReader]);

  // Create user directly
  const createUserMutation = useMutation({
    mutationFn: async (userData: { email: string; role: string; firstName: string; lastName: string }) => {
      const response = await apiRequest('POST', '/api/admin/create-user', userData);
      return response.json();
    },
    onSuccess: (data: CreateUserResponse) => {
      setGeneratedSetupLink(data.setupUrl);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Created",
        description: `User ${data.user.email} created successfully.`,
      });
      announceForScreenReader(`User ${data.user.email} created as ${data.user.role}`);
      // Clear form
      setCreateUserEmail('');
      setCreateUserFirstName('');
      setCreateUserLastName('');
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Admin access required.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create user. Email might already be in use.",
        variant: "destructive",
      });
    },
  });

  // Generate invitation link
  const createInviteMutation = useMutation({
    mutationFn: async (inviteData: { role: string; email: string }) => {
      const response = await apiRequest('POST', '/api/admin/invite', inviteData);
      return response.json();
    },
    onSuccess: (data: InvitationResponse) => {
      setGeneratedLink(data.inviteUrl);
      toast({
        title: "Invitation Created",
        description: `Invitation link for ${data.role} created successfully.`,
      });
      announceForScreenReader(`Invitation link created for ${data.role} role`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Admin access required.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create invitation link.",
        variant: "destructive",
      });
    },
  });

  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest('PUT', `/api/admin/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Role Updated",
        description: `User role updated to ${updatedUser.role}.`,
      });
      announceForScreenReader(`User role updated to ${updatedUser.role}`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Admin access required.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    },
  });

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Deleted",
        description: "User has been removed from the system.",
      });
      announceForScreenReader('User successfully deleted');
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Admin access required.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!createUserEmail.trim() || !createUserRole) {
      toast({
        title: "Error",
        description: "Email and role are required.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createUserEmail.trim())) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate({
      email: createUserEmail.trim(),
      role: createUserRole,
      firstName: createUserFirstName.trim(),
      lastName: createUserLastName.trim()
    });
  };

  const handleCreateInvite = () => {
    if (!inviteRole) {
      toast({
        title: "Error",
        description: "Please select a role for the invitation.",
        variant: "destructive",
      });
      return;
    }

    createInviteMutation.mutate({
      role: inviteRole,
      email: inviteEmail.trim() || ''
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: "Invitation link copied to clipboard.",
      });
      announceForScreenReader('Invitation link copied to clipboard');
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            Admin privileges are required to access this page.
          </p>
        </div>
      </div>
    );
  }

  const usersList = (users as User[]) || [];
  
  // Filter users based on search and role
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.firstName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant="default" className="bg-red-100 text-red-800">
            <Crown className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      case 'instructor':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            <GraduationCap className="h-3 w-3 mr-1" />
            Instructor
          </Badge>
        );
      case 'student':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Users className="h-3 w-3 mr-1" />
            Student
          </Badge>
        );
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getStats = () => {
    const totalUsers = usersList.length;
    const adminCount = usersList.filter(u => u.role === 'admin').length;
    const instructorCount = usersList.filter(u => u.role === 'instructor').length;
    const studentCount = usersList.filter(u => u.role === 'student').length;

    return {
      totalUsers,
      adminCount,
      instructorCount,
      studentCount
    };
  };

  const stats = getStats();

  return (
    <AppLayout 
      title="Admin Dashboard"
      description={`Admin dashboard loaded. Managing ${stats.totalUsers} users: ${stats.adminCount} admins, ${stats.instructorCount} instructors, ${stats.studentCount} students.`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, assign roles, and send invitation links to new members.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold">{stats.adminCount}</p>
                </div>
                <Crown className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Instructors</p>
                  <p className="text-2xl font-bold">{stats.instructorCount}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Students</p>
                  <p className="text-2xl font-bold">{stats.studentCount}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
            <TabsTrigger value="create" data-testid="tab-create">Create User</TabsTrigger>
            <TabsTrigger value="invites" data-testid="tab-invites">Send Invitations</TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search-users" className="sr-only">Search users</Label>
                    <Input
                      id="search-users"
                      placeholder="Search by email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-users"
                    />
                  </div>
                  <div className="sm:w-48">
                    <Label htmlFor="role-filter" className="sr-only">Filter by role</Label>
                    <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
                      <SelectTrigger data-testid="select-role-filter">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                        <SelectItem value="instructor">Instructors</SelectItem>
                        <SelectItem value="student">Students</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle>Users ({filteredUsers.length})</CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-48"></div>
                          <div className="h-3 bg-muted rounded w-32"></div>
                        </div>
                        <div className="h-8 bg-muted rounded w-24"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredUsers.map((u) => (
                      <div 
                        key={u.id} 
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <h4 className="font-medium">
                                {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : 'No name'}
                              </h4>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Joined {new Date(u.createdAt!).toLocaleDateString()}
                              </p>
                            </div>
                            {getRoleBadge(u.role)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {/* Role Update */}
                          <Select
                            value={u.role}
                            onValueChange={(newRole) => updateRoleMutation.mutate({ userId: u.id, role: newRole })}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-role-${u.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="instructor">Instructor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Delete User */}
                          {u.id !== user.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  data-testid={`button-delete-${u.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {u.email}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUserMutation.mutate(u.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create User Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Create New User
                </CardTitle>
                <CardDescription>
                  Create a user account directly and provide them with a setup link to complete their registration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="create-first-name">First Name</Label>
                      <Input
                        id="create-first-name"
                        placeholder="John"
                        value={createUserFirstName}
                        onChange={(e) => setCreateUserFirstName(e.target.value)}
                        data-testid="input-create-first-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="create-last-name">Last Name</Label>
                      <Input
                        id="create-last-name"
                        placeholder="Doe"
                        value={createUserLastName}
                        onChange={(e) => setCreateUserLastName(e.target.value)}
                        data-testid="input-create-last-name"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="create-email">Email *</Label>
                    <Input
                      id="create-email"
                      type="email"
                      placeholder="user@example.com"
                      value={createUserEmail}
                      onChange={(e) => setCreateUserEmail(e.target.value)}
                      data-testid="input-create-email"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="create-role">Role *</Label>
                    <Select value={createUserRole} onValueChange={(value: any) => setCreateUserRole(value)}>
                      <SelectTrigger data-testid="select-create-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="instructor">Instructor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleCreateUser}
                    disabled={createUserMutation.isPending || !createUserEmail.trim()}
                    data-testid="button-create-user"
                  >
                    {createUserMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create User Account
                      </>
                    )}
                  </Button>
                </div>

                {/* Generated Setup Link */}
                {generatedSetupLink && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-green-800">User Created Successfully</CardTitle>
                      <CardDescription className="text-green-700">
                        Share this setup link with the new user. They have 30 days to complete their account setup.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Input
                          value={generatedSetupLink}
                          readOnly
                          className="flex-1 bg-white"
                          data-testid="input-generated-setup-link"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generatedSetupLink)}
                          data-testid="button-copy-setup-link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-green-700 mt-2">
                        The user account has been created and added to your user list. Send them this link to complete their setup.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invites" className="space-y-6">
            <EmailInvitation />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}