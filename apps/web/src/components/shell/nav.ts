import type { ComponentType, SVGProps } from 'react';
import {
  DictionaryIcon,
  HomeIcon,
  LabIcon,
  LibraryIcon,
  PracticeIcon,
  ProfileIcon,
} from '../icons';

/**
 * Navigation model (UI-3, COMPONENT_SPEC_V2 §6–8, RESPONSIVE_V2 §2). Labels are the M0 labels
 * (no rename, no fake destinations: "Thư viện" and a future "Học bài" stay distinct, D-039 IA).
 * Order follows the spec: home · practice · dictionary · library; the phone bottom bar adds
 * "Thêm" (sheet) for the secondary group.
 */
export interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const PRIMARY: NavItem[] = [
  { href: '/', label: 'Trang chủ', Icon: HomeIcon },
  { href: '/practice', label: 'Luyện tập', Icon: PracticeIcon },
  { href: '/dictionary', label: 'Từ điển cá nhân', Icon: DictionaryIcon },
  { href: '/library', label: 'Thư viện', Icon: LibraryIcon },
];

export const SECONDARY: NavItem[] = [
  { href: '/profile', label: 'Hồ sơ', Icon: ProfileIcon },
  { href: '/lab', label: 'Phòng thử M0', Icon: LabIcon },
];

export const isActive = (path: string, href: string) =>
  href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);
