/**
 * 📦 BTM STD UI KIT — titik impor tunggal.
 *
 * Pakai begini di halaman mana pun:
 *   import { StdPage, StatBanner, FilterGrid, DataCard, EmptyState, Ico } from '@/app/components/std';
 *
 * Ubah tampilan di sini = SEMUA halaman ikut berubah.
 */

export { default as StdPage } from './StdPage';
export { default as TopTabs } from './TopTabs';
export { default as StatBanner } from './StatBanner';
export { default as SegmentTabs } from './SegmentTabs';
export { default as FilterGrid } from './FilterGrid';
export { default as EmptyState } from './EmptyState';
export { default as DataCard } from './DataCard';
export { Ico, renderIcon } from './icons';

export type { TopTabItem } from './TopTabs';
export type { SegItem } from './SegmentTabs';
export type { FilterItem } from './FilterGrid';
export type { MetaRow, BadgeTone } from './DataCard';
export type { IcoName } from './icons';
