import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from './navbar';

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let component: Navbar;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Initial state ──

  it('should create with correct defaults', () => {
    expect(component).toBeTruthy();
    expect(component.menuOpen).toBe(false);
    expect(component.darkMode).toBe(false);
    expect(component.language).toBe('no');
    expect(component.isHidden).toBe(false);
  });

  // ── Logo ──

  it('should render the Geomatikk logo', () => {
    const logo = fixture.debugElement.query(By.css('img[alt="Geomatikk"]'));
    expect(logo).toBeTruthy();
    expect(logo.nativeElement.src).toContain('Geomatikk-logo.png');
  });

  // ── Menu items ──

  it('should return 4 menu items with correct actions', () => {
    expect(component.menuItems.length).toBe(4);
    const actions = component.menuItems.map((item) => item.action);
    expect(actions).toEqual(['user', 'statistics', 'language', 'darkmode']);
  });

  it('should reflect current language and darkMode state in menu items', () => {
    component.language = 'en';
    component.darkMode = true;
    const labels = component.menuItems.map((item) => item.label);
    expect(labels).toContain('Norsk');
    expect(labels).toContain('Lys modus');
  });

  // ── onMenuSelect ──

  it('should call correct handler for each menu action', () => {
    const darkSpy = vi.spyOn(component, 'toggleDarkMode');
    const langSpy = vi.spyOn(component, 'toggleLanguage');

    component.onMenuSelect({ value: { label: '', icon: '', action: 'darkmode' } });
    expect(darkSpy).toHaveBeenCalled();

    component.onMenuSelect({ value: { label: '', icon: '', action: 'language' } });
    expect(langSpy).toHaveBeenCalled();

    component.menuOpen = true;
    component.onMenuSelect({ value: { label: '', icon: '', action: 'statistics' } });
    expect(component.menuOpen).toBe(false);
  });

  it('should do nothing when event value is null', () => {
    component.menuOpen = true;
    component.onMenuSelect({ value: null });
    expect(component.menuOpen).toBe(true);
  });

  // ── toggleDarkMode ──

  it('should toggle darkMode and update document class', () => {
    component.toggleDarkMode();
    expect(component.darkMode).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    component.toggleDarkMode();
    expect(component.darkMode).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  // ── toggleLanguage ──

  it('should toggle language between "no" and "en"', () => {
    component.toggleLanguage();
    expect(component.language).toBe('en');
    component.toggleLanguage();
    expect(component.language).toBe('no');
  });

  // ── Scroll hide/show ──

  it('should hide navbar on scroll down and show on scroll up', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(100);
    component.onScroll();
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(200);
    component.onScroll();
    expect(component.isHidden).toBe(true);

    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(180);
    component.onScroll();
    expect(component.isHidden).toBe(false);
  });

  it('should not hide navbar when near the top of the page', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
    component.onScroll();
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(50);
    component.onScroll();
    expect(component.isHidden).toBe(false);
  });

  it('should ignore scroll deltas smaller than threshold', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(100);
    component.onScroll();
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(200);
    component.onScroll();
    expect(component.isHidden).toBe(true);

    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(195);
    component.onScroll();
    expect(component.isHidden).toBe(true);
  });

  // ── Cleanup ──

  afterEach(() => {
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });
});
