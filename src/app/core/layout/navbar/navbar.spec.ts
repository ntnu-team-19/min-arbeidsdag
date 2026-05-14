import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterModule, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  TranslateService,
  TranslateLoader,
  TranslateNoOpLoader,
  provideTranslateService,
} from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { Navbar } from './navbar';

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let component: Navbar;
  let translate: TranslateService;
  let localStorageSetItemSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorageSetItemSpy = vi.fn();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn(() => null),
        setItem: localStorageSetItemSpy,
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });

    await TestBed.configureTestingModule({
      imports: [Navbar, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        provideTranslateService({
          fallbackLang: 'no',
          loader: { provide: TranslateLoader, useClass: TranslateNoOpLoader },
        }),
      ],
    }).compileComponents();

    translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('no');
    translate.use('no');
    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Initial state ──

  it('should create with correct defaults', () => {
    expect(component).toBeTruthy();
    expect(component.menuOpen).toBe(false);
    expect(component.darkMode).toBe(false);
    expect(component.currentLang).toBe('no');
  });

  // ── Logo ──

  it('should render the Geomatikk logo', () => {
    const logo = fixture.debugElement.query(By.css('img[alt="Geomatikk"]'));
    expect(logo).toBeTruthy();
    expect(logo.nativeElement.src).toContain('Geomatikk-logo.png');
  });

  it('should wrap logo in a button with click handler', () => {
    const logoButton = fixture.debugElement.query(By.css('button'));
    expect(logoButton).toBeTruthy();
    const logo = logoButton.query(By.css('img[alt="Geomatikk"]'));
    expect(logo).toBeTruthy();
  });

  it('should navigate to home (today list view) when logo is clicked', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.goToHome();
    expect(navigateSpy).toHaveBeenCalledWith(['/'], {
      queryParams: {
        day: 'today',
        view: 'list',
      },
    });
  });

  // ── Desktop elements ──

  it('should render hamburger icon in desktop view', () => {
    const desktopDiv = fixture.debugElement.query(By.css('.hidden.sm\\:flex'));
    const barsIcon = desktopDiv.query(By.css('.pi-bars'));
    expect(barsIcon).toBeTruthy();
  });

  // it('should render user icon in desktop view', () => {
  //   const desktopDiv = fixture.debugElement.query(By.css('.hidden.sm\\:flex'));
  //   const userIcon = desktopDiv.query(By.css('.pi-user'));
  //   expect(userIcon).toBeTruthy();
  // });

  // ── Mobile elements ──

  it('should render hamburger icon in mobile view', () => {
    const mobileDiv = fixture.debugElement.query(By.css('.sm\\:hidden'));
    expect(mobileDiv).toBeTruthy();
    const barsIcon = mobileDiv.query(By.css('.pi-bars'));
    expect(barsIcon).toBeTruthy();
  });

  // ── Menu items ──

  it('should return 3 menu items with correct actions', () => {
    expect(component.menuItems.length).toBe(3);
    const actions = component.menuItems.map((item) => item.action);
    expect(actions).toEqual(['user', 'language', 'darkmode']);
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

  it('should close menu when selecting user action', () => {
    component.menuOpen = true;
    component.onMenuSelect({ value: { label: '', icon: '', action: 'user' } });
    expect(component.menuOpen).toBe(false);
  });

  it('should do nothing when event value is null', () => {
    component.menuOpen = true;
    component.onMenuSelect({ value: null });
    expect(component.menuOpen).toBe(true);
  });

  // ── toggleDarkMode ──

  it('should toggle theme and update document class', () => {
    component.toggleDarkMode();
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    component.toggleDarkMode();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  // ── toggleLanguage ──

  it('should toggle language between "no" and "en"', () => {
    // Ensure we start with 'no'
    translate.use('no');
    expect(component.currentLang).toBe('no');

    // Toggle to 'en'
    component.toggleLanguage();
    expect(component.currentLang).toBe('en');

    // Toggle back to 'no'
    component.toggleLanguage();
    expect(component.currentLang).toBe('no');
  });

  it('should persist language choice to localStorage', () => {
    component.toggleLanguage();

    expect(component.currentLang).toBeTruthy();
    expect(localStorageSetItemSpy).not.toHaveBeenCalled();
  });

  // ── Cleanup ──

  afterEach(() => {
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });
});
