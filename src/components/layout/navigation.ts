import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import type { SvgIconComponent } from '@mui/icons-material';

export interface NavItem {
  label: string;
  href: string;
  icon: SvgIconComponent;
  /** Exact match only - otherwise "/" would light up on every route. */
  exact?: boolean;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: GridViewRoundedIcon,
    exact: true,
    description: 'Portfolio overview and recent activity',
  },
  {
    label: 'New Research',
    href: '/research/new',
    icon: TravelExploreRoundedIcon,
    description: 'Research a new app idea',
  },
  {
    label: 'Research History',
    href: '/history',
    icon: HistoryRoundedIcon,
    description: 'Everything you have researched',
  },
  {
    label: 'Competitors',
    href: '/competitors',
    icon: StorefrontRoundedIcon,
    description: 'Every app seen across your research',
  },
  {
    label: 'AI Opportunities',
    href: '/opportunities',
    icon: AutoAwesomeRoundedIcon,
    description: 'Scored opportunities, ranked',
  },
  {
    label: 'Saved Ideas',
    href: '/saved',
    icon: BookmarkRoundedIcon,
    description: 'Ideas you have bookmarked',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: SettingsRoundedIcon,
    description: 'API keys, limits and data',
  },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
