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
        path: '**',
        redirectTo: 'landing'
    }
];
