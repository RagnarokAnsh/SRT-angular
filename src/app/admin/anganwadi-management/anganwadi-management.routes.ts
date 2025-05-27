import { Routes } from '@angular/router';
import { AnganwadiManagementComponent } from './anganwadi-management/anganwadi-management.component';
import { AnganwadiListComponent } from './anganwadi-list/anganwadi-list.component';
import { CreateEditAnganwadiComponent } from './create-edit-anganwadi/create-edit-anganwadi.component';

export const ANGANWADI_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    component: AnganwadiManagementComponent,
    children: [
      {
        path: '',
        component: AnganwadiListComponent
      },
      {
        path: 'create',
        component: CreateEditAnganwadiComponent
      },
      {
        path: 'edit/:id',
        component: CreateEditAnganwadiComponent
      }
    ]
  }
]; 