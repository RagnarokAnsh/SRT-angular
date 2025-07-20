import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { StudentService, Student } from '../student.service';

import { MessageService } from 'primeng/api';
import { HostListener } from '@angular/core';

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
    MatDialogModule,
    MatPaginatorModule,

  ],
  templateUrl: './students-list.component.html',
  styleUrls: ['./students-list.component.scss']
})
export class StudentsListComponent implements OnInit {
  dataSource = new MatTableDataSource<Student>([]);
  displayedColumns: string[] = ['name', 'age', 'gender', 'dateOfBirth', 'symbol', 'height', 'weight', 'language', 'anganwadi', 'actions'];
  allColumns: string[] = ['name', 'age', 'gender', 'dateOfBirth', 'symbol', 'height', 'weight', 'language', 'anganwadi', 'actions'];
  mobileColumns: string[] = ['name', 'age', 'gender', 'actions'];
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private studentService: StudentService,
    private router: Router,
    private dialog: MatDialog,
    private messageService: MessageService
  ) {
    this.updateDisplayedColumns();
  }

  ngOnInit() {
    this.loadStudents();
  }
  
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.updateDisplayedColumns();
  }

  updateDisplayedColumns() {
    if (window.innerWidth < 768) {
      this.displayedColumns = this.mobileColumns;
    } else {
      this.displayedColumns = this.allColumns;
    }
  }

  loadStudents() {
    this.studentService.getStudents().subscribe({
      next: (students) => {
        this.dataSource.data = students;
        // No toast on successful loading to avoid too many notifications
        // Only show toast on initial component load or errors
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load students',
          life: 3000
        });
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
        this.deleteStudent(student.id, `${student.firstName} ${student.lastName}`);
      }
    });
  }

  deleteStudent(id: number, studentName?: string) {
    this.studentService.deleteStudent(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Student Deleted',
          detail: studentName ? `Student ${studentName} has been successfully deleted` : 'Student has been successfully deleted',
          life: 3000
        });
        this.loadStudents();
      },
      error: (error) => {
        console.error('Error deleting student:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to delete student',
          life: 3000
        });
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