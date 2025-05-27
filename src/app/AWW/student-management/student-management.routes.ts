import { Routes } from '@angular/router';
import { StudentManagementComponent } from './student-management/student-management.component';
import { StudentsListComponent } from './students-list/students-list.component';
import { CreateEditStudentComponent } from './create-edit-student/create-edit-student.component';

export const STUDENT_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    component: StudentManagementComponent,
    children: [
      {
        path: '',
        component: StudentsListComponent
      },
      {
        path: 'create',
        component: CreateEditStudentComponent
      },
      {
        path: 'edit/:id',
        component: CreateEditStudentComponent
      }
    ]
  }
]; 