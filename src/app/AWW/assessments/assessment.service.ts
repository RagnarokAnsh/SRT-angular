import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, of, forkJoin } from 'rxjs';
import { UserService } from '../../services/user.service';

export interface AssessmentStudent {
  name: string;
  gender: string;
  session_1: string | SessionData;
  session_2: string | SessionData;
  session_3: string | SessionData;
  session_4: string | SessionData;
  remarks?: string;
  child_id?: number;
}

export interface SessionData {
  observation: string;
  created_at: string;
  remarks?: string;
}

export interface AssessmentSubmission {
  children: number[];
  competency_id: number;
  observation: string; // Changed from score to observation
  assessment_date: string;
  remarks?: string; // Added back to match backend API
  anganwadi_id: number;
  attempt_number: number;
}

// StudentRemarkSubmission interface removed

@Injectable({
  providedIn: 'root'
})
export class AssessmentService {
  private apiUrl = 'http://3.111.249.111/sribackend/api';

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) { }

  // Get all assessments
  getAssessments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/assessments/`).pipe(
      catchError(this.handleError)
    );
  }

  // Get assessments for a specific anganwadi and competency
  getAssessmentsByAnganwadiAndCompetency(anganwadiId: number, competencyId: number): Observable<AssessmentStudent[]> {
    return this.http.get<AssessmentStudent[]>(
      `${this.apiUrl}/assessments/anganwadi/${anganwadiId}/competency/${competencyId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Submit a new assessment
  submitAssessment(assessment: AssessmentSubmission): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post<any>(`${this.apiUrl}/assessments/`, assessment, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Submit multiple assessments one by one
  submitMultipleAssessments(assessments: AssessmentSubmission[]): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    if (assessments.length === 0) {
      return of({ success: true, message: 'No assessments to submit' });
    }

    // Log the assessment data being sent
    console.log('Assessment data being submitted:', JSON.stringify(assessments, null, 2));

    // Create an array of observables, one for each assessment submission
    const submissionObservables = assessments.map(assessment =>
      this.http.post<any>(`${this.apiUrl}/assessments/`, assessment, { // Original endpoint
        headers,
        observe: 'response' // Get the full response including headers and status
      }).pipe(
        catchError(err => {
          console.error(`Error submitting assessment for children ${assessment.children}:`, err);
          console.log('Failed assessment payload:', JSON.stringify(assessment, null, 2));
          if (err.error) {
            console.error('Server error details:', err.error);
          }
          // Return the error wrapped in an observable so forkJoin continues with other requests
          return throwError(() => new Error(`Assessment submission failed for children ${assessment.children}: ${err.status} ${err.statusText}`));
        })
      )
    );

    // Use forkJoin to wait for all submissions to complete
    return forkJoin(submissionObservables).pipe(
      catchError(error => {
        console.error('Error in forkJoin for assessments:', error);
        return throwError(() => new Error('Failed to submit one or more assessments. Please try again.'));
      })
    );
  }

  // updateStudentRemarks method removed

  private handleError(error: any) {
    console.error('An error occurred:', error);
    
    // Extract more specific error message if available
    let errorMessage = 'Something went wrong. Please try again later.';
    
    if (error.error && error.error.detail) {
      errorMessage = error.error.detail;
    } else if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status === 422) {
      errorMessage = 'Invalid data provided. Please check your submission and try again.';
    } else if (error.status === 404) {
      errorMessage = 'Resource not found. Please check your request and try again.';
    } else if (error.status === 401) {
      errorMessage = 'Unauthorized. Please log in again.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
