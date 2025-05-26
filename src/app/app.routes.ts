import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { UsersComponent } from './admin/users/users.component';
import { SelectCompetencyComponent } from './AWW/select-competency/select-competency.component';
import { DetailsComponent } from './AWW/details/details.component';
import { DashboardComponent } from './AWW/dashboard/dashboard.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { AuthGuard, AdminGuard, AWWGuard } from './auth/auth.guard';

export const routes: Routes = [
    // Public routes
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

    // Admin routes - only accessible by admin role
    {
        path: 'admin/dashboard',
        component: AdminDashboardComponent,
        canActivate: [AdminGuard]
    },
    {
        path: 'admin/users',
        component: UsersComponent,
        canActivate: [AdminGuard]
    },

    // Anganwadi management routes - only accessible by admin role
    {
        path: 'admin/anganwadi',
        loadComponent: () => import('./admin/anganwadi-management/anganwadi-management/anganwadi-management.component').then(m => m.AnganwadiManagementComponent),
        canActivate: [AdminGuard],
        children: [
            {
                path: '',
                loadComponent: () => import('./admin/anganwadi-management/anganwadi-list/anganwadi-list.component').then(m => m.AnganwadiListComponent)
            },
            {
                path: 'create',
                loadComponent: () => import('./admin/anganwadi-management/create-edit-anganwadi/create-edit-anganwadi.component').then(m => m.CreateEditAnganwadiComponent)
            },
            {
                path: 'edit/:id',
                loadComponent: () => import('./admin/anganwadi-management/create-edit-anganwadi/create-edit-anganwadi.component').then(m => m.CreateEditAnganwadiComponent)
            }
        ]
    },

    // AWW routes - only accessible by aww role
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuard],
        data: { roles: ['aww', 'admin'] }
    },
    {
        path: 'select-competency',
        component: SelectCompetencyComponent,
        canActivate: [AuthGuard],
        data: { roles: ['aww', 'admin'] }
    },
    {
        path: 'details/:id',
        component: DetailsComponent,
        canActivate: [AuthGuard],
        data: { roles: ['aww', 'admin'] }
    },
    {
        path: 'assessments',
        loadComponent: () => import('./AWW/assessments/assessments.component').then(m => m.AssessmentsComponent),
        canActivate: [AuthGuard],
        data: { roles: ['aww', 'admin'] }
    },

    // Student management routes - accessible by both admin and aww
    {
        path: 'students',
        loadComponent: () => import('./AWW/student-management/student-management/student-management.component').then(m => m.StudentManagementComponent),
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'aww'] },
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

    // Fallback route
    {
        path: '**',
        redirectTo: 'home'
    }
];