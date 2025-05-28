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
  template: `
    <div class="container">
      <div class="card">
        <div class="card-body">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            <h2 class="heading-heading mb-3 mb-md-0">
              <span class="heading-highlight">Users</span> Management
            </h2>
            <button routerLink="create" class="btn btn-primary d-flex align-items-center gap-1">
              <mat-icon>add</mat-icon>
              <span class="d-none d-sm-inline">Add New User</span>
            </button>
          </div>

          <div class="table-responsive">
            <table mat-table [dataSource]="users" class="mat-elevation-z2 w-100">
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let user">{{user.name}}</td>
              </ng-container>

              <!-- Email Column -->
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let user">{{user.email}}</td>
              </ng-container>

              <!-- Roles Column -->
              <ng-container matColumnDef="roles">
                <th mat-header-cell *matHeaderCellDef>Roles</th>
                <td mat-cell *matCellDef="let user">
                  <mat-chip-set>
                    <mat-chip *ngFor="let role of user.roles" 
                             [ngStyle]="{
                               'color': getRoleColor(role.name),
                               'border': '1px solid ' + getRoleColor(role.name),
                               'background-color': 'transparent'
                             }"
                             class="custom-chip">
                      {{role.name | titlecase}}
                    </mat-chip>
                  </mat-chip-set>
                </td>
              </ng-container>

              <!-- Location Column -->
              <ng-container matColumnDef="location">
                <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">Location</th>
                <td mat-cell *matCellDef="let user" class="d-none d-md-table-cell">
                  <div class="location-info">
                    <div *ngIf="user.country">{{user.country.name}}</div>
                    <div *ngIf="user.state" class="text-muted small">{{user.state.name}}</div>
                    <div *ngIf="user.district" class="text-muted small">{{user.district.name}}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Project/Sector Column -->
              <ng-container matColumnDef="assignment">
                <th mat-header-cell *matHeaderCellDef class="d-none d-lg-table-cell">Details</th>
                <td mat-cell *matCellDef="let user" class="d-none d-lg-table-cell">
                  <div class="assignment-info">
                    <div *ngIf="user.project" class="small">Project: {{user.project}}</div>
                    <div *ngIf="user.sector" class="small">Sector: {{user.sector}}</div>
                    <div *ngIf="user.anganwadi" class="small">Center: {{user.anganwadi.name}}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let user">
                  <div class="d-flex gap-2 justify-content-center">
                    <button mat-icon-button color="primary" [routerLink]="['edit', user.id]" matTooltip="Edit">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="openDeleteDialog(user)" matTooltip="Delete">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <div *ngIf="users.length === 0" class="text-center py-5">
            <mat-icon class="large-icon text-muted">people_outline</mat-icon>
            <p class="text-muted mt-3">No users found. Create your first user!</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: var(--spacing-md);
    }

    .table-responsive {
      margin-top: var(--spacing-md);
      border-radius: var(--border-radius-md);
      overflow: hidden;
    }

    table {
      width: 100%;
    }

    .mat-column-actions {
      width: 120px;
      text-align: center;
    }

    .mat-mdc-row:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }

    .mat-mdc-header-row {
      background-color: var(--background-color);
    }

    .mat-mdc-cell, .mat-mdc-header-cell {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .location-info, .assignment-info {
      line-height: 1.4;
    }

    .badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .bg-success {
      background-color: #28a745;
      color: white;
    }

    .bg-warning {
      background-color: #ffc107;
      color: black;
    }

    .large-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
    }

    mat-chip-set {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .custom-chip {
      ::ng-deep .mdc-evolution-chip__text-label {
        color: inherit !important;
      }
    }

    @media (max-width: 768px) {
      .mat-mdc-cell, .mat-mdc-header-cell {
        padding: var(--spacing-xs) var(--spacing-sm);
      }
    }
  `]
})
export class UsersListComponent implements OnInit {
  users: User[] = [];
  displayedColumns: string[] = ['name', 'email', 'roles', 'location', 'assignment', 'actions'];

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