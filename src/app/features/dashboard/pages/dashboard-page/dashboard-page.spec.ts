import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule, convertToParamMap, ParamMap } from '@angular/router';
import { of, ReplaySubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Assignment } from '../../../../core/models/assignment-card.model';
import { DailyProgressSummary } from '../../../../core/models/daily-progress.model';
import { DailyProgressInfobox } from '../../components/daily-progress-infobox/daily-progress-infobox';
import { MAP_BOTTOM_SHEET_PEEK_RATIO } from '../../components/map-bottom-sheet/map-bottom-sheet';

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

const MOCK_DAILY_PROGRESS: DailyProgressSummary = {
  completedAssignments: 1,
  totalAssignments: 4,
  completedTravelMinutes: 15,
  totalTravelMinutes: 45,
  typeBreakdown: [
    { label: 'Fiber', count: 2 },
    { label: 'El-nett', count: 1 },
  ],
};

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let queryParamSubject: ReplaySubject<ParamMap>;
  let assignmentServiceMock: {
    getAssignmentCardsByDesiredDate: ReturnType<typeof vi.fn>;
    getTravelTimesByDesiredDate: ReturnType<typeof vi.fn>;
    getDailyProgressByDesiredDate: ReturnType<typeof vi.fn>;
    updateTomorrowConfirmation: ReturnType<typeof vi.fn>;
  };

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    queryParamSubject = new ReplaySubject<ParamMap>(1);

    assignmentServiceMock = {
      getAssignmentCardsByDesiredDate: vi.fn().mockReturnValue(of(MOCK_CARDS)),
      getTravelTimesByDesiredDate: vi.fn().mockReturnValue(of(MOCK_TRAVEL_TIMES)),
      getDailyProgressByDesiredDate: vi.fn().mockReturnValue(of(MOCK_DAILY_PROGRESS)),
      updateTomorrowConfirmation: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage, RouterModule.forRoot([])],
      providers: [
        {
          provide: AssignmentService,
          useValue: assignmentServiceMock,
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({}),
            },
            queryParamMap: queryParamSubject.asObservable(),
          },
        },
        provideTranslateService(),
      ],
    }).compileComponents();

    // Set up translations
    const translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('no');
    translateService.setTranslation('no', {
      sheet: {
        assignments: 'Oppdrag',
        today: 'i dag',
        tomorrow: 'i morgen',
        assignmentCountText: 'Oppdrag',
        assignmentCountTextPlural: 'Oppdrag',
      },
    });
    translateService.use('no');

    // Emit params before creating component so it's replayed on subscription
    queryParamSubject.next(convertToParamMap({}));

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
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

  it('should show the shared daily progress infobox', () => {
    const infobox = fixture.debugElement.query(By.css('app-daily-progress-infobox'));
    expect(infobox).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Dagens fremdrift');
  });

  it('should not show the daily progress infobox in map view', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const mapFixture = TestBed.createComponent(DashboardPage);
    const mapComponent = mapFixture.componentInstance;
    mapComponent.isListView = false;
    mapFixture.detectChanges();
    await mapFixture.whenStable();

    const infobox = mapFixture.debugElement.query(By.css('app-daily-progress-infobox'));
    expect(infobox).toBeFalsy();
  });

  it('should pass the selected day to the daily progress infobox', async () => {
    const todayInfobox = fixture.debugElement.query(By.directive(DailyProgressInfobox));
    expect(todayInfobox.componentInstance.day).toBe('today');

    const tomorrowFixture = TestBed.createComponent(DashboardPage);
    const tomorrowComponent = tomorrowFixture.componentInstance;
    tomorrowComponent.selectedDay = 'tomorrow';
    tomorrowFixture.detectChanges();
    await tomorrowFixture.whenStable();

    const tomorrowInfobox = tomorrowFixture.debugElement.query(By.directive(DailyProgressInfobox));
    expect(tomorrowInfobox.componentInstance.day).toBe('tomorrow');
  });

  it('should focus the map, snap the sheet, and highlight the matching card when a marker is clicked', () => {
    vi.useFakeTimers();
    component.isListView = false;

    const markerAssignment = {
      id: '2',
      name: 'Neste oppdrag',
      location: { lat: 63.4305, lon: 10.3951 },
    };
    const focusAssignment = vi.fn();
    const snapTo = vi.fn();
    const scrollToElement = vi.fn();
    const cardRow = document.createElement('div');
    cardRow.dataset['assignmentId'] = '2';

    (component as unknown as Record<string, unknown>)['assignmentMap'] = {
      focusAssignment,
    };
    (component as unknown as Record<string, unknown>)['mapBottomSheet'] = {
      snapTo,
      scrollToElement,
    };
    (component as unknown as Record<string, unknown>)['miniAssignmentCardRows'] = {
      find: (predicate: (row: { nativeElement: HTMLElement }) => boolean) => {
        const row = { nativeElement: cardRow };
        return predicate(row) ? row : undefined;
      },
    };

    component.onMarkerClicked(markerAssignment);

    expect(focusAssignment).toHaveBeenCalledWith(
      markerAssignment,
      expect.objectContaining({
        targetYRatio: MAP_BOTTOM_SHEET_PEEK_RATIO / 2,
      }),
    );
    expect(snapTo).toHaveBeenCalledWith('peek');
    expect(scrollToElement).not.toHaveBeenCalled();
    expect(cardRow.classList.contains('marker-focused')).toBe(false);

    vi.advanceTimersByTime(280);

    expect(scrollToElement).toHaveBeenCalledWith(cardRow);
    expect(cardRow.classList.contains('marker-focused')).toBe(false);

    vi.advanceTimersByTime(180);

    expect(cardRow.classList.contains('marker-focused')).toBe(true);
  });

  it('should clear the highlighted card on the next user interaction', () => {
    vi.useFakeTimers();
    component.isListView = false;

    const cardRow = document.createElement('div');
    cardRow.dataset['assignmentId'] = '2';

    (component as unknown as Record<string, unknown>)['miniAssignmentCardRows'] = {
      find: (predicate: (row: { nativeElement: HTMLElement }) => boolean) => {
        const row = { nativeElement: cardRow };
        return predicate(row) ? row : undefined;
      },
    };

    component.onMarkerClicked({
      id: '2',
      name: 'Neste oppdrag',
      location: { lat: 63.4305, lon: 10.3951 },
    });

    vi.advanceTimersByTime(460);

    expect(cardRow.classList.contains('marker-focused')).toBe(true);

    component.onUserInteractionStart();

    expect(cardRow.classList.contains('marker-focused')).toBe(false);
  });
});
