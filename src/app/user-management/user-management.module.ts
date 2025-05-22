import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserManagementRoutingModule } from './user-management-routing.module';
import { CreateEditUserComponent } from './create-edit-user/create-edit-user.component';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    UserManagementRoutingModule,
    RouterModule,
    CreateEditUserComponent

  ]
})
export class UserManagementModule { }
