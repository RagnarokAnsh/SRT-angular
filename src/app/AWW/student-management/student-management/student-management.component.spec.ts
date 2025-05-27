import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentManagementComponent } from './student-management.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('StudentManagementComponent', () => {
  let component: StudentManagementComponent;
  let fixture: ComponentFixture<StudentManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        StudentManagementComponent,
        RouterTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 