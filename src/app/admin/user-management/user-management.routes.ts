import { Routes } from '@angular/router';
import { UserManagementComponent } from './user-management/user-management.component';
import { UsersListComponent } from './user-list/user-list.component';
import { CreateEditUserComponent } from './create-edit-user/create-edit-user.component';

export const USER_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    component: UserManagementComponent,
    children: [
      {
        path: '',
        component: UsersListComponent
      },
      {
        path: 'create',
        component: CreateEditUserComponent
      },
      {
        path: 'edit/:id',
        component: CreateEditUserComponent
      }
    ]
  }
]; 
