import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';
import { AssignmentDetailsPage } from './assignment-details';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { AssignmentDetails } from '../../../../core/models/assignment-details.model';

describe('AssignmentDetailsPage', () => {
  let fixture: ComponentFixture<AssignmentDetailsPage>;
  let component: AssignmentDetailsPage;

  let assignmentServiceMock: {
    getAssignmentDetailsViewById: ReturnType<typeof vi.fn>;
    updateTomorrowConfirmation: ReturnType<typeof vi.fn>;
  };

  let routerMock: {
    navigate: ReturnType<typeof vi.fn>;
  };

  const mockAssignment: AssignmentDetails = {
    id: '1315598',
    title: 'Ledningsmålingsoppdrag',
    status: 'upcoming',
    date: '2026-02-20',
    dayLabel: 'today',
    startTime: '08:00',
    endTime: '09:30',
    estimatedDuration: '1 t 30 min',
    address: 'Fagertunvegen 5, 7021 Trondheim',
    streetAddress: 'Fagertunvegen 5',
    postalCode: '7021',
    municipalityName: 'Trondheim',
    locationPoint: { x: 10.377162, y: 63.410492 },
    description: 'Kartlegge og registrere nøyaktig posisjon.',
    contactName: 'Ola Entreprenør',
    contactPhone: '41414141',
    contactEmail: 'ola@mail.com',
    comment: 'Testkommentar',
    orderedFor: ['TELENOR NORGE'],
    canMarkContacted: false,
    contacted: false,
  };

  async function createComponent(
    routeId: string | null,
    returnedAssignment = mockAssignment,
    routeDay: 'today' | 'tomorrow' | null = null,
    routeView: 'list' | 'map' | null = null,
  ) {
    assignmentServiceMock = {
      getAssignmentDetailsViewById: vi.fn().mockReturnValue(of(returnedAssignment)),
      updateTomorrowConfirmation: vi.fn().mockReturnValue(of(undefined)),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AssignmentDetailsPage],
      providers: [
        {
          provide: AssignmentService,
          useValue: assignmentServiceMock,
        },
        {
          provide: Router,
          useValue: routerMock,
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(routeId ? { id: routeId } : {}),
              queryParamMap: convertToParamMap({
                ...(routeDay ? { day: routeDay } : {}),
                ...(routeView ? { view: routeView } : {}),
              }),
            },
          },
        },
        provideTranslateService(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignmentDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('should create', async () => {
    await createComponent('1315598');
    expect(component).toBeTruthy();
  });

  it('should load assignment on init when route id exists', async () => {
    await createComponent('1315598');

    expect(assignmentServiceMock.getAssignmentDetailsViewById).toHaveBeenCalledWith('1315598');
    expect(component.assignment).toEqual(mockAssignment);
    expect(component.notFound).toBe(false);
    expect(component.isLoading).toBe(false);
  });

  it('should set notFound true when route id is missing', async () => {
    await createComponent(null);

    expect(assignmentServiceMock.getAssignmentDetailsViewById).not.toHaveBeenCalled();
    expect(component.assignment).toBeUndefined();
    expect(component.notFound).toBe(true);
    expect(component.isLoading).toBe(false);
    expect(component.mapAssignments).toEqual([]);
  });

  it('should navigate to tomorrow overview in goBack when day query param is tomorrow', async () => {
    await createComponent('1315598', mockAssignment, 'tomorrow');

    component.goBack();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/'], {
      queryParams: { day: 'tomorrow' },
    });
  });

  it('should preserve view query param in goBack when coming from map view', async () => {
    await createComponent('1315598', mockAssignment, 'today', 'map');

    component.goBack();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/'], {
      queryParams: { day: 'today', view: 'map' },
    });
  });

  it('should navigate to tomorrow overview in goBack when assignment day is tomorrow', async () => {
    await createComponent('1315598', {
      ...mockAssignment,
      dayLabel: 'tomorrow',
    });

    component.goBack();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/'], {
      queryParams: { day: 'tomorrow' },
    });
  });

  it('should return correct dayLabelText for today', async () => {
    await createComponent('1315598');

    component.assignment = { ...mockAssignment, dayLabel: 'today' };

    expect(component.dayLabelText).toBe('assignment.today');
  });

  it('should return correct dayLabelText for tomorrow', async () => {
    await createComponent('1315598');

    component.assignment = { ...mockAssignment, dayLabel: 'tomorrow' };

    expect(component.dayLabelText).toBe('assignment.tomorrow');
  });

  it('should return default dayLabelText for other', async () => {
    await createComponent('1315598');

    component.assignment = { ...mockAssignment, dayLabel: 'other' };

    expect(component.dayLabelText).toBe('assignment.label');
  });

  it('should return correct statusLabel for upcoming', async () => {
    await createComponent('1315598');

    component.assignment = { ...mockAssignment, status: 'upcoming' };

    expect(component.statusLabel).toBe('status.upcoming');
  });

  it('should return correct statusLabel for confirmed', async () => {
    await createComponent('1315598');

    component.assignment = { ...mockAssignment, status: 'confirmed' };

    expect(component.statusLabel).toBe('status.confirmedShort');
  });

  it('should return correct statusLabel for completed', async () => {
    await createComponent('1315598');

    component.assignment = { ...mockAssignment, status: 'completed' };

    expect(component.statusLabel).toBe('status.completed');
  });

  it('should return correct statusLabel for cancelled', async () => {
    await createComponent('1315598');

    component.assignment = { ...mockAssignment, status: 'cancelled' };

    expect(component.statusLabel).toBe('status.cancelledShort');
  });

  it('should return default statusLabel for unconfirmed', async () => {
    await createComponent('1315598');

    component.assignment = { ...mockAssignment, status: 'unconfirmed' };

    expect(component.statusLabel).toBe('status.unconfirmedDetails');
  });

  it('should have constant statusTagClass', async () => {
    await createComponent('1315598');

    expect(component.statusTagClass).toBe('bg-gray-200 text-gray-700');
  });

  it('should format 8-digit phone number as XXX XX XXX', async () => {
    await createComponent('1315598');

    component.assignment = { ...mockAssignment, contactPhone: '41414141' };

    expect(component.formattedPhone).toBe('414 14 141');
  });

  it('should return original phone when not 8 digits', async () => {
    await createComponent('1315598');

    component.assignment = { ...mockAssignment, contactPhone: '+4741414141' };

    expect(component.formattedPhone).toBe('+4741414141');
  });

  it('should return empty string when no phone', async () => {
    await createComponent('1315598');

    component.assignment = { ...mockAssignment, contactPhone: '' };

    expect(component.formattedPhone).toBe('');
  });

  it('should open directions in new tab when assignment exists', async () => {
    await createComponent('1315598');

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    component.assignment = {
      ...mockAssignment,
      address: 'Fagertunvegen 5, 7021 Trondheim',
    };

    component.openDirections();

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://www.google.com/maps/dir/?api=1&destination=Fagertunvegen%205%2C%207021%20Trondheim',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('should not open directions when assignment is undefined', async () => {
    await createComponent('1315598');

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    component.assignment = undefined;

    component.openDirections();

    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it('should update contacted when onContactedChange is called', async () => {
    await createComponent('1315598');

    component.assignment = {
      ...mockAssignment,
      dayLabel: 'tomorrow',
      contacted: false,
    };

    component.onContactedChange(true);

    expect(component.assignment.contacted).toBe(true);
    expect(component.assignment.status).toBe('confirmed');
    expect(assignmentServiceMock.updateTomorrowConfirmation).toHaveBeenCalledWith('1315598', true);
  });

  it('should do nothing in onContactedChange when assignment is undefined', async () => {
    await createComponent('1315598');

    component.assignment = undefined;

    expect(() => component.onContactedChange(true)).not.toThrow();
    expect(component.assignment).toBeUndefined();
  });

  it('should create one map assignment with known coordinates on init', async () => {
    await createComponent('1315598');

    expect(component.mapAssignments).toEqual([
      {
        id: 1315598,
        name: 'Ledningsmålingsoppdrag',
        location: { lat: 63.410492, lon: 10.377162 },
        description: 'Fagertunvegen 5, 7021 Trondheim',
      },
    ]);
  });

  it('should use the assignment locationPoint even when the id changes', async () => {
    const unknownAssignment: AssignmentDetails = {
      ...mockAssignment,
      id: '9999999',
      title: 'Ukjent oppdrag',
      locationPoint: { x: 10.43138, y: 63.42262 },
    };

    await createComponent('9999999', unknownAssignment);

    expect(component.mapAssignments).toEqual([
      {
        id: 9999999,
        name: 'Ukjent oppdrag',
        location: { lat: 63.42262, lon: 10.43138 },
        description: 'Fagertunvegen 5, 7021 Trondheim',
      },
    ]);
  });

  it('should clear map assignments when locationPoint is missing', async () => {
    await createComponent('1315598', {
      ...mockAssignment,
      locationPoint: null,
    });

    expect(component.mapAssignments).toEqual([]);
  });

  it('should log marker click', async () => {
    await createComponent('1315598');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      // ignore log output in test
    });
    const marker = {
      id: 1,
      name: 'Marker',
      location: { lat: 63.43, lon: 10.39 },
      description: 'Test marker',
    };

    component.onMarkerClicked(marker);

    expect(consoleSpy).toHaveBeenCalledWith('Marker clicked:', marker);
  });
});
