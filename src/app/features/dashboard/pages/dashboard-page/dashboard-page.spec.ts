import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { DashboardPage } from './dashboard-page';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { of } from 'rxjs';
import { Assignment } from '../../../../core/models/assignment-card.model';

const MOCK_CARDS: Assignment[] = [
  {
    id: '1',
    title: 'Pågående oppdrag',
    shortDescription: 'Beskrivelse 1',
    time: '11:30',
    address: 'Adresse 1, 7052 Trondheim',
    phoneNumber: '12345678',
    status: 'ongoing',
    date: '2026-03-20',
  },
  {
    id: '2',
    title: 'Neste oppdrag',
    shortDescription: 'Beskrivelse 2',
    time: '12:30',
    address: 'Adresse 2, 7041 Trondheim',
    phoneNumber: '87654321',
    status: 'next',
    date: '2026-03-20',
  },
  {
    id: '3',
    title: 'Kommende oppdrag',
    shortDescription: 'Beskrivelse 3',
    time: '13:45',
    address: 'Adresse 3, 7021 Trondheim',
    phoneNumber: '11111111',
    status: 'upcoming',
    date: '2026-03-20',
  },
  {
    id: '4',
    title: 'Fullført oppdrag',
    shortDescription: 'Beskrivelse 4',
    time: '07:00',
    address: 'Adresse 4, 7050 Trondheim',
    phoneNumber: '22222222',
    status: 'completed',
    date: '2026-03-20',
  },
];

const MOCK_TRAVEL_TIMES = [15, 12, 10, 8];
describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let assignmentServiceMock: {
    getAssignmentCardsByDesiredDate: ReturnType<typeof vi.fn>;
    getTravelTimesByDesiredDate: ReturnType<typeof vi.fn>;
    updateTomorrowConfirmation: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    assignmentServiceMock = {
      getAssignmentCardsByDesiredDate: vi.fn().mockReturnValue(of(MOCK_CARDS)),
      getTravelTimesByDesiredDate: vi.fn().mockReturnValue(of(MOCK_TRAVEL_TIMES)),
      updateTomorrowConfirmation: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage, RouterModule.forRoot([])],
      providers: [
        {
          provide: AssignmentService,
          useValue: assignmentServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to list view', () => {
    expect(component.isListView).toBe(true);
  });

  it('should default to today as selected day', () => {
    expect(component.selectedDay).toBe('today');
  });

  it('should load assignment cards on init', () => {
    expect(component.assignmentCards.length).toBe(4);
  });

  it('should load travel times on init', () => {
    expect(component.travelTimes).toEqual([15, 12, 10, 8]);
  });

  it('should show day selector', () => {
    const daySelector = fixture.debugElement.query(By.css('app-day-selector'));
    expect(daySelector).toBeTruthy();
  });

  it('should show assignment cards in list view', () => {
    const cards = fixture.debugElement.queryAll(By.css('app-assignment-card'));
    expect(cards.length).toBe(4);
  });

  it('should show travel time indicators only for non-completed cards', () => {
    const indicators = fixture.debugElement.queryAll(By.css('app-travel-time-indicator'));
    expect(indicators.length).toBe(3);
  });

  it('should show separator line between non-completed and completed cards', () => {
    const separator = fixture.debugElement.query(By.css('hr'));
    expect(separator).toBeTruthy();
  });

  it('should not show map in list view', () => {
    const map = fixture.debugElement.query(By.css('app-assignment-map'));
    expect(map).toBeFalsy();
  });

  it('should show floating button', () => {
    const fab = fixture.debugElement.query(By.css('app-floating-button'));
    expect(fab).toBeTruthy();
  });

  it('should have day-selector-row class on day selector container', () => {
    const daySelectorRow = fixture.debugElement.query(By.css('.day-selector-row'));
    expect(daySelectorRow).toBeTruthy();
  });

  it('should have correct sheet title based on selected day and assignment count', () => {
    expect(component.sheetTitle).toBe('4 Oppdrag i dag');
    component.selectedDay = 'tomorrow';
    expect(component.sheetTitle).toBe('4 Oppdrag i morgen');
  });

  it('should update selectedDay when day changes', () => {
    component.onDayChange('tomorrow');
    expect(component.selectedDay).toBe('tomorrow');
  });

  it('should update tomorrow confirmation status and reload assignments', () => {
    component.onTomorrowConfirmationChange('1', true);

    expect(assignmentServiceMock.updateTomorrowConfirmation).toHaveBeenCalledWith('1', true);
    expect(assignmentServiceMock.getAssignmentCardsByDesiredDate).toHaveBeenCalledTimes(2);
  });
});
