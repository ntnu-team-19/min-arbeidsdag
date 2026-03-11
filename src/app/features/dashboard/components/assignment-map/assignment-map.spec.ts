import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssignmentMapComponent, Assignment } from './assignment-map';

describe('AssignmentMapComponent', () => {
  let component: AssignmentMapComponent;
  let fixture: ComponentFixture<AssignmentMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignmentMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignmentMapComponent);
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