import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { MainService } from '../../../services/main.service';
import { FaIconsComponent } from '../../../shared/fa-icons/fa-icons.component';
import { HttpResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { ModalboxComponent } from '../../../shared/modalbox/modalbox.component';
import { AlertboxComponent } from '../../../shared/alertbox/alertbox.component';
import { AppService } from '../../../services/app.service';
import { TableModule } from 'primeng/table';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';

export interface User {
  firstname: string;
  lastname: string;
  email: string;
  group_id: any;
}

@Component({
  selector: 'app-users',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterModule,
    FaIconsComponent,
    TableModule,
    InputTextModule, IconField, InputIcon,
    FormsModule
],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  userData: any;
  $event: any;
  mainService = inject(MainService);
  appService = inject(AppService);
  dialog = inject(MatDialog);
  toastr = inject(ToastService);


  constructor() {}

  ngOnInit() {

    this.appService.title.set('Users');

    this.mainService.getUsersList().subscribe((res: any) => {
      this.userData = res.body;
      console.log(this.userData);
    });
  }

  openDialog(id: any) {
    console.log(id);

    const dialogRef = this.dialog.open(ModalboxComponent, {
      data: {
        type: 'delete',
        title: 'Delete',
        message: 'Do you really want to delete this user?',
      },
    });

    dialogRef.afterClosed().subscribe((res) => {
      console.log(res);

      if (res == 'Yes') {
        console.log('Delete user', id);

        this.mainService.deleteUser(id).subscribe({
          next: (res: HttpResponse<any>) => {
            console.log('Heloooo', res, id);

            if (res.status == 200) {
              this.toastr.success('Success','User deleted successfully');
              this.removeDeletedUser(id);
            }
          },
          error: (err) => {
            console.log(err);
            if (err.status == 409) {
              const modal = this.dialog.open(AlertboxComponent, {
                data: {
                  type: 'error',
                  title: 'Error',
                  message: `User cannot be deleted as it has reference in other modules`,
                },
              });
            }
          },
        });
      }
    });
  }

  updateUserSettings(userId: any, event: any, field: string) {
    console.log(userId, event, field);

    const user = this.userData.find((u: any) => u.id === userId);
    let message;

    message = event.target.checked
      ? 'Do you really want to enable this user?'
      : 'Do you really want to disable this user?';

    const modalRef = this.dialog.open(ModalboxComponent, {
      data: {
        title: 'Confirmation',
        message: message,
      },
    });

    modalRef.afterClosed().subscribe((response: any) => {
      if (response == 'Yes') {
        let value =
          field == 'is_active' ? event.target.checked : event.target.value;

        let userData = {
          [field]: value,
        };

        console.log(userData);

        this.mainService
          .updateUserById(userId, userData)
          .subscribe((res: HttpResponse<any>) => {
            if (res.status == 200) {
              this.toastr.success('Success','User Status updated');
              this.userData.map((user: any) => {
                if (user.id === userId) {
                  user[field] = value;
                }
              });
              // this.ngOnInit();
            } else {
              this.toastr.error('Error','Error updating user status');
            }
            modalRef.componentRef?.destroy();
          });
      } else {
        if (field == 'is_active') {
          event.target.checked = !event.target.checked;
        } else {
          event.target.value = user[field];
        }
        // this.ngOnInit();
      }
    });
  }

  removeDeletedUser(id: any) {
    if (this.userData) {
      // Remove the user from the list
      this.userData = this.userData.filter((user: any) => user.id !== id);

      // Update the dataSource if it exists
      if (this.userData) {
        this.userData.data = this.userData;

      }
    }
  }

}
