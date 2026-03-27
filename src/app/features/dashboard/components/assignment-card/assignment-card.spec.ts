import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideTranslateService, TranslateNoOpLoader, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { AssignmentCard } from './assignment-card';
import { Assignment } from '../../../../core/models/assignment-card.model';
import { describe, expect, it, vi } from 'vitest';

describe('AssignmentCard', () => {
  let component: AssignmentCard;
  let fixture: ComponentFixture<AssignmentCard>;
  let translateService: TranslateService;

  const mockAssignment: Assignment = {
    id: '1',
    title: 'Lokalisere rør',
    shortDescription:
      'Kartlegge og registrere nøyaktig posisjon og dybde på nedgravde kabler ved hjelp av spesialutstyr.',
    time: '09:30',
    address: 'Klæbuveien 123',
    phoneNumber: '+47 876 54 321',
    status: 'upcoming',
    date: '2026-02-19',
  };

  async function createComponent(assignment: Assignment = mockAssignment) {
    await TestBed.configureTestingModule({
      imports: [AssignmentCard],
      providers: [
        provideRouter([]),
        provideTranslateService({
          fallbackLang: 'no',
          loader: { provide: TranslateLoader, useClass: TranslateNoOpLoader },
        }),
      ],
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('no');
    translateService.setTranslation('no', {
      status: {
        upcoming: 'Kommende oppdrag',
        ongoing: 'Pågående oppdrag',
        next: 'Neste oppdrag',
        completed: 'Fullført oppdrag',
        cancelled: 'Avlyst oppdrag',
        confirmed: 'Bekreftet for i morgen',
        unconfirmed: 'Ikke bekreftet for i morgen',
      },
      assignment: {
        notSpecified: 'Ikke oppgitt',
        today: 'I dag',
        tomorrow: 'I morgen',
        markConfirmed: 'Marker som bekreftet',
        markUnconfirmed: 'Marker som ikke bekreftet',
      },
    });
    translateService.use('no');

    fixture = TestBed.createComponent(AssignmentCard);
    component = fixture.componentInstance;
    component.assignment = assignment;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('should create', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  it('should render assignment title, description, time, address and phone number', async () => {
    await createComponent();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Lokalisere rør');
    expect(text).toContain(
      'Kartlegge og registrere nøyaktig posisjon og dybde på nedgravde kabler ved hjelp av spesialutstyr.',
    );
    expect(text).toContain('09:30');
    expect(text).toContain('Klæbuveien 123');
    expect(text).toContain('+47 876 54 321');
  });

  // ── Status labels ──

  it('should show correct label for upcoming status', async () => {
    await createComponent({ ...mockAssignment, status: 'upcoming' });
    expect(component.currentStatus.label).toBe('status.upcoming');
  });

  it('should show correct label for ongoing status', async () => {
    await createComponent({ ...mockAssignment, status: 'ongoing' });
    expect(component.currentStatus.label).toBe('status.ongoing');
  });

  it('should show correct label for next status', async () => {
    await createComponent({ ...mockAssignment, status: 'next' });
    expect(component.currentStatus.label).toBe('status.next');
  });

  it('should show correct label for completed status', async () => {
    await createComponent({ ...mockAssignment, status: 'completed' });
    expect(component.currentStatus.label).toBe('status.completed');
  });

  it('should show correct label for cancelled status', async () => {
    await createComponent({ ...mockAssignment, status: 'cancelled' });
    expect(component.currentStatus.label).toBe('status.cancelled');
  });

  it('should show correct label for confirmed status', async () => {
    await createComponent({ ...mockAssignment, status: 'confirmed' });
    expect(component.currentStatus.label).toBe('status.confirmed');
  });

  it('should show correct label for unconfirmed status', async () => {
    await createComponent({ ...mockAssignment, status: 'unconfirmed' });
    expect(component.currentStatus.label).toBe('status.unconfirmed');
  });

  // ── Status icons ──

  it('should render circle icon for upcoming status', async () => {
    await createComponent({ ...mockAssignment, status: 'upcoming' });
    expect(fixture.debugElement.query(By.css('.pi-circle'))).toBeTruthy();
  });

  it('should render circle icon for ongoing status', async () => {
    await createComponent({ ...mockAssignment, status: 'ongoing' });
    expect(fixture.debugElement.query(By.css('.pi-circle'))).toBeTruthy();
  });

  it('should render arrow-circle-right icon for next status', async () => {
    await createComponent({ ...mockAssignment, status: 'next' });
    expect(fixture.debugElement.query(By.css('.pi-arrow-circle-right'))).toBeTruthy();
  });

  it('should render check-circle icon for completed status', async () => {
    await createComponent({ ...mockAssignment, status: 'completed' });
    expect(fixture.debugElement.query(By.css('.pi-check-circle'))).toBeTruthy();
  });

  it('should render times-circle icon for cancelled status', async () => {
    await createComponent({ ...mockAssignment, status: 'cancelled' });
    expect(fixture.debugElement.query(By.css('.pi-times-circle'))).toBeTruthy();
  });

  // ── Status text color ──

  it('should use white text for next status', async () => {
    await createComponent({ ...mockAssignment, status: 'next' });
    const bar = fixture.debugElement.query(By.css('div[class*="bg-"]'));
    const span = bar.query(By.css('.text-white'));
    expect(span).toBeTruthy();
  });

  it('should use white text for confirmed status', async () => {
    await createComponent({ ...mockAssignment, status: 'confirmed' });
    const bar = fixture.debugElement.query(By.css('div[class*="bg-"]'));
    const span = bar.query(By.css('.text-white'));
    expect(span).toBeTruthy();
  });

  it('should use black text for upcoming status', async () => {
    await createComponent({ ...mockAssignment, status: 'upcoming' });
    const bar = fixture.debugElement.query(By.css('div[class*="bg-"]'));
    const span = bar.query(By.css('.text-black'));
    expect(span).toBeTruthy();
  });

  it('should use black text for ongoing status', async () => {
    await createComponent({ ...mockAssignment, status: 'ongoing' });
    const bar = fixture.debugElement.query(By.css('div[class*="bg-"]'));
    const span = bar.query(By.css('.text-black'));
    expect(span).toBeTruthy();
  });

  // ── Fallback text ──

  it('should show fallback text when phone number is missing', async () => {
    await createComponent({ ...mockAssignment, phoneNumber: '' });
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Ikke oppgitt');
  });

  // ── Click event ──

  it('should emit card id on click', async () => {
    await createComponent();
    let emittedId = '';
    component.cardClick.subscribe((id: string) => (emittedId = id));
    const card = fixture.debugElement.query(By.css('[role="button"]'));
    card.triggerEventHandler('click', null);
    expect(emittedId).toBe('1');
  });

  it('should emit confirmation toggle for unconfirmed assignments', async () => {
    await createComponent({ ...mockAssignment, status: 'unconfirmed' });

    let emittedValue: boolean | undefined;
    component.confirmationToggle.subscribe((value: boolean) => (emittedValue = value));

    const toggleButton = fixture.debugElement.queryAll(By.css('button'))[0];
    toggleButton.triggerEventHandler('click', {
      stopPropagation: vi.fn(),
    });

    expect(emittedValue).toBe(true);
  });

  it('should not render confirmation toggle for non-tomorrow statuses', async () => {
    await createComponent({ ...mockAssignment, status: 'upcoming' });

    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('Marker som bekreftet');
    expect(text).not.toContain('Marker som ikke bekreftet');
  });
});
