import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdpoDashboardComponent } from './cdpo-dashboard.component';

describe('CdpoDashboardComponent', () => {
  let component: CdpoDashboardComponent;
  let fixture: ComponentFixture<CdpoDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CdpoDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CdpoDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
