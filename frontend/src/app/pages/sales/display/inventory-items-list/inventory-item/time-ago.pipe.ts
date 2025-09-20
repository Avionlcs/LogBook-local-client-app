import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'timeAgo', standalone: true })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined): string {
    if (!value) return '—';
    const then = new Date(value).getTime();
    if (isNaN(then)) return '—';

    const now = Date.now();
    const diff = Math.max(0, now - then);

    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;

    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;

    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;

    const d = Math.floor(h / 24);
    if (d === 1) return 'yesterday';
    if (d < 7) return `${d}d ago`;

    const w = Math.floor(d / 7);
    if (w < 5) return `${w}w ago`;

    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo}mo ago`;

    const y = Math.floor(d / 365);
    return `${y}y ago`;
  }
}
