import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject, Subscription } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { UserService, User } from '../../services/user.service';
import { LoggerService } from '../../core/logger.service';
import { inject } from '@angular/core';

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
  date_of_birth: string;
  symbol: string;
  height_cm: string;
  weight_kg: string;
  language: string;
  anganwadi_id: number;
  age: number;
  created_at: string;
  updated_at: string;
  anganwadi?: Anganwadi;
  gender: string;
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
  gender: string; // Added gender
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = 'http://3.111.249.111/sribackend/api';
  private currentUser: User | null = null;
  private currentUserSubscription: Subscription;
  private logger = inject(LoggerService);

  constructor(private http: HttpClient, private userService: UserService) {
    // Subscribe to currentUser$ to always have the latest user
    this.currentUserSubscription = this.userService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  // Helper method to convert API student format to our application format
  private mapApiStudentToStudent(apiStudent: any): Student {
    // Handle case where apiStudent might be undefined or null
    if (!apiStudent) {
      this.logger.warn('Received null or undefined apiStudent in mapApiStudentToStudent');
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
        awwId: this.currentUser?.id || undefined,
        gender: '' // Default gender
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
        this.logger.error('Error parsing date of birth:', error);
        dateOfBirth = new Date();
      }

      // Log the anganwadi information if available
      if (apiStudent.anganwadi) {

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
        awwId: apiStudent.aww_id || this.currentUser?.id || undefined,
        anganwadi: apiStudent.anganwadi,
        gender: apiStudent.gender || '' // Map gender
      };
    } catch (error) {
      this.logger.error('Error mapping API student:', error);
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
        anganwadiId: 1,
        gender: '' // Default gender on error
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
        this.logger.log('Date of birth is neither Date nor string:', student.dateOfBirth);
        formattedDate = new Date().toISOString().split('T')[0]; // Fallback to today
      }
    } catch (error) {
      this.logger.error('Error formatting date:', error, 'Using current date instead');
      formattedDate = new Date().toISOString().split('T')[0]; // Fallback to today if there's an error
    }

    // Make sure anganwadiId is a number
    let anganwadiId: number;
    try {
      anganwadiId = typeof student.anganwadiId === 'string'
        ? parseInt(student.anganwadiId, 10)
        : (student.anganwadiId || 1); // Default to 1 if undefined
    } catch (error) {
      this.logger.error('Error parsing anganwadiId:', error, 'Using default value 1');
      anganwadiId = 1; // Default to 1 if there's an error
    }

    // Calculate age from date of birth
    let age = 0;
    try {
      if (student.dateOfBirth) {
        const birthDate = new Date(student.dateOfBirth);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }
    } catch (error) {
      this.logger.error('Error calculating age:', error);
      age = 0;
    }

    // Log the student data for debugging
    this.logger.log('Student data before mapping:', student);

    // Create the API student object with safe values
    // Only include fields that the API expects
    const apiStudent: any = {
      name: `${student.firstName} ${student.lastName}`,
      gender: student.gender, // Add gender to API format
      date_of_birth: formattedDate,
      symbol: student.symbol || '',
      height_cm: student.height ? student.height.toString() : '0',
      weight_kg: student.weight ? student.weight.toString() : '0',
      language: student.language || '',
      anganwadi_id: anganwadiId,
      age: age
    };

    // Only add the ID if it's provided (for updates)
    if (id) {
      apiStudent.id = id;
    }

    // Only add the AWW ID if we have a current user
    if (this.currentUser?.id) {
      apiStudent.aww_id = this.currentUser.id;
    }

    this.logger.log('Sending to API:', apiStudent);
    return apiStudent;
  }

  /**
   * Get the anganwadi center ID for the current user
   */
  getCurrentUserAnganwadiId(): Observable<number | null> {
    const user = this.currentUser;
    if (user && this.userService.isAWW()) {
      if (typeof user.anganwadi_id === 'number') {
        return of(user.anganwadi_id);
      } else if (user.anganwadi && typeof user.anganwadi.id === 'number') {
        // Fallback if anganwadi_id is not directly on user, but on user.anganwadi.id
        return of(user.anganwadi.id);
      } else {
        this.logger.warn('getCurrentUserAnganwadiId: AWW user ' + user.id + ' does not have a valid anganwadi_id. This needs to be fixed in user data.');
        return of(null);
      }
    }

    // If not an AWW, or no current user, return null
    // this.logger.log('getCurrentUserAnganwadiId: User is not AWW or no current user, returning null.');
    return of(null);
  }

  /**
   * Helper method to get anganwadi center details by ID
   */
  getAnganwadiDetails(anganwadiId: number): Observable<Anganwadi | null> {
    // this.logger.log('Looking up anganwadi details for ID:', anganwadiId);
    return this.http.get<Anganwadi[]>(`${this.apiUrl}/anganwadi-centers`).pipe(
      map(centers => {
        const center = centers.find(c => c.id === anganwadiId);
        if (center) {
          // this.logger.log('Found matching anganwadi center:', center);
          return center;
        }
        // this.logger.warn('No anganwadi center found with ID:', anganwadiId);
        return null;
      }),
      catchError(error => {
        this.logger.error('Error getting anganwadi centers in getAnganwadiDetails:', error);
        return of(null);
      })
    );
  }

  /**
   * Get all students, optionally filtered by current worker's anganwadi center
   */
  getStudents(filterByCurrentWorker: boolean = true): Observable<Student[]> {
    if (filterByCurrentWorker && this.userService.isAWW()) {
      return this.getCurrentUserAnganwadiId().pipe(
        switchMap(awwAnganwadiId => {
          if (awwAnganwadiId === null) { // Check for null specifically
            this.logger.warn('getStudents: AWW user has no anganwadiId, returning empty list of students.');
            return of([]); // Return empty array if AWW has no anganwadi ID
          }
          // this.logger.log('getStudents: Filtering students by anganwadi ID:', awwAnganwadiId);
          return this.http.get<ApiStudent[]>(`${this.apiUrl}/children`).pipe(
            map(apiStudents => {
              const filteredApiStudents = apiStudents.filter(apiStudent => apiStudent.anganwadi_id === awwAnganwadiId);
              // this.logger.log(`getStudents: Total students ${apiStudents.length}, filtered to ${filteredApiStudents.length} for anganwadi ID ${awwAnganwadiId}`);
              return filteredApiStudents.map(apiStudent => this.mapApiStudentToStudent(apiStudent));
            }),
            catchError(this.handleError) // Handle errors from fetching children
          );
        }),
        catchError(this.handleError) // Handle errors from getCurrentUserAnganwadiId
      );
    } else {
      // For non-AWW users or when filtering is disabled, get all students
      // this.logger.log('getStudents: Fetching all students (user not AWW or filter disabled).');
      return this.http.get<ApiStudent[]>(`${this.apiUrl}/children`).pipe(
        map(apiStudents => apiStudents.map(apiStudent => this.mapApiStudentToStudent(apiStudent))),
        catchError(this.handleError)
      );
    }
  }

  getStudent(id: number): Observable<Student> {
    return this.http.get<ApiStudent>(`${this.apiUrl}/children/${id}`).pipe(
      switchMap(apiStudent => {
        const student = this.mapApiStudentToStudent(apiStudent);
        if (this.userService.isAWW()) {
          return this.getCurrentUserAnganwadiId().pipe(
            map(awwAnganwadiId => {
              if (!awwAnganwadiId) {
                this.logger.error('AWW user does not have an Anganwadi ID. Access denied for student:', id);
                throw new Error('Access Denied: Your Anganwadi center information is missing.');
              } // This closes: if (!awwAnganwadiId)
              if (student.anganwadiId !== awwAnganwadiId) {
                this.logger.warn(`Access Denied: AWW (Anganwadi ID: ${awwAnganwadiId}) attempting to access student (ID: ${id}) from different Anganwadi (ID: ${student.anganwadiId}).`);
                throw new Error('Access Denied: You do not have permission to view this student.');
              }
              return student; // Return the student if access is permitted
            }) // Closes: map(awwAnganwadiId => { ... })
          ); // Closes: return this.getCurrentUserAnganwadiId().pipe(...)
        } // Closes: if (this.userService.isAWW())
        return of(student); // Non-AWW users can access, or if not AWW, return student directly
      }), // Closes: switchMap(apiStudent => { ... })
      catchError(this.handleError)
    ); // Closes: return this.http.get(...).pipe(...)
  } // Closes: getStudent(id: number): Observable<Student>

  createStudent(studentData: Omit<Student, 'id'>): Observable<Student> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    if (this.userService.isAWW()) {
      return this.getCurrentUserAnganwadiId().pipe(
        switchMap(awwAnganwadiId => {
          if (!awwAnganwadiId) {
            return throwError(() => new Error('Access Denied: Anganwadi center not assigned. Cannot create student.'));
          }
          const studentPayload = {
            ...studentData,
            anganwadiId: awwAnganwadiId // Enforce AWW's anganwadiId
          };
          const apiStudent = this.mapStudentToApiFormat(studentPayload);
          return this.http.post<ApiStudent>(`${this.apiUrl}/children`, apiStudent, { headers }).pipe(
            map(response => this.mapApiStudentToStudent(response)),
            catchError(this.handleError)
          );
        }),
        catchError(this.handleError) // Catch errors from getCurrentUserAnganwadiId or if awwAnganwadiId is null
      );
    } else {
      // For non-AWW users, proceed with the regular create process
      const apiStudent = this.mapStudentToApiFormat(studentData);
      return this.http.post<ApiStudent>(`${this.apiUrl}/children`, apiStudent, { headers }).pipe(
        map(response => this.mapApiStudentToStudent(response)),
        catchError(this.handleError)
      );
    }
  }

