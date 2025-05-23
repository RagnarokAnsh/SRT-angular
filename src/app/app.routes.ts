import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { LandingComponent } from './landing/landing.component';
import { UsersComponent } from './admin/users/users.component';
import { SelectCompetencyComponent } from './AWW/select-competency/select-competency.component';
import { DetailsComponent } from './AWW/details/details.component';
import { DashboardComponent } from './AWW/dashboard/dashboard.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
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
        loadComponent: () => import('./AWW/assessments/assessments.component').then(m => m.AssessmentsComponent)
    },
    {
        path: 'dashboard',
        component: DashboardComponent
    },
    {
        path: 'students',
        loadComponent: () => import('./AWW/student-management/student-management/student-management.component').then(m => m.StudentManagementComponent),
        children: [
            {
                path: '',
                loadComponent: () => import('./AWW/student-management/students-list/students-list.component').then(m => m.StudentsListComponent)
            },
            {
                path: 'create',
                loadComponent: () => import('./AWW/student-management/create-edit-student/create-edit-student.component').then(m => m.CreateEditStudentComponent)
            },
            {
                path: 'edit/:id',
                loadComponent: () => import('./AWW/student-management/create-edit-student/create-edit-student.component').then(m => m.CreateEditStudentComponent)
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'dashboard'
    }
];
