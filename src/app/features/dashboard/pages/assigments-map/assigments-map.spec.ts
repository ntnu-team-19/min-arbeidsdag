import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssigmentsMap } from './assigments-map';

describe('AssigmentsMap', () => {
  let component: AssigmentsMap;
  let fixture: ComponentFixture<AssigmentsMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssigmentsMap],
    }).compileComponents();

    fixture = TestBed.createComponent(AssigmentsMap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
