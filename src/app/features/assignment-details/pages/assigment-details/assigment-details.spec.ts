import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssigmentDetails } from './assigment-details';

describe('AssigmentDetails', () => {
  let component: AssigmentDetails;
  let fixture: ComponentFixture<AssigmentDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssigmentDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(AssigmentDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
