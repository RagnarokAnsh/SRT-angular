import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentsListComponent } from './students-list.component';
import { RouterTestingModule } from '@angular/router/testing';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { StudentService } from '../student.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('StudentsListComponent', () => {
  let component: StudentsListComponent;
  let fixture: ComponentFixture<StudentsListComponent>;
  let mockStudentService: jasmine.SpyObj<StudentService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const mockStudents = [
    {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('2010-01-01'),
      symbol: 'A',
      height: 150,
      weight: 45,
      language: 'English'
    }
  ];

  beforeEach(async () => {
    mockStudentService = jasmine.createSpyObj('StudentService', ['getStudents', 'deleteStudent']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        StudentsListComponent,
        RouterTestingModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatDialogModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: StudentService, useValue: mockStudentService },
        { provide: MatDialog, useValue: mockDialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudentsListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load students on init', () => {
    mockStudentService.getStudents.and.returnValue(of(mockStudents));

    component.ngOnInit();
    expect(mockStudentService.getStudents).toHaveBeenCalled();
    expect(component.students).toEqual(mockStudents);
  });

  it('should calculate age correctly', () => {
    const today = new Date();
    const birthDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
    const age = component.calculateAge(birthDate);
    expect(age).toBe(10);
  });

  it('should open delete dialog', () => {
    const mockDialogRef = { afterClosed: () => of(true) };
    mockDialog.open.and.returnValue(mockDialogRef as any);

    component.openDeleteDialog(mockStudents[0]);
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should delete student when confirmed', () => {
    const mockDialogRef = { afterClosed: () => of(true) };
    mockDialog.open.and.returnValue(mockDialogRef as any);
    mockStudentService.deleteStudent.and.returnValue(of(void 0));
    mockStudentService.getStudents.and.returnValue(of(mockStudents));

    component.openDeleteDialog(mockStudents[0]);
    expect(mockStudentService.deleteStudent).toHaveBeenCalledWith(mockStudents[0].id);
  });
}); 