import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { Student, StudentService } from '../student.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    MatSortModule
  ],
  templateUrl: './students-list.component.html',
  styleUrls: ['./students-list.component.scss']
})
export class StudentsListComponent implements OnInit {
  
  students: Student[] = [];
  filteredStudents: Student[] = [];
  displayedColumns: string[] = ['name', 'age', 'gender', 'enrollment_date', 'actions'];
  isLoading = false;
  searchTerm = '';
  genderFilter = '';

  private router = inject(Router);
  private studentService = inject(StudentService);
  private toastService = inject(ToastService);

  ngOnInit() {
    this.loadStudents();
  }

  async loadStudents() {
    try {
      this.isLoading = true;
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      if (currentUser.anganwadi_id) {
        const students = await this.studentService.getStudentsByAnganwadiId(currentUser.anganwadi_id).toPromise();
        if (students) {
          this.students = students;
          this.filteredStudents = [...students];
        }
      }
    } catch (error) {
      console.error('Error loading students:', error);
      this.toastService.error('Failed to load students. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  applyFilter() {
    this.filteredStudents = this.students.filter(student => {
      const nameMatch = !this.searchTerm || 
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(this.searchTerm.toLowerCase());
      const genderMatch = !this.genderFilter || student.gender === this.genderFilter;
      return nameMatch && genderMatch;
    });
  }

  editStudent(student: Student) {
    this.router.navigate(['/students/edit', student.id]);
  }

  async deleteStudent(student: Student) {
    if (confirm(`Are you sure you want to delete ${student.first_name} ${student.last_name}?`)) {
      try {
        await this.studentService.deleteStudent(student.id).toPromise();
        this.toastService.deleteSuccess(`Student ${student.first_name} ${student.last_name} deleted successfully!`);
        this.loadStudents(); // Reload the list
      } catch (error) {
        console.error('Error deleting student:', error);
        this.toastService.error('Failed to delete student. Please try again.');
      }
    }
  }

  viewStudent(student: Student) {
    this.router.navigate(['/students/view', student.id]);
  }

  addStudent() {
    this.router.navigate(['/students/create']);
  }

  calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
} 