import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, of, forkJoin } from 'rxjs';
import { UserService } from '../../services/user.service';
import { LoggerService } from '../../core/logger.service';
import { inject } from '@angular/core';

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
  age?: string; // Age at the time of assessment (e.g., '5 years 2 months')
  height?: string; // Height at the time of assessment
  weight?: string; // Weight at the time of assessment
}

export interface AssessmentSubmission {
  children: number[];
  competency_id: number;
  observation: string; 
  assessment_date: string;
  remarks?: string; 
  anganwadi_id: number;
  attempt_number: number;
  age?: string; // Age at the time of assessment (to be sent in POST)
  height?: string; // Height at the time of assessment (optional)
  weight?: string; // Weight at the time of assessment (optional)
}

// StudentRemarkSubmission interface removed

@Injectable({
  providedIn: 'root'
})
export class AssessmentService {
  private apiUrl = 'http://3.111.249.111/sribackend/api';
  private logger = inject(LoggerService);

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

  // PRODUCTION API: Get ALL assessments for an anganwadi at once
  getAllAssessmentsByAnganwadi(anganwadiId: number): Observable<AssessmentStudent[]> {
    return this.http.get<AssessmentStudent[]>(
      `${this.apiUrl}/assessments/anganwadi/${anganwadiId}/all`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ALTERNATIVE API: Get assessments for multiple competencies at once
  getAssessmentsByAnganwadiAndCompetencies(anganwadiId: number, competencyIds: number[]): Observable<AssessmentStudent[]> {
    const competencyIdsParam = competencyIds.join(',');
    return this.http.get<AssessmentStudent[]>(
      `${this.apiUrl}/assessments/anganwadi/${anganwadiId}/competencies/${competencyIdsParam}`
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
    this.logger.log('Assessment data being submitted:', JSON.stringify(assessments, null, 2));

    // Create an array of observables, one for each assessment submission
    const submissionObservables = assessments.map(assessment =>
      this.http.post<any>(`${this.apiUrl}/assessments/`, assessment, { 
        headers,
        observe: 'response' 
      }).pipe(
        catchError(err => {
          this.logger.error(`Error submitting assessment for children ${assessment.children}:`, err);
          this.logger.log('Failed assessment payload:', JSON.stringify(assessment, null, 2));
          if (err.error) {
            this.logger.error('Server error details:', err.error);
          }
          // Return the error wrapped in an observable so forkJoin continues with other requests
          return throwError(() => new Error(`Assessment submission failed for children ${assessment.children}: ${err.status} ${err.statusText}`));
        })
      )
    );

    // Use forkJoin to wait for all submissions to complete
    return forkJoin(submissionObservables).pipe(
      catchError(error => {
        this.logger.error('Error in forkJoin for assessments:', error);
        return throwError(() => new Error('Failed to submit one or more assessments. Please try again.'));
      })
    );
  }

  // updateStudentRemarks method removed

  private handleError(error: any) {
    this.logger.error('An error occurred:', error);
    
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
