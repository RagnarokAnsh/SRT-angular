import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BackButtonDirective } from '../../../custom-directives/back-button.directive';
import { MainService } from '../../../services/main.service';
import { HttpResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { AppService } from '../../../services/app.service';
import { FaIconsComponent } from '../../../shared/fa-icons/fa-icons.component';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-create-edit-user',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    BackButtonDirective,
    FaIconsComponent
  ],
  templateUrl: './create-edit-user.component.html',
  styleUrl: './create-edit-user.component.css',
})
export class CreateEditUserComponent implements OnInit {
  existingUserData: any;
  userForm!: FormGroup;
  formMode = 'create';
  fb = inject(FormBuilder);
  activeRoute = inject(ActivatedRoute);
  mainService = inject(MainService);
  toastr = inject(ToastService);
  router = inject(Router);
  appService = inject(AppService);
  groups!: any[] ;

  constructor() {}

  ngOnInit() {
    this.initForm();
    this.activeRoute.params.subscribe((res: any) => {
      console.log(res);

      if (res.id) {
        console.log(res);

        this.formMode = 'edit';
        this.mainService.getUserById(res.id).subscribe((res) => {
          
          this.existingUserData = res.body;
          this.appService.title.set('Edit User');
          this.userForm.patchValue(res.body);
          console.log(res.body);
        });
      }
    });

    this.getGroups();
    this.appService.title.set('Create User');

  }

  get f() {
    return this.userForm.controls;
  }


  getGroups() {
    this.mainService.getGroupsList().subscribe({
      next: (res: any) => {
        this.groups = res.body;
        console.log(this.groups);
      },
      error: (err: any) => {
        console.log(err);
      },
    });
  }

  initForm() {
    this.userForm = this.fb.group({
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      groupId: ['', Validators.required],
      is_active: [true, Validators.required],
    });
  }

  onSubmit() {
    if (this.formMode === 'create') {
      this.mainService.createUser(this.userForm.value).subscribe({
        next: (res: HttpResponse<any>) => {
          console.log('Create user ', res);

          if (res.status === 201) {
            this.toastr.success('Success','User created successfully');
            this.router.navigate(['/users']);
          } else {
            this.toastr.error('Error','Failed to create user');
          }
        },
        error: (err: any) => {
          console.log(err);
          this.toastr.error('Error',err.error);
        },
      });
    } else {
      this.mainService
        .updateUserById(this.existingUserData.id, this.userForm.value)
        .subscribe({
          next: (res: HttpResponse<any>) => {
            if (res.status === 200) {
              this.toastr.success('Success','User updated successfully');
              this.router.navigate(['/users']);
            } else {
              this.toastr.error('Error','Failed to update user');
            }
          },
          error: (err: any) => {
            console.log(err);
            this.toastr.error('Error',err.error);
          },
        });
    }
  }
}
