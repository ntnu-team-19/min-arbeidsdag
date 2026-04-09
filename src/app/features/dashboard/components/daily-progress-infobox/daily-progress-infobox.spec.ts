import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DailyProgressInfobox } from './daily-progress-infobox';
import { DayOption } from '../day-selector/day-selector.types';
import { DailyProgressSummary } from '../../../../core/models/daily-progress.model';

describe('DailyProgressInfobox', () => {
  let component: DailyProgressInfobox;
  let fixture: ComponentFixture<DailyProgressInfobox>;
  const originalInnerWidth = window.innerWidth;

  const mockSummary: DailyProgressSummary = {
    completedAssignments: 4,
    totalAssignments: 8,
    completedTravelMinutes: 45,
    totalTravelMinutes: 75,
    typeBreakdown: [
      { label: 'Fiber', count: 3 },
      { label: 'El-nett', count: 2 },
      { label: 'Vann/Avløp', count: 1 },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyProgressInfobox],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyProgressInfobox);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
    document.documentElement.classList.remove('dark');
  });

  function render(
    day: DayOption = 'today',
    summary: Partial<DailyProgressSummary> | null = mockSummary,
    width = 1024,
  ): void {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
    component.onWindowResize();
    fixture.componentRef.setInput('day', day);
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();
  }

  it('should create', () => {
    render();
    expect(component).toBeTruthy();
  });

  it('should render the completion pie chart above travel for today', () => {
    render('today');

    const text = fixture.nativeElement.textContent;
    const pieChart = fixture.debugElement.query(By.css('.pie-chart'));
    const pieValue = fixture.debugElement.query(By.css('.pie-chart__value'));
    const completionValue = fixture.debugElement.query(By.css('.completion-copy__value'));
    const completionPanel = fixture.debugElement.query(By.css('.completion-panel'));
    const travelSection = fixture.debugElement.query(
      By.css('.daily-progress-infobox__section--travel'),
    );
    const typeItems = fixture.debugElement.queryAll(By.css('.type-summary__item'));

    expect(text).toContain('Dagens fremdrift');
    expect(text).toContain('8 oppdrag fordelt på 3 typer');
    expect(text).toContain('Fullførte oppdrag');
    expect(text).toContain('4 / 8');
    expect(text).toContain('4 oppdrag gjenstår');
    expect(text).toContain('Kjøretid: 45 min av 75 min');
    expect(text).toContain('60%');
    expect(text).toContain('60% av dagens tid brukt på kjøring');
    expect(pieChart).toBeTruthy();
    expect(pieValue.nativeElement.textContent).toContain('4 / 8');
    expect(completionValue).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.type-toggle'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.progress-track--primary'))).toBeFalsy();
    expect(completionPanel).toBeTruthy();
    expect(travelSection).toBeTruthy();
    expect(typeItems).toHaveLength(3);
    expect(text).toContain('Fiber');
    expect(text).toContain('El-nett');
    expect(text).toContain('Vann/Avløp');
  });

  it('should switch to planned copy for tomorrow', () => {
    render('tomorrow');

    const text = fixture.nativeElement.textContent;
    const pieChart = fixture.debugElement.query(By.css('.pie-chart'));
    const pieValue = fixture.debugElement.query(By.css('.pie-chart__value'));
    const completionValue = fixture.debugElement.query(By.css('.completion-copy__value'));
    const travelFill = fixture.debugElement.query(By.css('.progress-track__fill'));
    const tracks = fixture.debugElement.queryAll(By.css('.progress-track'));
    const travelValue = fixture.debugElement.query(By.css('.travel-progress__value'));

    expect(text).toContain('Morgendagens oversikt');
    expect(text).toContain('Planlagte oppdrag');
    expect(text).toContain('0 / 8');
    expect(text).toContain('Planlagt kjøretid: 75 min');
    expect(text).toContain('Estimert for morgendagens oppdrag');
    expect(component.assignmentProgressPercentage).toBe(0);
    expect(component.assignmentPieBackground).toContain('0deg 0deg');
    expect(pieChart.nativeElement.className).toContain('pie-chart--planned');
    expect(pieChart.nativeElement.getAttribute('aria-valuenow')).toBe('0');
    expect(pieValue).toBeFalsy();
    expect(completionValue.nativeElement.textContent).toContain('0 / 8');
    expect(travelFill.nativeElement.style.width).toBe('0%');
    expect(travelValue).toBeFalsy();
    expect(tracks[0].nativeElement.className).toContain('progress-track--planned');
  });

  it('should collapse task types by default on mobile and toggle them open', () => {
    render('today', mockSummary, 375);

    const toggle = fixture.debugElement.query(By.css('.type-toggle'));
    const panel = fixture.debugElement.query(By.css('.type-summary-panel'));

    expect(toggle).toBeTruthy();
    expect(toggle.nativeElement.textContent).toContain('Vis oppdragstyper');
    expect(toggle.nativeElement.getAttribute('aria-expanded')).toBe('false');
    expect(panel.nativeElement.className).toContain('type-summary-panel--collapsed');

    toggle.nativeElement.click();
    fixture.detectChanges();

    expect(toggle.nativeElement.textContent).toContain('Skjul oppdragstyper');
    expect(toggle.nativeElement.getAttribute('aria-expanded')).toBe('true');
    expect(panel.nativeElement.className).not.toContain('type-summary-panel--collapsed');
  });

  it('should reset mobile task types to collapsed when the day changes', () => {
    render('today', mockSummary, 375);

    const toggle = fixture.debugElement.query(By.css('.type-toggle'));
    toggle.nativeElement.click();
    fixture.detectChanges();

    expect(component.areMobileTypesExpanded).toBe(true);

    render('tomorrow', mockSummary, 375);

    const refreshedToggle = fixture.debugElement.query(By.css('.type-toggle'));
    const panel = fixture.debugElement.query(By.css('.type-summary-panel'));

    expect(component.areMobileTypesExpanded).toBe(false);
    expect(refreshedToggle.nativeElement.getAttribute('aria-expanded')).toBe('false');
    expect(panel.nativeElement.className).toContain('type-summary-panel--collapsed');
  });

  it('should keep the pie chart and travel bar tied to the real progress percentages', () => {
    render('today');

    const travelFill = fixture.debugElement.query(By.css('.progress-track__fill'));

    expect(component.assignmentProgressPercentage).toBe(50);
    expect(component.assignmentPieBackground).toContain('180deg');
    expect(component.assignmentPieBackground).toContain('var(--pie-fill)');
    expect(component.assignmentPieBackground).toContain('var(--pie-track)');
    expect(component.travelBarPercentage).toBe(60);
    expect(travelFill.nativeElement.style.width).toBe('60%');
  });

  it('should render with theme-aware progress styling in dark mode', () => {
    document.documentElement.classList.add('dark');
    render('today');

    const text = fixture.nativeElement.textContent;
    const pieChart = fixture.debugElement.query(By.css('.pie-chart'));

    expect(text).toContain('Dagens fremdrift');
    expect(text).toContain('4 / 8');
    expect(text).toContain('60% av dagens tid brukt på kjøring');
    expect(component.assignmentPieBackground).toContain('var(--pie-fill)');
    expect(component.assignmentPieBackground).not.toContain('#90aecb');
    expect(component.assignmentPieBackground).not.toContain('#d7e4f1');
    expect(pieChart.nativeElement.style.background).toContain('var(--pie-fill)');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should preserve planned-state progress styling in dark mode', () => {
    document.documentElement.classList.add('dark');
    render('tomorrow');

    const text = fixture.nativeElement.textContent;
    const pieChart = fixture.debugElement.query(By.css('.pie-chart'));
    const travelTrack = fixture.debugElement.query(By.css('.progress-track'));

    expect(text).toContain('Morgendagens oversikt');
    expect(text).toContain('Planlagt kjøretid: 75 min');
    expect(component.assignmentPieBackground).toContain('var(--pie-track)');
    expect(pieChart.nativeElement.className).toContain('pie-chart--planned');
    expect(travelTrack.nativeElement.className).toContain('progress-track--planned');
  });

  it('should fall back safely for empty data', () => {
    render('today', null, 375);

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('0 oppdrag fordelt på 0 typer');
    expect(text).toContain('Ingen oppdragstyper for valgt dag');
    expect(text).toContain('0 / 0');
    expect(text).toContain('Ingen oppdrag registrert');
    expect(text).toContain('Kjøretid: 0 min av 0 min');
    expect(text).toContain('0% av dagens tid brukt på kjøring');
    expect(fixture.debugElement.query(By.css('.type-toggle'))).toBeFalsy();
  });

  it('should merge duplicate types and ignore invalid entries in the secondary type summary', () => {
    render('today', {
      completedAssignments: 10,
      totalAssignments: 3,
      completedTravelMinutes: 50,
      totalTravelMinutes: 20,
      typeBreakdown: [
        { label: 'Fiber', count: 1 },
        { label: ' ', count: 2 },
        { label: 'Fiber', count: 2 },
        { label: 'Ukjent type', count: 1 },
      ],
    });

    const text = fixture.nativeElement.textContent;

    expect(component.completedAssignments).toBe(3);
    expect(component.completedTravelMinutes).toBe(20);
    expect(component.typeBreakdownItems).toEqual([
      { label: 'Fiber', count: 3 },
      { label: 'Ukjent type', count: 1 },
    ]);
    expect(text).toContain('3 oppdrag fordelt på 2 typer');
    expect(text).toContain('3 / 3');
    expect(text).toContain('Alle oppdrag er fullført');
    expect(text).toContain('Kjøretid: 20 min av 20 min');
  });
});
