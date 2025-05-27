import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { StudentService, Student } from '../student.service';

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule
  ],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-body">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            <h2 class="heading-heading mb-3 mb-md-0">
              <span class="heading-highlight">Students</span> List
            </h2>
            <button color="primary" routerLink="create" class="btn btn-primary d-flex align-items-center">
              <mat-icon class="me-1">add</mat-icon>
              <span class="d-none d-sm-inline">Add New Student</span>
            </button>
          </div>

          <div class="table-responsive">
            <table mat-table [dataSource]="students" class="mat-elevation-z2 w-100">
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let student">{{student.firstName}} {{student.lastName}}</td>
              </ng-container>

              <!-- Age Column -->
              <ng-container matColumnDef="age">
                <th mat-header-cell *matHeaderCellDef>Age</th>
                <td mat-cell *matCellDef="let student">{{calculateAge(student.dateOfBirth)}}</td>
              </ng-container>

              <!-- Date of Birth Column -->
              <ng-container matColumnDef="dateOfBirth">
                <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">Date of Birth</th>
                <td mat-cell *matCellDef="let student" class="d-none d-md-table-cell">{{student.dateOfBirth | date}}</td>
              </ng-container>

              <!-- Symbol Column -->
              <ng-container matColumnDef="symbol">
                <th mat-header-cell *matHeaderCellDef class="d-none d-lg-table-cell">Symbol</th>
                <td mat-cell *matCellDef="let student" class="d-none d-lg-table-cell">{{student.symbol}}</td>
              </ng-container>

              <!-- Height Column -->
              <ng-container matColumnDef="height">
                <th mat-header-cell *matHeaderCellDef class="d-none d-lg-table-cell">Height (cm)</th>
                <td mat-cell *matCellDef="let student" class="d-none d-lg-table-cell">{{student.height}}</td>
              </ng-container>

              <!-- Weight Column -->
              <ng-container matColumnDef="weight">
                <th mat-header-cell *matHeaderCellDef class="d-none d-lg-table-cell">Weight (kg)</th>
                <td mat-cell *matCellDef="let student" class="d-none d-lg-table-cell">{{student.weight}}</td>
              </ng-container>

              <!-- Language Column -->
              <ng-container matColumnDef="language">
                <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">Mother Tongue</th>
                <td mat-cell *matCellDef="let student" class="d-none d-md-table-cell">{{student.language}}</td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let student">
                  <div class="d-flex gap-2 justify-content-center">
                    <button mat-icon-button color="primary" [routerLink]="['edit', student.id]" matTooltip="Edit">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="openDeleteDialog(student)" matTooltip="Delete">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
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
      width: 100px;
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

    @media (max-width: 768px) {
      .mat-mdc-cell, .mat-mdc-header-cell {
        padding: var(--spacing-xs) var(--spacing-sm);
      }
    }
  `]
})
export class StudentsListComponent implements OnInit {
  students: Student[] = [];
  displayedColumns: string[] = ['name', 'age', 'dateOfBirth', 'symbol', 'height', 'weight', 'language', 'actions'];

  constructor(
    private studentService: StudentService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    this.studentService.getStudents().subscribe({
      next: (students) => {
        this.students = students;
      },
      error: (error) => {
        console.error('Error loading students:', error);
      }
    });
  }

  calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  openDeleteDialog(student: Student) {
    const dialogRef = this.dialog.open(DeleteConfirmDialog, {
      width: '300px',
      data: { name: `${student.firstName} ${student.lastName}` }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteStudent(student.id);
      }
    });
  }

  deleteStudent(id: number) {
    this.studentService.deleteStudent(id).subscribe({
      next: () => {
        this.loadStudents();
      },
      error: (error) => {
        console.error('Error deleting student:', error);
      }
    });
  }
}

@Component({
  selector: 'delete-confirm-dialog',
  template: `
    <h2 mat-dialog-title>Delete Student</h2>
    <mat-dialog-content>
      Are you sure you want to delete {{data.name}}?
    </mat-dialog-content>
    <mat-dialog-actions align="end">
    <button type="button" class="btn btn-outline-secondary me-2" mat-dialog-close>Cancel</button>
    <button type="button" class="btn btn-danger" [mat-dialog-close]="true">Delete</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [MatDialogModule, MatButtonModule]
})
export class DeleteConfirmDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { name: string }) {}
} 