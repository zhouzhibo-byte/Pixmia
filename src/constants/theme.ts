import { AspectRatio } from '../types';

export const COLORS = {
  bg: '#F7F7F4',
  surface: '#FFFFFF',
  ink: '#141414',
  inkSoft: '#3A3A3C',
  sub: '#8A8A8E',
  faint: '#B9B9BE',
  line: '#EDEDE9',
  canvas: '#EFEFEA',
  brand: '#5A5BF0',
  brandDeep: '#4B32E8',
  brandSoft: '#EEEEFF',
  lavender: '#A66BFF',
  lime: '#D8FF63',
  danger: '#F04438',
  dangerSoft: '#FEF0EF',
  white: '#FFFFFF',
  overlay: 'rgba(17, 17, 17, 0.55)',
} as const;

export const SPACING = {
  page: 20,
  gap: 12,
  radius: 24,
  radiusSmall: 14,
  radiusPill: 999,
} as const;

export const RATIOS: { key: AspectRatio; label: string; width: number; height: number }[] = [
  { key: '1:1', label: '1:1', width: 1, height: 1 },
  { key: '3:4', label: '3:4', width: 3, height: 4 },
  { key: '4:3', label: '4:3', width: 4, height: 3 },
  { key: '16:9', label: '16:9', width: 16, height: 9 },
  { key: '9:16', label: '9:16', width: 9, height: 16 },
];

export function ratioValue(ratio: AspectRatio): number {
  const found = RATIOS.find((item) => item.key === ratio);
  return found ? found.width / found.height : 1;
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}
