import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentMap } from './assignment-map';

describe('AssignmentMap', () => {
  let component: AssignmentMap;
  let fixture: ComponentFixture<AssignmentMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignmentMap],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignmentMap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
