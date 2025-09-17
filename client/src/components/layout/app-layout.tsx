import { useAuth } from '@/hooks/useAuth';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { useAccessibility } from '@/hooks/useAccessibility';
import { Button } from '@/components/ui/button';
import { AccessibilityToolbar } from '@/components/ui/accessibility-toolbar';
import { SkipLinks } from '@/components/ui/skip-links';
import { Navigation } from '@/components/ui/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useQuery } from '@tanstack/react-query';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AppLayout({ children, title, description }: AppLayoutProps) {
  const { user } = useAuth();
  const { announceForScreenReader } = useAccessibility();

  // Get exam count for badge
  const { data: exams } = useQuery({
    queryKey: ["/api/exams"],
    enabled: !!user,
  });

  const examCount = (exams as any[])?.filter((exam: any) => exam.published)?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <SkipLinks />
      
      <SidebarProvider>
        <div className="flex flex-1">
          <Navigation 
            examCount={examCount}
            userRole={(user as any)?.role}
          />
          
          <SidebarInset className="flex-1">
            {/* Header */}
            <header role="banner" className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center space-x-4">
                    <SidebarTrigger className="lg:hidden" />
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-primary-foreground font-bold text-lg">O</span>
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-primary">
                          <span aria-label="OPSIS - Accessible Exam Platform">OPSIS</span>
                        </h1>
                        <p className="text-xs text-muted-foreground hidden sm:block">Accessible Exam Platform</p>
                      </div>
                    </div>
                    {title && (
                      <div className="hidden md:flex items-center">
                        <div className="w-px h-6 bg-border mx-4"></div>
                        <div>
                          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                          <p className="text-xs text-muted-foreground capitalize">
                            {(user as any)?.role} Dashboard
                          </p>
                        </div>
                      </div>
                    )}
                    {title && (
                      <div className="sr-only" aria-live="polite" id="page-title">
                        {title} - {(user as any)?.role === 'instructor' ? 'Instructor' : 'Student'} View
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4" id="accessibility-toolbar">
                    <AccessibilityToolbar />
                    <div className="flex items-center space-x-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-foreground" data-testid="text-username">
                          {(user as any)?.firstName} {(user as any)?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {(user as any)?.role}
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {((user as any)?.firstName?.[0] || 'U').toUpperCase()}
                        </span>
                      </div>
                      <LogoutButton className="hidden sm:flex" />
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main id="main-content" tabIndex={-1} className="flex-1 p-6 overflow-auto" role="main">
              {description && (
                <div className="sr-only" aria-live="polite" id="announcements">
                  {description}
                </div>
              )}
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}