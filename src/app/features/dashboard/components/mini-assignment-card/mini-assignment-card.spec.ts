import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { MiniAssignmentCard } from './mini-assignment-card';
import { Assignment } from '../../../../core/models/assignment-card.model';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('MiniAssignmentCard', () => {
  let component: MiniAssignmentCard;
  let fixture: ComponentFixture<MiniAssignmentCard>;
  let translateService: TranslateService;

  const mockAssignment: Assignment = {
    id: '123',
    title: 'Oppdrag 1',
    shortDescription: 'Testbeskrivelse',
    time: '08:30',
    duration: 60,
    address: 'Kløbuvegen 179, 7031 Trondheim',
    phoneNumber: '12345678',
    status: 'ongoing',
    date: '2026-02-19',
    locationPoint: { x: 10.3951, y: 63.4305 },
  };

  async function createComponent(assignment: Assignment = mockAssignment) {
    fixture = TestBed.createComponent(MiniAssignmentCard);
    component = fixture.componentInstance;
    component.assignment = assignment;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiniAssignmentCard],
      providers: [provideTranslateService()],
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('no');
    translateService.use('no');
  });

  beforeEach(async () => {
    await createComponent();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose currentStatus based on assignment status', () => {
    expect(component.currentStatus).toEqual({
      label: 'status.ongoing',
      badgeClass: 'bg-[#F2CD7A] text-black',
      dotClass: 'border-[#D9A441] text-[#D9A441]',
    });
  });

  it('should render address and time', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Kløbuvegen 179, 7031 Trondheim');
    expect(text).toContain('08:30');
  });

  it('should emit cardClick with assignment id when onCardClick is called', () => {
    const spy = vi.spyOn(component.cardClick, 'emit');

    component.onCardClick();

    expect(spy).toHaveBeenCalledWith('123');
  });

  it('should emit cardClick when outer card is clicked', () => {
    const spy = vi.spyOn(component.cardClick, 'emit');

    const outerCard = fixture.debugElement.query(By.css('button.block'));
    outerCard.triggerEventHandler('click', new MouseEvent('click'));

    expect(spy).toHaveBeenCalledWith('123');
  });

  it('should stop propagation and emit directionsClick when directions button is clicked', () => {
    const stopPropagation = vi.fn();
    const event = { stopPropagation } as unknown as MouseEvent;
    const directionsClickSpy = vi.spyOn(component.directionsClick, 'emit');

    component.onDirectionsClick(event);

    expect(stopPropagation).toHaveBeenCalled();
    expect(directionsClickSpy).toHaveBeenCalledWith(mockAssignment);
  });

  it('should emit directionsClick when directions button in template is clicked', () => {
    const directionsClickSpy = vi.spyOn(component.directionsClick, 'emit');

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const directionsButton = buttons[1];

    const clickEvent = {
      stopPropagation: vi.fn(),
    };

    directionsButton.triggerEventHandler('click', clickEvent);

    expect(clickEvent.stopPropagation).toHaveBeenCalled();
    expect(directionsClickSpy).toHaveBeenCalledWith(mockAssignment);
  });

  it('should hide directions button when assignment has no location', async () => {
    await createComponent({ ...mockAssignment, locationPoint: null });

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    expect(buttons).toHaveLength(1);
  });

  it('should not fail if assignment is missing in onDirectionsClick', () => {
    const stopPropagation = vi.fn();
    const event = { stopPropagation } as unknown as MouseEvent;
    const directionsClickSpy = vi.spyOn(component.directionsClick, 'emit');

    (component as { assignment?: Assignment }).assignment = undefined;

    expect(() => component.onDirectionsClick(event)).not.toThrow();
    expect(stopPropagation).toHaveBeenCalled();
    expect(directionsClickSpy).not.toHaveBeenCalled();
  });

  it('should show completed status label when assignment status is completed', () => {
    fixture = TestBed.createComponent(MiniAssignmentCard);
    component = fixture.componentInstance;
    component.assignment = {
      ...mockAssignment,
      status: 'completed',
    };
    fixture.detectChanges();

    expect(component.currentStatus.label).toBe('status.completedShort');
  });

  it('should show absence status label when assignment status is absence', () => {
    fixture = TestBed.createComponent(MiniAssignmentCard);
    component = fixture.componentInstance;
    component.assignment = {
      ...mockAssignment,
      status: 'absence',
    };
    fixture.detectChanges();

    expect(component.currentStatus.label).toBe('status.absenceShort');
  });

  it('should show cancelled status label when assignment status is cancelled', () => {
    fixture = TestBed.createComponent(MiniAssignmentCard);
    component = fixture.componentInstance;
    component.assignment = {
      ...mockAssignment,
      status: 'cancelled',
    };
    fixture.detectChanges();

    expect(component.currentStatus.label).toBe('status.cancelledShort');
  });
});
