import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { DashboardPage } from './dashboard-page';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { of } from 'rxjs';
import { Assignment } from '../../../../core/models/assignment-card.model';
import { AssignmentDetailsDto } from '../../../../core/models/assignment-details.dto';

const MOCK_CARDS: Assignment[] = [
  {
    id: '1315598',
    title: 'Test oppdrag 1',
    shortDescription: 'Beskrivelse 1',
    time: '07:00 – 07:31',
    address: 'Fagertunvegen 5, 7021 Trondheim',
    phoneNumber: '41414141',
    status: 'upcoming',
    date: '2026-02-20',
  },
  {
    id: '1316076',
    title: 'Test oppdrag 2',
    shortDescription: 'Beskrivelse 2',
    time: '09:00 – 09:34',
    address: 'Otto Nielsens Veg 16, 7052 Trondheim',
    phoneNumber: '132 123 45',
    status: 'completed',
    date: '2026-02-20',
  },
];

const MOCK_ASSIGNMENT_DETAILS: AssignmentDetailsDto[] = [
  {
    id: 1315598,
    fieldTechId: 40231,
    status: 2,
    organizationName: 'GEOMATIKK AS',
    cableShowingTimeIsLocked: false,
    cableShowingUserIsLocked: false,
    cableShowingDateIsLocked: false,
    inquiryId: 5866375,
    inquiryName: 'Test oppdrag',
    inquiryDescription: 'Beskrivelse',
    showingDeadlineDate: null,
    desiredDateForShowing: '2026-02-20T00:00:00',
    streetAddress: 'Fagertunvegen 5',
    postalCode: '7021',
    showingContactName: 'Test',
    showingContactPhone: '41414141',
    municipalityNumber: '5001',
    municipalityName: 'Trondheim',
    deliveryDeadline: null,
    showingStartDate: '2026-02-20T07:00:47',
    showingEndDate: '2026-02-20T07:31:47',
    showingAfterCustomerWish: false,
    calculatedTimeOnsite: 2,
    editedTimeOnsite: 28.1,
    calculatedTraveltime: 4,
    orderedFor: [],
    commentFromShower: null,
  },
];

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage, RouterModule.forRoot([])],
      providers: [
        {
          provide: AssignmentService,
          useValue: {
            getAssignmentCards: () => of(MOCK_CARDS),
            getAllAssignmentDetails: () => of(MOCK_ASSIGNMENT_DETAILS),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.autoDetectChanges(true);
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

  it('should load assignment cards from service', () => {
    expect(component.assignmentCards.length).toBe(2);
    expect(component.assignmentCards[0].title).toBe('Test oppdrag 1');
  });

  it('should show day selector', () => {
    const daySelector = fixture.debugElement.query(By.css('app-day-selector'));
    expect(daySelector).toBeTruthy();
  });

  it('should render todays progress infobox with default selected date', () => {
    const infobox = fixture.debugElement.query(By.css('app-todays-progress-infobox'));

    expect(infobox).toBeTruthy();
    expect(infobox.componentInstance.selectedDate).toBe('2026-02-20');
    expect(infobox.componentInstance.fieldTechId).toBe(40231);
  });

  it('should show assignment cards in list view', () => {
    const cards = fixture.debugElement.queryAll(By.css('app-assignment-card'));
    expect(cards.length).toBe(2);
  });

  it('should not show map in list view', () => {
    const map = fixture.debugElement.query(By.css('app-assignment-map'));
    expect(map).toBeFalsy();
  });

  it('should show floating button', () => {
    const fab = fixture.debugElement.query(By.css('app-floating-button'));
    expect(fab).toBeTruthy();
  });
});
