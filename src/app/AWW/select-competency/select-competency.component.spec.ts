import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectCompetencyComponent } from './select-competency.component';

describe('SelectCompetencyComponent', () => {
  let component: SelectCompetencyComponent;
  let fixture: ComponentFixture<SelectCompetencyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectCompetencyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectCompetencyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