updateStudent(id: number, studentData: Omit<Student, 'id'>): Observable<Student> {
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  if (this.userService.isAWW()) {
    return this.getStudent(id).pipe( // This call includes the access check
      switchMap(existingStudent => { // existingStudent is confirmed to be accessible by AWW
        return this.getCurrentUserAnganwadiId().pipe(
          switchMap(awwAnganwadiId => {
            if (!awwAnganwadiId) {
              return throwError(() => new Error('Access Denied: Anganwadi center not assigned. Cannot update student.'));
            }
            // Ensure the student update uses the AWW's anganwadiId
            const studentPayloadForApi = {
              ...studentData,
              anganwadiId: awwAnganwadiId, // Enforce AWW's anganwadiId
            };
            const apiStudent = this.mapStudentToApiFormat(studentPayloadForApi, id);
            return this.http.put<ApiStudent>(`${this.apiUrl}/children/${id}`, apiStudent, { headers }).pipe(
              map(response => this.mapApiStudentToStudent(response))
              // Error handling for the PUT request is chained in the outer catchError
            );
          })
        );
      }),
      catchError(this.handleError) // Catches errors from getStudent, getCurrentUserAnganwadiId, or the PUT request
    );
  } else {
    // Admin or other roles: proceed without AWW restrictions
    const apiStudent = this.mapStudentToApiFormat(studentData, id);
    return this.http.put<ApiStudent>(`${this.apiUrl}/children/${id}`, apiStudent, { headers }).pipe(
      map(response => this.mapApiStudentToStudent(response)),
      catchError(this.handleError)
    );
  }
}

