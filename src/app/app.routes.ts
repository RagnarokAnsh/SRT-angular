import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { UsersComponent } from './admin/users/users.component';
import { SelectCompetencyComponent } from './AWW/select-competency/select-competency.component';
import { DetailsComponent } from './AWW/details/details.component';
import { DashboardComponent } from './AWW/dashboard/dashboard.component';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'home',
        component: HomeComponent
    },
    {
        path: 'admin/users',
        component: UsersComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'select-competency',
        component: SelectCompetencyComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'details/:id',
        component: DetailsComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'assessments',
        loadComponent: () => import('./AWW/assessments/assessments.component').then(m => m.AssessmentsComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'students',
        loadComponent: () => import('./AWW/student-management/student-management/student-management.component').then(m => m.StudentManagementComponent),
        canActivate: [AuthGuard],
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
        redirectTo: 'home'
    }
];
