import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { LandingComponent } from './landing/landing.component';
import { UsersComponent } from './admin/users/users.component';
import { SelectCompetencyComponent } from './select-competency/select-competency.component';
import { DetailsComponent } from './details/details.component';

export const routes: Routes = [
    {
        path: '',
        component: LandingComponent
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'landing',
        component: LandingComponent
    },
    {
        path: 'admin/users',
        component: UsersComponent
    },
    {
        path: 'select-competency',
        component: SelectCompetencyComponent
    },
    {
        path: 'details/:id',
        component: DetailsComponent
    },
    {
        path: 'assessments',
        loadComponent: () => import('./assessments/assessments.component').then(m => m.AssessmentsComponent)
    },
    {
        path: 'students',
        loadComponent: () => import('./student-management/student-management/student-management.component').then(m => m.StudentManagementComponent),
        children: [
            {
                path: '',
                loadComponent: () => import('./student-management/students-list/students-list.component').then(m => m.StudentsListComponent)
            },
            {
                path: 'create',
                loadComponent: () => import('./student-management/create-edit-student/create-edit-student.component').then(m => m.CreateEditStudentComponent)
            },
            {
                path: 'edit/:id',
                loadComponent: () => import('./student-management/create-edit-student/create-edit-student.component').then(m => m.CreateEditStudentComponent)
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'landing'
    }
];
