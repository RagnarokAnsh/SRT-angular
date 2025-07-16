import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { SelectCompetencyComponent } from './AWW/select-competency/select-competency.component';
import { DetailsComponent } from './AWW/details/details.component';
import { DashboardComponent } from './AWW/dashboard/dashboard.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { StateDashboardComponent } from './state/state-dashboard/state-dashboard.component';
import { DpoDashboardComponent } from './dpo/dpo-dashboard/dpo-dashboard.component';
import { CdpoDashboardComponent } from './cdpo/cdpo-dashboard/cdpo-dashboard.component';
import { SupervisorDashboardComponent } from './supervisor/supervisor-dashboard/supervisor-dashboard.component';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component';
import { 
  AuthGuard, 
  RoleGuard, 
  AdminGuard, 
  StateOfficialGuard,
  DPOGuard,
  CDPOGuard,
  SupervisorGuard,
  AWWGuard,
  AdminAccessGuard,
  SupervisorAccessGuard,
  FieldAccessGuard
} from './auth/auth.guard';
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
    {
        path: 'unauthorized',
        component: UnauthorizedComponent
    },

    // Admin routes - only accessible by admin role
    {
        path: 'admin',
        canActivate: [AdminAccessGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                component: AdminDashboardComponent,
                canActivate: [AdminGuard]
            },
            {
                path: 'anganwadi',
                loadChildren: () => ANGANWADI_MANAGEMENT_ROUTES,
                canActivate: [AdminGuard]
            },
            {
                path: 'users',
                loadChildren: () => USER_MANAGEMENT_ROUTES,
                canActivate: [AdminGuard]
            }
        ]
    },

    // State Official routes
    {
        path: 'state',
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                component: StateDashboardComponent,
                canActivate: [StateOfficialGuard]
            }
        ]
    },

    // DPO routes
    {
        path: 'dpo',
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                component: DpoDashboardComponent,
                canActivate: [DPOGuard]
            }
        ]
    },

    // CDPO routes
    {
        path: 'cdpo',
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                component: CdpoDashboardComponent,
                canActivate: [CDPOGuard]
            }
        ]
    },

    // Supervisor routes
    {
        path: 'supervisor',
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                component: SupervisorDashboardComponent,
                canActivate: [SupervisorGuard]
            }
        ]
    },

    // AWW routes - accessible by AWW and admin
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [RoleGuard],
        data: { roles: ['aww', 'admin'] }
    },
    {
        path: 'select-competency',
        component: SelectCompetencyComponent,
        canActivate: [RoleGuard],
        data: { roles: ['aww', 'admin'] }
    },
    {
        path: 'details/:id',
        component: DetailsComponent,
        canActivate: [RoleGuard],
        data: { roles: ['aww', 'admin'] }
    },
    {
        path: 'assessments',
        loadComponent: () => import('./AWW/assessments/assessments.component').then(m => m.AssessmentsComponent),
        canActivate: [RoleGuard],
        data: { 
            roles: ['aww', 'admin'],
            permissions: ['conduct_assessments']
        }
    },
    {
        path: 'assessments/:id',
        loadComponent: () => import('./AWW/assessments/assessments.component').then(m => m.AssessmentsComponent),
        canActivate: [RoleGuard],
        data: { 
            roles: ['aww', 'admin'],
            permissions: ['conduct_assessments']
        }
    },
    {
        path: 'aww/assessments/:id',
        loadComponent: () => import('./AWW/assessments/assessments.component').then(m => m.AssessmentsComponent),
        canActivate: [RoleGuard],
        data: { 
            roles: ['aww', 'admin'],
            permissions: ['conduct_assessments']
        }
    },

    // Student management routes - accessible by admin, supervisor, and aww
    {
        path: 'students',
        loadChildren: () => STUDENT_MANAGEMENT_ROUTES,
        canActivate: [RoleGuard],
        data: { 
            roles: ['admin', 'supervisor', 'aww'],
            permissions: ['manage_students']
        }
    },

    // Fallback routes
    {
        path: '404',
        redirectTo: 'unauthorized'
    },
    {
        path: '**',
        redirectTo: 'home'
    }
];