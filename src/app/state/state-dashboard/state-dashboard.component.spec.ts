import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StateDashboardComponent } from './state-dashboard.component';

describe('StateDashboardComponent', () => {
  let component: StateDashboardComponent;
  let fixture: ComponentFixture<StateDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StateDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StateDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
