import type { ComponentType } from 'preact';
import { Droplet, Dumbbell, CalendarDays, BookOpen, Coins, Utensils, Music, Leaf, Moon, Heart, ListChecks, Timer, Coffee, Sun, Cloud, KeyRound, AppWindow } from 'lucide-preact';

type Icon = ComponentType<{ size?: number | string; strokeWidth?: number | string }>;
export const ICONS: Record<string, Icon> = {
  drop: Droplet, dumbbell: Dumbbell, cal: CalendarDays, book: BookOpen, coins: Coins, utensils: Utensils, music: Music,
  leaf: Leaf, moon: Moon, heart: Heart, list: ListChecks, timer: Timer, coffee: Coffee, sun: Sun, cloud: Cloud, key: KeyRound,
};
export const getIcon = (name: string): Icon => ICONS[name] ?? AppWindow;
