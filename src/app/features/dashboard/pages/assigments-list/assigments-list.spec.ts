import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssigmentsList } from './assigments-list';

describe('AssigmentsList', () => {
  let component: AssigmentsList;
  let fixture: ComponentFixture<AssigmentsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssigmentsList],
    }).compileComponents();

    fixture = TestBed.createComponent(AssigmentsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
