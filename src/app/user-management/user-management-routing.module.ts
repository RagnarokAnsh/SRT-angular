import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UsersComponent } from './users/users.component';
import { CreateEditUserComponent } from './create-edit-user/create-edit-user.component';
import { UserManagementComponent } from './user-management/user-management.component';

const routes: Routes = [
  {
    path: '',
    component: UserManagementComponent,
    children: [
      {
        path: '',
        component: UsersComponent,
        
      },
      {
        path: 'create',
        component: CreateEditUserComponent,
      },

      // edit user by id
      {
        path: 'edit/:id',
        component: CreateEditUserComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserManagementRoutingModule {}
