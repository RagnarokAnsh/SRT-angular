import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError, of } from 'rxjs';
import { UserService } from '../../services/user.service';

export interface Anganwadi {
  id: number;
  name: string;
  code: string;
  project: string;
  sector: string;
  country_id: number;
  state_id: number;
  district_id: number;
  created_at: string;
  updated_at: string;
}

export interface ApiStudent {
  id: number;
  name: string;
  age: number;
  date_of_birth: string;
  symbol: string;
  height_cm: string;
  weight_kg: string;
  language: string;
  anganwadi_id: number;
  aww_id?: number; // The ID of the anganwadi worker who manages this student
  created_at: string;
  updated_at: string;
  anganwadi: Anganwadi;
}

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  symbol: string;
  height: number;
  weight: number;
  language: string;
  anganwadiId: number;
  awwId?: number; // The ID of the anganwadi worker who manages this student
  anganwadi?: Anganwadi;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = 'http://3.111.249.111/sribackend/api';
  private currentUserAnganwadiId: number | null = null;
  private currentUserId: number | null = null;

  constructor(private http: HttpClient, private userService: UserService) {
    // Get the current user's ID
    const currentUser = this.userService.getCurrentUser();
    if (currentUser) {
      this.currentUserId = currentUser.id;
      console.log('Current user ID:', this.currentUserId);
    }
    
    // Try to get the anganwadi center ID for the current user
    this.getCurrentUserAnganwadiId().subscribe(id => {
      this.currentUserAnganwadiId = id;
      console.log('Current user anganwadi ID:', id);
    });
  }

  // Helper method to convert API student format to our application format
  private mapApiStudentToStudent(apiStudent: any): Student {
    // Handle case where apiStudent might be undefined or null
    if (!apiStudent) {
      console.warn('Received null or undefined apiStudent in mapApiStudentToStudent');
      return {
        id: 0,
        firstName: '',
        lastName: '',
        dateOfBirth: new Date(),
        symbol: '',
        height: 0,
        weight: 0,
        language: '',
        anganwadiId: 1,
        awwId: this.currentUserId || undefined
      };
    }
    
    try {
      // Safely get name parts
      let firstName = '';
      let lastName = '';
      
      if (apiStudent.name) {
        const nameParts = apiStudent.name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      }
      
      // Safely parse numeric values
      const height = apiStudent.height_cm ? parseFloat(apiStudent.height_cm) : 0;
      const weight = apiStudent.weight_kg ? parseFloat(apiStudent.weight_kg) : 0;
      
      // Create date safely
      let dateOfBirth: Date;
      try {
        dateOfBirth = apiStudent.date_of_birth ? new Date(apiStudent.date_of_birth) : new Date();
      } catch (error) {
        console.error('Error parsing date of birth:', error);
        dateOfBirth = new Date();
      }
      
      return {
        id: apiStudent.id || 0,
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: dateOfBirth,
        symbol: apiStudent.symbol || '',
        height: isNaN(height) ? 0 : height,
        weight: isNaN(weight) ? 0 : weight,
        language: apiStudent.language || '',
        anganwadiId: apiStudent.anganwadi_id || 1,
        awwId: apiStudent.aww_id || this.currentUserId || undefined,
        anganwadi: apiStudent.anganwadi
      };
    } catch (error) {
      console.error('Error in mapApiStudentToStudent:', error);
      // Return a default student object if mapping fails
      return {
        id: 0,
        firstName: '',
        lastName: '',
        dateOfBirth: new Date(),
        symbol: '',
        height: 0,
        weight: 0,
        language: '',
        anganwadiId: 1
      };
    }
  }

  // Helper method to convert our application format to API format
  private mapStudentToApiFormat(student: Omit<Student, 'id'>, id?: number): any {
    // Format date properly - ensure it's in YYYY-MM-DD format
    let formattedDate: string;
    try {
      if (student.dateOfBirth instanceof Date) {
        formattedDate = student.dateOfBirth.toISOString().split('T')[0];
      } else if (typeof student.dateOfBirth === 'string') {
        // If it's already a string, try to parse it and format it
        const date = new Date(student.dateOfBirth);
        formattedDate = date.toISOString().split('T')[0];
      } else {
        console.log('Date of birth is neither Date nor string:', student.dateOfBirth);
        formattedDate = new Date().toISOString().split('T')[0]; // Fallback to today
      }
    } catch (error) {
      console.error('Error formatting date:', error, 'Using current date instead');
      formattedDate = new Date().toISOString().split('T')[0]; // Fallback to today if there's an error
    }
    
    // Make sure anganwadiId is a number
    let anganwadiId: number;
    try {
      anganwadiId = typeof student.anganwadiId === 'string' 
        ? parseInt(student.anganwadiId, 10) 
        : (student.anganwadiId || 1); // Default to 1 if undefined
    } catch (error) {
      console.error('Error parsing anganwadiId:', error, 'Using default value 1');
      anganwadiId = 1; // Default to 1 if there's an error
    }
    
    // Log the student data for debugging
    console.log('Student data before mapping:', student);
    
    // Create the API student object with safe values
    const apiStudent = {
      id: id,
      name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      date_of_birth: formattedDate,
      symbol: student.symbol || '',
      height_cm: student.height ? student.height.toString() : '0',
      weight_kg: student.weight ? student.weight.toString() : '0',
      language: student.language || '',
      anganwadi_id: anganwadiId,
      aww_id: this.currentUserId, // Assign the student to the current anganwadi worker
      age: 0 // Will be calculated later
    };
    
    return apiStudent;
  }

  /**
   * Get the anganwadi center ID for the current user
   * This would typically come from the user profile or a separate API call
   */
  getCurrentUserAnganwadiId(): Observable<number | null> {
    // If we already have the ID cached, return it
    if (this.currentUserAnganwadiId !== null) {
      return of(this.currentUserAnganwadiId);
    }
    
    // In a real implementation, you would get this from the user's profile
    // For now, we'll make a call to a user-profile endpoint
    return this.http.get<any>(`${this.apiUrl}/user-profile`)
      .pipe(
        map(profile => {
          // Extract the anganwadi_id from the profile
          if (profile && profile.anganwadi_id) {
            return profile.anganwadi_id;
          }
          // If the user is an AWW, they should have an anganwadi center assigned
          // For testing, if no center is assigned, use the first available center
          return 1; // Default to center ID 1 for testing
        }),
        catchError(error => {
          console.error('Error getting user profile:', error);
          return of(1); // Default to center ID 1 if there's an error
        })
      );
  }
  
  /**
   * Get all students, optionally filtered by current worker
   */
  getStudents(filterByCurrentWorker: boolean = true): Observable<Student[]> {
    return this.http.get<ApiStudent[]>(`${this.apiUrl}/children`)
      .pipe(
        map(apiStudents => {
          // Map API students to our application format
          const students = apiStudents.map(apiStudent => this.mapApiStudentToStudent(apiStudent));
          
          // If filtering is enabled and we have a user ID, filter the students
          if (filterByCurrentWorker && this.currentUserId) {
            // Filter students by aww_id if it exists, otherwise by anganwadi_id
            return students.filter(student => {
              // If aww_id is set, use that for filtering
              if (student.awwId) {
                return student.awwId === this.currentUserId;
              }
              
              // If no aww_id but we have anganwadi_id, use that as a fallback
              // This is for backward compatibility with existing data
              return student.anganwadiId === this.currentUserAnganwadiId;
            });
          }
          
          return students;
        })
      );
  }

  getStudent(id: number): Observable<Student> {
    return this.http.get<ApiStudent>(`${this.apiUrl}/children/${id}`)
      .pipe(
        map(apiStudent => this.mapApiStudentToStudent(apiStudent))
      );
  }

  createStudent(student: Omit<Student, 'id'>): Observable<Student> {
    // Add age field which might be required by the API
    const apiStudent = this.mapStudentToApiFormat(student);
    
    // Calculate age from date of birth safely
    try {
      if (student.dateOfBirth) {
        const birthDate = new Date(student.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        apiStudent.age = age;
      } else {
        // Default age if date of birth is not provided
        apiStudent.age = 5; // Default age for children
      }
    } catch (error) {
      console.error('Error calculating age:', error);
      apiStudent.age = 5; // Default age if calculation fails
    }
    
    console.log('Sending to API:', apiStudent);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    return this.http.post<any>(`${this.apiUrl}/children`, apiStudent, { headers })
      .pipe(
        map(response => {
          console.log('API response:', response);
          
          // Check if the response has a nested child object (common in Laravel APIs)
          if (response && response.child) {
            return this.mapApiStudentToStudent(response.child);
          } else if (response && response.data) {
            return this.mapApiStudentToStudent(response.data);
          } else if (response && typeof response === 'object') {
            // If the response is the student object directly
            return this.mapApiStudentToStudent(response);
          } else {
            // Create a default student object if we can't map from the response
            return {
              id: 0,
              firstName: student.firstName,
              lastName: student.lastName,
              dateOfBirth: new Date(student.dateOfBirth),
              symbol: student.symbol,
              height: student.height,
              weight: student.weight,
              language: student.language,
              anganwadiId: student.anganwadiId
            };
          }
        }),
        catchError(error => {
          console.error('API error details:', error);
          
          // Try to extract validation errors from the response
          if (error.status === 422 && error.error) {
            console.log('Validation errors:', error.error);
            let errorMessage = 'Validation failed: ';
            
            // Laravel typically returns validation errors in error.error.errors
            if (error.error.errors) {
              const validationErrors = error.error.errors;
              const errorFields = Object.keys(validationErrors);
              
              errorFields.forEach(field => {
                errorMessage += `${field}: ${validationErrors[field].join(', ')}. `;
              });
            } else if (typeof error.error === 'string') {
              errorMessage += error.error;
            }
            
            return throwError(() => new Error(errorMessage));
          }
          
          return throwError(() => new Error(`Failed to create student: ${error.message || 'Unknown error'}`));
        })
      );
  }

  updateStudent(id: number, student: Omit<Student, 'id'>): Observable<Student> {
    const apiStudent = this.mapStudentToApiFormat(student, id);
    return this.http.put<ApiStudent>(`${this.apiUrl}/children/${id}`, apiStudent)
      .pipe(
        map(response => this.mapApiStudentToStudent(response))
      );
  }

  deleteStudent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/children/${id}`);
  }
}