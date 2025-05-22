import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  symbol: string;
  height: number;
  weight: number;
  language: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = 'api/students'; // Replace with your actual API endpoint
  private students: Student[] = [
    {
      id: 1,
      firstName: 'Shyam',
      lastName: 'Kumar',
      dateOfBirth: new Date('2020-05-15'),
      symbol: 'SK001',
      height: 110,
      weight: 20,
      language: 'Hindi'
    },
    {
      id: 2,
      firstName: 'Ghanshyam',
      lastName: 'Singh',
      dateOfBirth: new Date('2023-01-10'),
      symbol: 'GS002',
      height: 95,
      weight: 15,
      language: 'Hindi'
    },
    {
      id: 3,
      firstName: 'Binod',
      lastName: 'Sharma',
      dateOfBirth: new Date('2021-03-22'),
      symbol: 'BS003',
      height: 105,
      weight: 18,
      language: 'Hindi'
    },
    {
      id: 4,
      firstName: 'Mukesh',
      lastName: 'Patel',
      dateOfBirth: new Date('2021-07-19'),
      symbol: 'MP004',
      height: 108,
      weight: 19,
      language: 'Gujarati'
    },
    {
      id: 5,
      firstName: 'Ram',
      lastName: 'Verma',
      dateOfBirth: new Date('2022-02-05'),
      symbol: 'RV005',
      height: 100,
      weight: 16,
      language: 'Hindi'
    },
    {
      id: 6,
      firstName: 'Hemant',
      lastName: 'Gupta',
      dateOfBirth: new Date('2022-09-12'),
      symbol: 'HG006',
      height: 98,
      weight: 17,
      language: 'Hindi'
    }
  ];

  constructor(private http: HttpClient) {}

  getStudents(): Observable<Student[]> {
    return of([...this.students]);
  }

  getStudent(id: number): Observable<Student> {
    const student = this.students.find(s => s.id === id);
    if (student) {
      return of({...student});
    }
    throw new Error('Student not found');
  }

  createStudent(student: Omit<Student, 'id'>): Observable<Student> {
    const newStudent = {
      ...student,
      id: Math.max(...this.students.map(s => s.id)) + 1
    };
    this.students.push(newStudent);
    return of({...newStudent});
  }

  updateStudent(id: number, student: Omit<Student, 'id'>): Observable<Student> {
    const index = this.students.findIndex(s => s.id === id);
    if (index !== -1) {
      this.students[index] = { ...student, id };
      return of({...this.students[index]});
    }
    throw new Error('Student not found');
  }

  deleteStudent(id: number): Observable<void> {
    const index = this.students.findIndex(s => s.id === id);
    if (index !== -1) {
      this.students.splice(index, 1);
      return of(void 0);
    }
    throw new Error('Student not found');
  }
} 