deleteStudent(id: number): Observable<void> {
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  if (this.userService.isAWW()) {
    return this.getStudent(id).pipe( // This call includes the access check
      switchMap(student => { // student is confirmed to be accessible by AWW
        return this.http.delete<void>(`${this.apiUrl}/children/${id}`, { headers });
      }),
      catchError(this.handleError) // Catches errors from getStudent or the DELETE request
    );
  } else {
    // Admin or other roles: proceed without AWW restrictions
    return this.http.delete<void>(`${this.apiUrl}/children/${id}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }
}

private handleError = (error: HttpErrorResponse): Observable<never> => {
  if (error.error instanceof ErrorEvent) {
    // A client-side or network error occurred. Handle it accordingly.
    this.logger.error('An error occurred:', error.error.message);
  } else {
    // The backend returned an unsuccessful response code.
    // The response body may contain clues as to what went wrong.
    this.logger.error(
      `Backend returned code ${error.status}, ` +
      `body was: ${JSON.stringify(error.error)}`);
  }
  // Return an observable with a user-facing error message.
  // For access denied errors thrown explicitly, this might be overridden by the specific error message.
  if (error.status === 403 || error.message.startsWith('Access Denied')) {
    return throwError(() => new Error(error.message || 'Access Denied: You do not have permission to perform this action.'));
  }
  return throwError(() => new Error('Something bad happened; please try again later.'));
};
}