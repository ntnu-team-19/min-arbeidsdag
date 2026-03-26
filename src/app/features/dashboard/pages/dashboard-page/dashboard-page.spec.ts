import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule, convertToParamMap, ParamMap } from '@angular/router';
import { DashboardPage } from './dashboard-page';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { of, Subject } from 'rxjs';
import { Assignment } from '../../../../core/models/assignment-card.model';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  let router: Router;
  let queryParamSubject: Subject<ParamMap>;
  let assignmentServiceMock: {
    getAssignmentCardsByDesiredDate: ReturnType<typeof vi.fn>;
    getTravelTimesByDesiredDate: ReturnType<typeof vi.fn>;
    updateTomorrowConfirmation: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    queryParamSubject = new Subject();

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
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({}),
            },
            queryParamMap: queryParamSubject.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    // Emit params before detectChanges so subscription initializes data
    queryParamSubject.next(convertToParamMap({}));
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

  it('should show day selector', () => {
    const daySelector = fixture.debugElement.query(By.css('app-day-selector'));
    expect(daySelector).toBeTruthy();
  });

  it('should show floating button', () => {
    const fab = fixture.debugElement.query(By.css('app-floating-button'));
    expect(fab).toBeTruthy();
  });

  it('should not show map in list view', () => {
    const map = fixture.debugElement.query(By.css('app-assignment-map'));
    expect(map).toBeFalsy();
  });

  it('should update selectedDay when day changes', () => {
    component.onDayChange('tomorrow');
    expect(component.selectedDay).toBe('tomorrow');
  });

  it('should include day and view query params when navigating to assignment details', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.selectedDay = 'tomorrow';
    component.isListView = false;

    component.goToAssignmentDetails('123');

    expect(navigateSpy).toHaveBeenCalledWith(['/assignments', '123'], {
      queryParams: { day: 'tomorrow', view: 'map' },
    });
  });

  it('should update query params when day changes', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.onDayChange('tomorrow');
    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { day: 'tomorrow', view: 'list' },
      queryParamsHandling: 'merge',
    });
  });

  it('should update query params when view changes', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.onViewChange(false);
    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { day: 'today', view: 'map' },
      queryParamsHandling: 'merge',
    });
  });

  it('should reflect query param changes in component state', () => {
    queryParamSubject.next(convertToParamMap({ day: 'tomorrow', view: 'map' }));
    expect(component.selectedDay).toBe('tomorrow');
    expect(component.isListView).toBe(false);
  });
});
