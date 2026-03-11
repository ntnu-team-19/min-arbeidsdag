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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have menuOpen set to false initially', () => {
    expect(component.menuOpen).toBe(false);
  });

  it('should have darkMode set to false initially', () => {
    expect(component.darkMode).toBe(false);
  });

  it('should have language set to "no" initially', () => {
    expect(component.language).toBe('no');
  });

  // ── Logo ──

  it('should render the Geomatikk logo', () => {
    const logo = fixture.debugElement.query(By.css('img[alt="Geomatikk"]'));
    expect(logo).toBeTruthy();
    expect(logo.nativeElement.src).toContain('Geomatikk-logo.png');
  });

  // ── Menu items ──

  it('should return 4 menu items', () => {
    expect(component.menuItems.length).toBe(4);
  });

  it('should have correct actions on menu items', () => {
    const actions = component.menuItems.map((item) => item.action);
    expect(actions).toEqual(['user', 'statistics', 'language', 'darkmode']);
  });

  it('should show "English" as language label when language is "no"', () => {
    component.language = 'no';
    const languageItem = component.menuItems.find((item) => item.action === 'language');
    expect(languageItem?.label).toBe('English');
  });

  it('should show "Norsk" as language label when language is "en"', () => {
    component.language = 'en';
    const languageItem = component.menuItems.find((item) => item.action === 'language');
    expect(languageItem?.label).toBe('Norsk');
  });

  it('should show "Mørk modus" with moon icon when darkMode is false', () => {
    component.darkMode = false;
    const darkModeItem = component.menuItems.find((item) => item.action === 'darkmode');
    expect(darkModeItem?.label).toBe('Mørk modus');
    expect(darkModeItem?.icon).toBe('pi pi-moon');
  });

  it('should show "Lys modus" with sun icon when darkMode is true', () => {
    component.darkMode = true;
    const darkModeItem = component.menuItems.find((item) => item.action === 'darkmode');
    expect(darkModeItem?.label).toBe('Lys modus');
    expect(darkModeItem?.icon).toBe('pi pi-sun');
  });

  // ── toggleDarkMode ──

  it('should toggle darkMode from false to true', () => {
    component.darkMode = false;
    component.toggleDarkMode();
    expect(component.darkMode).toBe(true);
  });

  it('should toggle darkMode from true to false', () => {
    component.darkMode = true;
    component.toggleDarkMode();
    expect(component.darkMode).toBe(false);
  });

  it('should add "dark" class to document element when enabling dark mode', () => {
    component.darkMode = false;
    component.toggleDarkMode();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should remove "dark" class from document element when disabling dark mode', () => {
    document.documentElement.classList.add('dark');
    component.darkMode = true;
    component.toggleDarkMode();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  // ── toggleLanguage ──

  it('should toggle language from "no" to "en"', () => {
    component.language = 'no';
    component.toggleLanguage();
    expect(component.language).toBe('en');
  });

  it('should toggle language from "en" to "no"', () => {
    component.language = 'en';
    component.toggleLanguage();
    expect(component.language).toBe('no');
  });

  // ── onMenuSelect ──

  it('should call toggleDarkMode when darkmode action is selected', () => {
    const spy = vi.spyOn(component, 'toggleDarkMode');
    component.onMenuSelect({
      value: { label: 'Mørk modus', icon: 'pi pi-moon', action: 'darkmode' },
    });
    expect(spy).toHaveBeenCalled();
  });

  it('should call toggleLanguage when language action is selected', () => {
    const spy = vi.spyOn(component, 'toggleLanguage');
    component.onMenuSelect({
      value: { label: 'English', icon: 'pi pi-language', action: 'language' },
    });
    expect(spy).toHaveBeenCalled();
  });

  it('should close menu when statistics action is selected', () => {
    component.menuOpen = true;
    component.onMenuSelect({
      value: { label: 'Statistikk', icon: 'pi pi-chart-bar', action: 'statistics' },
    });
    expect(component.menuOpen).toBe(false);
  });

  it('should close menu when user action is selected', () => {
    component.menuOpen = true;
    component.onMenuSelect({
      value: { label: 'User', icon: 'pi pi-user', action: 'user' },
    });
    expect(component.menuOpen).toBe(false);
  });

  it('should do nothing when event value is null', () => {
    component.menuOpen = true;
    component.darkMode = false;
    component.language = 'no';
    component.onMenuSelect({ value: null });
    expect(component.menuOpen).toBe(true);
    expect(component.darkMode).toBe(false);
    expect(component.language).toBe('no');
  });

  // ── Desktop elements ──

  it('should render bell icon in desktop view', () => {
    const desktopDiv = fixture.debugElement.query(By.css('.hidden.sm\\:flex'));
    expect(desktopDiv).toBeTruthy();
    const bellIcon = desktopDiv.query(By.css('.pi-bell'));
    expect(bellIcon).toBeTruthy();
  });

  it('should render hamburger icon in desktop view', () => {
    const desktopDiv = fixture.debugElement.query(By.css('.hidden.sm\\:flex'));
    const barsIcon = desktopDiv.query(By.css('.pi-bars'));
    expect(barsIcon).toBeTruthy();
  });

  it('should render user button with text "User" in desktop view', () => {
    const desktopDiv = fixture.debugElement.query(By.css('.hidden.sm\\:flex'));
    const userSpan = desktopDiv.query(By.css('span'));
    expect(userSpan.nativeElement.textContent.trim()).toBe('User');
  });

  // ── Mobile elements ──

  it('should render bell icon in mobile view', () => {
    const mobileDiv = fixture.debugElement.query(By.css('.sm\\:hidden'));
    expect(mobileDiv).toBeTruthy();
    const bellIcon = mobileDiv.query(By.css('.pi-bell'));
    expect(bellIcon).toBeTruthy();
  });

  it('should render hamburger icon in mobile view', () => {
    const mobileDiv = fixture.debugElement.query(By.css('.sm\\:hidden'));
    const barsIcon = mobileDiv.query(By.css('.pi-bars'));
    expect(barsIcon).toBeTruthy();
  });

  // ── Cleanup ──

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });
});
