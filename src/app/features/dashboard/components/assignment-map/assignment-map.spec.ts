import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssignmentMap, Assignment } from './assignment-map';

describe('AssignmentMap', () => {
  let component: AssignmentMap;
  let fixture: ComponentFixture<AssignmentMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignmentMap],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignmentMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default properties', () => {
    expect(component.assignments).toEqual([]);
    expect(component.compact).toBe(false);
    expect(component.mapLoaded).toBe(false);
    expect(component.mapError).toBe(false);
  });

  it('should accept assignments input', () => {
    const testAssignments: Assignment[] = [
      {
        id: 1,
        name: 'Test Assignment',
        location: { lat: 59.9139, lon: 10.7522 },
        description: 'Test description',
      },
    ];

    fixture.componentRef.setInput('assignments', testAssignments);
    fixture.detectChanges();

    expect(component.assignments).toEqual(testAssignments);
  });

  it('should accept compact input', () => {
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    expect(component.compact).toBe(true);
  });
});
