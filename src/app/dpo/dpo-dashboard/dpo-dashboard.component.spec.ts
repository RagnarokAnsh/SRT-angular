import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DpoDashboardComponent } from './dpo-dashboard.component';

describe('DpoDashboardComponent', () => {
  let component: DpoDashboardComponent;
  let fixture: ComponentFixture<DpoDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DpoDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DpoDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
