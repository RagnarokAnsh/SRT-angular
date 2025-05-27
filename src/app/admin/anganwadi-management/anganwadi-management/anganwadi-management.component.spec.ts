import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnganwadiManagementComponent } from './anganwadi-management.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('AnganwadiManagementComponent', () => {
  let component: AnganwadiManagementComponent;
  let fixture: ComponentFixture<AnganwadiManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AnganwadiManagementComponent,
        RouterTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AnganwadiManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 