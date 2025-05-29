import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { UserService, User } from '../user.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

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
    MatChipsModule,
    MatPaginatorModule,
    ToastModule
  ],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UsersListComponent implements OnInit {
  dataSource = new MatTableDataSource<User>([]);
  displayedColumns: string[] = ['name', 'email', 'gender', 'roles', 'location', 'assignment', 'actions'];
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private userService: UserService,
    private router: Router,
    private dialog: MatDialog,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }
  
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.dataSource.data = users;
        // No toast on successful loading to avoid too many notifications
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load users',
          life: 3000
        });
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
        this.deleteUser(user.id, user.name);
      }
    });
  }

  deleteUser(id: number, userName?: string) {
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'User Deleted',
          detail: userName ? `User ${userName} has been successfully deleted` : 'User has been successfully deleted',
          life: 3000
        });
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to delete user',
          life: 3000
        });
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