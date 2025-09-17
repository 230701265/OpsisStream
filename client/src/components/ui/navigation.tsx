import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatShortcut, isMac } from '@/lib/platform';
import { 
  Home as HomeIcon, 
  ClipboardList, 
  BarChart3, 
  Settings, 
  HelpCircle,
  Eye,
  PlusCircle,
  Shield
} from 'lucide-react';
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarSeparator,
  SidebarFooter
} from '@/components/ui/sidebar';

interface NavigationProps {
  examCount?: number;
  userRole?: 'student' | 'instructor' | 'admin';
}

const getNavigationItems = () => {
  const modifier = isMac() ? '⌘' : 'Alt';
  return [
    { href: '/', label: 'Dashboard', icon: HomeIcon, shortcut: `${modifier}+H` },
    { href: '/exams', label: 'My Exams', icon: ClipboardList, shortcut: `${modifier}+E` },
    { href: '/results', label: 'Results', icon: BarChart3, shortcut: `${modifier}+R` },
    { href: '/accessibility-settings', label: 'Accessibility', icon: Eye, shortcut: `${modifier}+S` },
    { href: '/voice-commands-help', label: 'Voice Help', icon: HelpCircle, shortcut: 'F1' },
  ];
};

const getInstructorItems = () => {
  const modifier = isMac() ? '⌘' : 'Alt';
  return [
    { href: '/exam-authoring', label: 'Create Exam', icon: PlusCircle, shortcut: `${modifier}+C` },
  ];
};

const getAdminItems = () => {
  const modifier = isMac() ? '⌘' : 'Alt';
  return [
    { href: '/admin', label: 'Admin Panel', icon: Shield, shortcut: `${modifier}+A` },
  ];
};

export function Navigation({ examCount = 0, userRole = 'student' }: NavigationProps) {
  const [location] = useLocation();
  
  const navigationItems = getNavigationItems();
  const instructorItems = getInstructorItems();
  const adminItems = getAdminItems();

  let allItems = navigationItems;
  
  if (userRole === 'admin') {
    allItems = [...navigationItems.slice(0, 2), ...instructorItems, ...adminItems, ...navigationItems.slice(2)];
  } else if (userRole === 'instructor') {
    allItems = [...navigationItems.slice(0, 2), ...instructorItems, ...navigationItems.slice(2)];
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link 
                        href={item.href}
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Icon />
                        <span>{item.label}</span>
                        {item.href === '/exams' && examCount > 0 && (
                          <SidebarMenuBadge data-testid="badge-exam-count">
                            {examCount}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Quick Keys</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="text-xs text-sidebar-foreground/70 space-y-2 px-2">
              {allItems.slice(0, 5).map((item) => (
                <div key={item.href} className="flex justify-between items-center">
                  <span className="truncate">{item.label}</span>
                  <kbd className="font-mono bg-sidebar-accent px-1 py-0.5 rounded text-xs shrink-0 ml-2">
                    {item.shortcut}
                  </kbd>
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}