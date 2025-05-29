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
  templateUrl: './students-list.component.html',
  styleUrl: './students-list.component.scss'
})
export class StudentsListComponent implements OnInit {
  students: Student[] = [];
  displayedColumns: string[] = ['name', 'age', 'gender', 'dateOfBirth', 'symbol', 'height', 'weight', 'language', 'anganwadi', 'actions'];

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