import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { SelectCompetencyComponent } from './AWW/select-competency/select-competency.component';
import { DetailsComponent } from './AWW/details/details.component';
import { DashboardComponent } from './AWW/dashboard/dashboard.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { AuthGuard, AdminGuard, AWWGuard } from './auth/auth.guard';
import { STUDENT_MANAGEMENT_ROUTES } from './AWW/student-management/student-management.routes';
import { ANGANWADI_MANAGEMENT_ROUTES } from './admin/anganwadi-management/anganwadi-management.routes';
import { USER_MANAGEMENT_ROUTES } from './admin/user-management/user-management.routes';

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

    // Anganwadi management routes - only accessible by admin role
    {
        path: 'admin/anganwadi',
        loadChildren: () => ANGANWADI_MANAGEMENT_ROUTES,
        canActivate: [AdminGuard]
    },

    // User management Routes -by admin
    {
        path: 'admin/users',
        loadChildren: () => USER_MANAGEMENT_ROUTES,
        canActivate: [AdminGuard]
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
        loadChildren: () => STUDENT_MANAGEMENT_ROUTES,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'aww'] }
    },

    // Fallback route
    {
        path: '**',
        redirectTo: 'home'
    }
];