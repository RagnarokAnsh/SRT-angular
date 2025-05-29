import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { UserService, User } from '../user.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatChipsModule
  ],
 templateUrl: './user-list.component.html',
 styleUrl: './user-list.component.scss'
})
export class UsersListComponent implements OnInit {
  users: User[] = [];
  displayedColumns: string[] = ['name', 'email', 'gender', 'roles', 'location', 'assignment', 'actions'];

  constructor(
    private userService: UserService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  getRoleColor(roleName: string): string {
    const colorMap: { [key: string]: string } = {
      'admin': '#dc3545',
      'aww': '#28a745',
      'supervisor': '#007bff',
      'cdpo': '#fd7e14',
      'dpo': '#6f42c1',
      'stateofficial': '#20c997'
    };
    return colorMap[roleName] || '#6c757d';
  }

  openDeleteDialog(user: User) {
    const dialogRef = this.dialog.open(DeleteConfirmDialog, {
      width: '300px',
      data: { name: user.name }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteUser(user.id);
      }
    });
  }

  deleteUser(id: number) {
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error deleting user:', error);
      }
    });
  }
}

@Component({
  selector: 'delete-confirm-dialog',
  template: `
    <h2 mat-dialog-title>Delete User</h2>
    <mat-dialog-content>
      Are you sure you want to delete {{data.name}}?
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Delete</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [MatDialogModule, MatButtonModule]
})
export class DeleteConfirmDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { name: string }) {}
}