import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storageKey = 'preferred-theme';
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<Theme>('light');
  readonly isDark = computed(() => this.theme() === 'dark');

  init(): void {
    const storedTheme = this.readStoredTheme();
    const preferredTheme = storedTheme ?? this.getSystemTheme();
    this.setTheme(preferredTheme, false);
  }

  setTheme(theme: Theme, persist = true): void {
    this.theme.set(theme);
    this.document.documentElement.classList.toggle('dark', theme === 'dark');
    this.document.documentElement.style.colorScheme = theme;

    if (persist && this.hasWindow()) {
      window.localStorage.setItem(this.storageKey, theme);
    }
  }

  toggleTheme(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  private readStoredTheme(): Theme | null {
    if (!this.hasWindow()) {
      return null;
    }

    const value = window.localStorage.getItem(this.storageKey);
    return value === 'dark' || value === 'light' ? value : null;
  }

  private getSystemTheme(): Theme {
    if (!this.hasWindow() || typeof window.matchMedia !== 'function') {
      return 'light';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private hasWindow(): boolean {
    return typeof window !== 'undefined';
  }
}
