import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AssignmentCard } from './assignment-card';
import { Assignment } from '../../../../core/models/assignment-card.model';

describe('AssignmentCard', () => {
  let component: AssignmentCard;
  let fixture: ComponentFixture<AssignmentCard>;

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
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignmentCard);
    component = fixture.componentInstance;
    component.assignment = assignment;
    fixture.detectChanges();
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

  it('should show correct label for upcoming status', async () => {
    await createComponent({
      ...mockAssignment,
      status: 'upcoming',
    });

    expect(component.currentStatus.label).toBe('Kommende oppdrag');
  });

  it('should show correct label for completed status', async () => {
    await createComponent({
      ...mockAssignment,
      status: 'completed',
    });

    expect(component.currentStatus.label).toBe('Fullført oppdrag');
  });

  it('should show correct label for cancelled status', async () => {
    await createComponent({
      ...mockAssignment,
      status: 'cancelled',
    });

    expect(component.currentStatus.label).toBe('Avlyst oppdrag');
  });

  it('should show correct label for confirmed status', async () => {
    await createComponent({
      ...mockAssignment,
      status: 'confirmed',
    });

    expect(component.currentStatus.label).toBe('Bekreftet for i morgen');
  });

  it('should show correct label for unconfirmed status', async () => {
    await createComponent({
      ...mockAssignment,
      status: 'unconfirmed',
    });

    expect(component.currentStatus.label).toBe('Ikke bekreftet for i morgen');
  });

  it('should render correct status text in template', async () => {
    await createComponent({
      ...mockAssignment,
      status: 'completed',
    });

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Fullført oppdrag');
  });

  it('should render correct icon class for completed status', async () => {
    await createComponent({
      ...mockAssignment,
      status: 'completed',
    });

    const iconElement = fixture.debugElement.query(By.css('.pi-check-circle'));
    expect(iconElement).toBeTruthy();
  });

  it('should render correct icon class for cancelled status', async () => {
    await createComponent({
      ...mockAssignment,
      status: 'cancelled',
    });

    const iconElement = fixture.debugElement.query(By.css('.pi-times-circle'));
    expect(iconElement).toBeTruthy();
  });

  it('should render correct icon class for upcoming status', async () => {
    await createComponent({
      ...mockAssignment,
      status: 'upcoming',
    });

    const iconElement = fixture.debugElement.query(By.css('.pi-circle'));
    expect(iconElement).toBeTruthy();
  });

  it('should show fallback text when phone number is missing', async () => {
    await createComponent({
      ...mockAssignment,
      phoneNumber: '',
    });

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Ikke oppgitt');
  });
});
