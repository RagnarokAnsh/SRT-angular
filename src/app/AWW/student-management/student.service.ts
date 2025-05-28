import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
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
      
      // Log the anganwadi information if available
      if (apiStudent.anganwadi) {
        console.log('Student has anganwadi data:', apiStudent.anganwadi);
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
      console.error('Error calculating age:', error);
      age = 0;
    }
    
    // Log the student data for debugging
    console.log('Student data before mapping:', student);
    
    // Create the API student object with safe values
    // Only include fields that the API expects
    const apiStudent: any = {
      name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
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
    if (this.currentUserId) {
      apiStudent.aww_id = this.currentUserId;
    }
    
    console.log('Sending to API:', apiStudent);
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
    
    // Get the current user from the user service
    const currentUser = this.userService.getCurrentUser();
    
    // Check if the user is an AWW
    if (currentUser && this.userService.isAWW()) {
      console.log('Current AWW user:', currentUser);
      
      // First, check if the user has an anganwadi_id directly
      if (currentUser.anganwadi_id) {
        console.log('Found anganwadi_id in user profile:', currentUser.anganwadi_id);
        // Store this ID for future use
        this.currentUserAnganwadiId = currentUser.anganwadi_id;
        sessionStorage.setItem('aww_anganwadi_id', currentUser.anganwadi_id.toString());
        return of(currentUser.anganwadi_id);
      }
      
      // If the user has an anganwadi object, get the ID from there
      if (currentUser.anganwadi && currentUser.anganwadi.id) {
        console.log('Found anganwadi object in user profile:', currentUser.anganwadi);
        this.currentUserAnganwadiId = currentUser.anganwadi.id;
        sessionStorage.setItem('aww_anganwadi_id', currentUser.anganwadi.id.toString());
        return of(currentUser.anganwadi.id);
      }
      
      // If no anganwadi_id in the user profile, try the user-profile endpoint
      return this.http.get<any>(`${this.apiUrl}/user-profile`).pipe(
        switchMap(profile => {
          console.log('User profile response:', profile);
          
          // Check if the profile has an anganwadi_id field
          if (profile && profile.anganwadi_id) {
            console.log('Found anganwadi_id in user profile API:', profile.anganwadi_id);
            this.currentUserAnganwadiId = profile.anganwadi_id;
            sessionStorage.setItem('aww_anganwadi_id', profile.anganwadi_id.toString());
            return of(profile.anganwadi_id);
          }
          
          // If the profile has an anganwadi object
          if (profile && profile.anganwadi && profile.anganwadi.id) {
            console.log('Found anganwadi object in user profile API:', profile.anganwadi);
            this.currentUserAnganwadiId = profile.anganwadi.id;
            sessionStorage.setItem('aww_anganwadi_id', profile.anganwadi.id.toString());
            return of(profile.anganwadi.id);
          }
          
          // If no anganwadi_id is found, check for a stored ID
          const storedAnganwadiId = sessionStorage.getItem('aww_anganwadi_id');
          if (storedAnganwadiId) {
            const parsedId = parseInt(storedAnganwadiId, 10);
            console.log('Using stored anganwadi_id from session storage:', parsedId);
            this.currentUserAnganwadiId = parsedId;
            return of(parsedId);
          }
          
          // If all else fails, get the list of centers and use a fallback
          return this.http.get<any[]>(`${this.apiUrl}/anganwadi-centers`).pipe(
            map(centers => this.getFallbackAnganwadiId(centers)),
            catchError(error => {
              console.error('Error getting anganwadi centers:', error);
              return of(null);
            })
          );
        }),
        catchError(error => {
          console.error('Error getting user profile:', error);
          return of(null);
        })
      );
    }
    
    // For non-AWW users or if no user is logged in
    return of(null);
  }
  
  /**
   * Helper method to get anganwadi center details by ID
   */
  getAnganwadiDetails(anganwadiId: number): Observable<Anganwadi | null> {
    console.log('Looking up anganwadi details for ID:', anganwadiId);
    return this.http.get<Anganwadi[]>(`${this.apiUrl}/anganwadi-centers`).pipe(
      map(centers => {
        const center = centers.find(c => c.id === anganwadiId);
        if (center) {
          console.log('Found matching anganwadi center:', center);
          return center;
        }
        console.warn('No anganwadi center found with ID:', anganwadiId);
        return null;
      }),
      catchError(error => {
        console.error('Error getting anganwadi centers:', error);
        return of(null);
      })
    );
  }
  
  /**
   * Helper method to get a fallback anganwadi ID
   */
  private getFallbackAnganwadiId(centers: any[]): number | null {
    if (centers && centers.length > 0) {
      const centerId = centers[0].id;
      console.log('Using first available anganwadi center as fallback:', centerId);
      this.currentUserAnganwadiId = centerId;
      sessionStorage.setItem('aww_anganwadi_id', centerId.toString());
      return centerId;
    }
    console.warn('No anganwadi centers available');
    return null;
  }
  
  /**
   * Get all students, optionally filtered by current worker's anganwadi center
   */
  getStudents(filterByCurrentWorker: boolean = true): Observable<Student[]> {
    // If the user is an AWW and we want to filter by their anganwadi center
    if (filterByCurrentWorker && this.userService.isAWW()) {
      // First ensure we have the current user's anganwadi ID
      return this.getCurrentUserAnganwadiId().pipe(
        switchMap(anganwadiId => {
          if (!anganwadiId) {
            console.error('No anganwadi ID found for the current AWW user');
            return of([]);
          }
          this.currentUserAnganwadiId = anganwadiId;
          console.log('Filtering students by anganwadi ID:', anganwadiId);
          
          // Since we don't have a specific endpoint for filtering by anganwadi,
          // we'll get all students and filter client-side
          return this.http.get<ApiStudent[]>(`${this.apiUrl}/children`)
            .pipe(
              map(apiStudents => {
                console.log('Total students before filtering:', apiStudents.length);
                // Filter students by anganwadi_id
                const filteredApiStudents = apiStudents.filter(student => student.anganwadi_id === anganwadiId);
                console.log('Students after filtering by anganwadi_id:', filteredApiStudents.length);
                // Map API students to our application format
                return filteredApiStudents.map(apiStudent => this.mapApiStudentToStudent(apiStudent));
              })
            );
        })
      );
    } else {
      // For non-AWW users or when filtering is disabled, get all students
      return this.http.get<ApiStudent[]>(`${this.apiUrl}/children`)
        .pipe(
          map(apiStudents => {
            // Map API students to our application format
            return apiStudents.map(apiStudent => this.mapApiStudentToStudent(apiStudent));
          })
        );
    }
  }

  getStudent(id: number): Observable<Student> {
    return this.http.get<ApiStudent>(`${this.apiUrl}/children/${id}`)
      .pipe(
        map(apiStudent => this.mapApiStudentToStudent(apiStudent))
      );
  }

  createStudent(student: Omit<Student, 'id'>): Observable<Student> {
    // For AWW users, ensure the student is assigned to their anganwadi center
    if (this.userService.isAWW()) {
      return this.getCurrentUserAnganwadiId().pipe(
        switchMap(anganwadiId => {
          if (!anganwadiId) {
            return throwError(() => new Error('No anganwadi center assigned to the current user'));
          }
          
          // Set the anganwadi ID to the current user's anganwadi center
          student.anganwadiId = anganwadiId;
          
          // Map the student to API format - age calculation is now done inside mapStudentToApiFormat
          const apiStudent = this.mapStudentToApiFormat(student);
          
          // Create the headers for the request
          const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          });
          
          // Make the API request
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
                } else if (error.status === 500) {
                  // For 500 errors, provide more detailed information if available
                  console.log('Server error details:', error);
                  if (error.error && error.error.message) {
                    return throwError(() => new Error(`Server error: ${error.error.message}`));
                  }
                  return throwError(() => new Error('Server error occurred. Please try again or contact support.'));
                }
                
                return throwError(() => new Error(`Failed to create student: ${error.message || 'Unknown error'}`));
              })
            );
        })
      );
    } else {
      // For non-AWW users, proceed with the regular create process
      // Map the student to API format - age calculation is now done inside mapStudentToApiFormat
      const apiStudent = this.mapStudentToApiFormat(student);
      
      // Create the headers for the request
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      });
      
      // Make the API request
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
            } else if (error.status === 500) {
              // For 500 errors, provide more detailed information if available
              console.log('Server error details:', error);
              if (error.error && error.error.message) {
                return throwError(() => new Error(`Server error: ${error.error.message}`));
              }
              return throwError(() => new Error('Server error occurred. Please try again or contact support.'));
            }
            
            return throwError(() => new Error(`Failed to create student: ${error.message || 'Unknown error'}`));
          })
        );
    }
  }

  updateStudent(id: number, student: Omit<Student, 'id'>): Observable<Student> {
    // For AWW users, ensure they can only update students from their anganwadi center
    if (this.userService.isAWW()) {
      return this.getCurrentUserAnganwadiId().pipe(
        switchMap(anganwadiId => {
          if (!anganwadiId) {
            return throwError(() => new Error('No anganwadi center assigned to the current user'));
          }
          
          // First get the student to check if it belongs to the AWW's anganwadi center
          return this.getStudent(id).pipe(
            switchMap(existingStudent => {
              if (existingStudent.anganwadiId !== anganwadiId) {
                return throwError(() => new Error('You are not authorized to update students from other anganwadi centers'));
              }
              
              // Set the anganwadi ID to the current user's anganwadi center
              student.anganwadiId = anganwadiId;
              
              const apiStudent = this.mapStudentToApiFormat(student, id);
              return this.http.put<ApiStudent>(`${this.apiUrl}/children/${id}`, apiStudent)
                .pipe(
                  map(response => this.mapApiStudentToStudent(response))
                );
            })
          );
        })
      );
    } else {
      // For non-AWW users, proceed with the update
      const apiStudent = this.mapStudentToApiFormat(student, id);
      return this.http.put<ApiStudent>(`${this.apiUrl}/children/${id}`, apiStudent)
        .pipe(
          map(response => this.mapApiStudentToStudent(response))
        );
    }
  }

  deleteStudent(id: number): Observable<void> {
    // For AWW users, ensure they can only delete students from their anganwadi center
    if (this.userService.isAWW()) {
      return this.getCurrentUserAnganwadiId().pipe(
        switchMap(anganwadiId => {
          if (!anganwadiId) {
            return throwError(() => new Error('No anganwadi center assigned to the current user'));
          }
          
          // First get the student to check if it belongs to the AWW's anganwadi center
          return this.getStudent(id).pipe(
            switchMap(existingStudent => {
              if (existingStudent.anganwadiId !== anganwadiId) {
                return throwError(() => new Error('You are not authorized to delete students from other anganwadi centers'));
              }
              
              return this.http.delete<void>(`${this.apiUrl}/children/${id}`);
            })
          );
        })
      );
    } else {
      // For non-AWW users, proceed with the deletion
      return this.http.delete<void>(`${this.apiUrl}/children/${id}`);
    }
  }
}