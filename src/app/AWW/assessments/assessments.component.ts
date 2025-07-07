import { Component, ChangeDetectionStrategy, inject, OnInit, ViewChild, TemplateRef, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { forkJoin, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

// Local Interfaces
interface LevelDescription {
  level: string;
  description: string;
  color: string;
}

// Services
import { CompetencyService, ApiCompetency } from '../../competency.service';
import { Student as ServiceStudent } from '../student-management/student.service';
import { StudentService } from '../student-management/student.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AssessmentService, AssessmentSubmission } from './assessment.service';
import { UserService } from '../../services/user.service';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';

/**
 * Interface for Assessment data structure
 */
interface Assessment {
  child_ids: number[];
  competency_id: number;
  observation: string;
  assessment_date: string;
  remarks?: string;
}

/**
 * Interface for Student data structure
 */
interface Student {
  id: number;
  first_name: string;
  birth_date: string;
  aww_id?: number;
  gender: string;
  selected: boolean;
  assessed: boolean;
  assessmentLevel: string;
  assessmentDate?: string;
  remarks1?: string;
  assessed2?: boolean;
  assessmentLevel2?: string;
  assessmentDate2?: string;
  remarks2?: string;
  assessed3?: boolean;
  assessmentLevel3?: string;
  assessmentDate3?: string;
  remarks3?: string;
  assessed4?: boolean;
  assessmentLevel4?: string;
  assessmentDate4?: string;
  remarks4?: string;
  remarks?: string;
  sessions?: number;
}

/**
 * Interface for level descriptions
 */
interface LevelDescription {
  level: string;
  description: string;
  color: string;
}

/**
 * Assessment Component
 * Handles the assessment workflow for students based on competency levels
 */
@Component({
  selector: 'app-assessments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatRadioModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatCheckboxModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatDialogModule,
    MatTooltipModule,
    MatSortModule,
    MatPaginatorModule,
    ToastModule
  ],
  templateUrl: './assessments.component.html',
  styleUrls: ['./assessments.component.scss'],
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ]
})
export class AssessmentsComponent implements OnInit {
  // Template references
  @ViewChild('teachingStrategiesDialog') teachingStrategiesDialog!: TemplateRef<any>;
  @ViewChild('remarksDialog') remarksDialog!: TemplateRef<any>;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('videoPlayer') videoPlayer!: ElementRef;

  // UI control
  selectedCompetency: string = '';
  selectedCompetencyId: number = 0;
  activeTab: 'students' | 'levels' = 'students';
  menuOpen = false;
  currentRemarks: string = '';
  currentStudent: Student | null = null;
  currentAudio: HTMLAudioElement | null = null;
  students: Student[] = [];
  filteredStudents: Student[] = [];
  displayedColumns: string[] = ['select', 'name', 'assessmentInfo']; // 'remarks' column temporarily removed
  maxSessions: number = 1;
  dataSource = new MatTableDataSource<Student>();
  selection = new SelectionModel<Student>(true, []);
  levelDescriptions: LevelDescription[] = [];
  assessment: Assessment = {
    child_ids: [],
    competency_id: 0,
    observation: '',
    assessment_date: new Date().toISOString().split('T')[0],
    remarks: ''
  };
  currentUserAnganwadiId: number | null = null;
  allStudents: Student[] = [];
  isLoading: boolean = false;

  // UI feedback messages
  createSuccess: string = '';
  createError: string = '';
  messageTimeout: any;

  // Competency information
  competencyId: number = 0;
  competencyData: ApiCompetency | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private competencyService: CompetencyService,
    private studentService: StudentService,
    private messageService: MessageService,
    private assessmentService: AssessmentService,
    private userService: UserService
  ) {}

  /**
   * Initialize component
   */
  ngOnInit() {
    // Get the current user's anganwadi ID
    const currentUser = this.userService.getCurrentUser();
    if (currentUser && this.userService.isAWW() && currentUser.anganwadi_id) {
      this.currentUserAnganwadiId = currentUser.anganwadi_id;
      console.log('Current user anganwadi ID:', this.currentUserAnganwadiId);
    }

    // Get competency ID from route params
    this.route.params.subscribe(params => {
      const competencyId = params['id'];
      if (competencyId) {
        this.loadCompetencyData(+competencyId);
      } else {
        // Fallback to competency name if available
        const storedCompetencyName = localStorage.getItem('selectedCompetencyName');
        if (storedCompetencyName) {
          this.loadCompetencyByName(storedCompetencyName);
        }
      }
    });

    // Load students
    this.loadStudents();
  }

  loadStudents() {
    if (!this.currentUserAnganwadiId) {
      console.warn('Cannot load students: missing current user anganwadi ID.');
      this.students = [];
      this.allStudents = [];
      this.updateDataSource();
      this.checkAndLoadAssessments(); // Still attempt, in case anganwadi ID is set later by another means
      return;
    }
    this.isLoading = true;
    this.studentService.getStudents().subscribe({ // Service internally filters by AWW's anganwadi ID
      next: (data: ServiceStudent[]) => {
        this.students = data.map(serviceStudent => {
          const day = serviceStudent.dateOfBirth.getDate().toString().padStart(2, '0');
          const month = (serviceStudent.dateOfBirth.getMonth() + 1).toString().padStart(2, '0');
          const year = serviceStudent.dateOfBirth.getFullYear();
          const birthDateString = `${day}/${month}/${year}`;

          return {
            id: serviceStudent.id,
            first_name: serviceStudent.firstName,
            last_name: serviceStudent.lastName,
            birth_date: birthDateString,
            symbol: serviceStudent.symbol,
            height: serviceStudent.height,
            weight: serviceStudent.weight,
            language: serviceStudent.language,
            anganwadiId: serviceStudent.anganwadiId,
            awwId: serviceStudent.awwId,
            gender: serviceStudent.gender,
            // UI specific fields
            selected: false,
            assessed: false, assessmentLevel: '', assessmentDate: '',
            assessed2: false, assessmentLevel2: '', assessmentDate2: '',
            assessed3: false, assessmentLevel3: '', assessmentDate3: '',
            assessed4: false, assessmentLevel4: '', assessmentDate4: '',
            remarks: '',
            sessionCount: 0,
            name: `${serviceStudent.firstName} ${serviceStudent.lastName}`.trim()
          };
        });
        this.allStudents = [...this.students];
        this.updateDataSource();
        this.isLoading = false;
        console.log('Students loaded and processed.');
        this.checkAndLoadAssessments();
      },
      error: (err: any) => {
        console.error('Error loading students:', err);
        this.showMessage('Failed to load students.', true);
        this.students = [];
        this.allStudents = [];
        this.updateDataSource();
        this.isLoading = false;
        this.checkAndLoadAssessments();
      }
    });
  }

  private checkAndLoadAssessments() {
    if (this.students && this.students.length > 0 && this.assessment && this.assessment.competency_id && this.currentUserAnganwadiId) {
      console.log('checkAndLoadAssessments: Prerequisites met. Calling loadAssessments.');
      this.loadAssessments();
    } else {
      let missing = [];
      if (!this.students || this.students.length === 0) missing.push('students not loaded or empty');
      if (!this.assessment || !this.assessment.competency_id) missing.push('assessment.competency_id not set');
      if (!this.currentUserAnganwadiId) missing.push('currentUserAnganwadiId not set');
      console.log(`checkAndLoadAssessments: Prerequisites not met. Missing: ${missing.join('; ')}.`);
    }
  }

  /**
   * Load competency data by ID
   */
  loadCompetencyData(competencyId: number) {
    if (!competencyId) {
      this.showMessage('Invalid competency ID', true);
      return;
    }

    // Fetch competency data by ID
    this.competencyService.getCompetencyById(competencyId).subscribe({
      next: (competency) => {
        if (competency) {
          this.competencyData = competency as any;
          this.selectedCompetency = competency.name;
          this.assessment.competency_id = competency.id;
          this.loadLevelDescriptions();
          this.checkAndLoadAssessments();
        } else {
          this.showMessage('Competency not found', true);
        }
      },
      error: (err) => {
        console.error('Error fetching competency data:', err);
        this.showMessage('Failed to load competency information.', true);

        // Set a default competency ID for fallback
        this.assessment.competency_id = 1;
        this.loadLevelDescriptions();
        this.loadAssessments();
      }
    });
  }

  /**
   * Load competency by name (fallback method)
   */
  loadCompetencyByName(competencyName: string) {
    if (!competencyName) {
      this.showMessage('No competency selected', true);
      return;
    }

    // Fetch all competencies and find by name
    this.competencyService.getDomainsWithCompetencies().subscribe({
      next: (domains) => {
        let foundCompetency = null;

        // Search through all domains and their competencies
        for (const domain of domains) {
          const competency = domain.competencies.find(c =>
            c.name.toLowerCase() === competencyName.toLowerCase());
          if (competency) {
            foundCompetency = competency;
            break;
          }
        }

        if (foundCompetency) {
          this.competencyData = foundCompetency as any;
          this.selectedCompetency = foundCompetency.name;
          this.assessment.competency_id = foundCompetency.id;
          this.competencyId = foundCompetency.id;
        } else {
          // If not found, use first competency as fallback
          if (domains.length > 0 && domains[0].competencies.length > 0) {
            const firstCompetency = domains[0].competencies[0];
            this.competencyData = firstCompetency as any;
            this.selectedCompetency = firstCompetency.name;
            this.assessment.competency_id = firstCompetency.id;
            this.competencyId = firstCompetency.id;
          }
        }

        this.loadLevelDescriptions();
        this.checkAndLoadAssessments();
      },
      error: (err) => {
        console.error('Error fetching competencies:', err);
        this.showMessage('Failed to load competency information.', true);

        // Set a default competency ID for fallback
        this.assessment.competency_id = 1;
        this.loadLevelDescriptions();
        this.loadAssessments();
      }
    });
  }

  /**
   * Load existing assessments from API
   */
  loadAssessments() {
    if (!this.currentUserAnganwadiId || !this.assessment.competency_id) {
      console.warn('Cannot load assessments: missing anganwadi ID or competency ID');
      // Clear existing assessment data from students if competency changes to nothing valid
      this.students.forEach(student => {
        student.assessed = false; student.assessmentLevel = ''; student.assessmentDate = '';
        student.assessed2 = false; student.assessmentLevel2 = ''; student.assessmentDate2 = '';
        student.assessed3 = false; student.assessmentLevel3 = ''; student.assessmentDate3 = '';
        student.assessed4 = false; student.assessmentLevel4 = ''; student.assessmentDate4 = '';
        student.sessions = 0;
      });
      this.updateDataSource();
      this.updateDisplayedColumns();
      return;
    }
    console.log(`Loading assessments for competency_id: ${this.assessment.competency_id} and anganwadi_id: ${this.currentUserAnganwadiId}`);

    this.assessmentService.getAssessmentsByAnganwadiAndCompetency(
      this.currentUserAnganwadiId,
      this.assessment.competency_id
    ).pipe(
      tap(rawAssessmentData => {
      console.log('[AssessmentsComponent] Raw data from assessmentService.getAssessmentsByAnganwadiAndCompetency:', JSON.parse(JSON.stringify(rawAssessmentData)));
      
      // Extract general assessment remarks from the first assessment if available
      if (rawAssessmentData && rawAssessmentData.length > 0) {
        // First check if there's a top-level remarks field in the first assessment
        if (rawAssessmentData[0].remarks) {
          this.assessment.remarks = rawAssessmentData[0].remarks;
          console.log('Loaded general assessment remarks from top-level field:', this.assessment.remarks);
        } 
        // If no top-level remarks, check if the latest session has remarks
        else {
          const firstAssessment = rawAssessmentData[0];
          // Check session 4 first (most recent), then 3, 2, 1
          if (firstAssessment.session_4 && typeof firstAssessment.session_4 === 'object' && firstAssessment.session_4.remarks) {
            this.assessment.remarks = firstAssessment.session_4.remarks;
            console.log('Loaded general assessment remarks from session 4:', this.assessment.remarks);
          } else if (firstAssessment.session_3 && typeof firstAssessment.session_3 === 'object' && firstAssessment.session_3.remarks) {
            this.assessment.remarks = firstAssessment.session_3.remarks;
            console.log('Loaded general assessment remarks from session 3:', this.assessment.remarks);
          } else if (firstAssessment.session_2 && typeof firstAssessment.session_2 === 'object' && firstAssessment.session_2.remarks) {
            this.assessment.remarks = firstAssessment.session_2.remarks;
            console.log('Loaded general assessment remarks from session 2:', this.assessment.remarks);
          } else if (firstAssessment.session_1 && typeof firstAssessment.session_1 === 'object' && firstAssessment.session_1.remarks) {
            this.assessment.remarks = firstAssessment.session_1.remarks;
            console.log('Loaded general assessment remarks from session 1:', this.assessment.remarks);
          }
        }
      }
    }),
    map((assessmentStudents: any[]) => {
        console.log('Loaded assessments:', assessmentStudents);
        
        // Debug: Log the raw structure of the first assessment to understand the API response format
        if (assessmentStudents && assessmentStudents.length > 0) {
          console.log('First assessment data structure:', JSON.stringify(assessmentStudents[0], null, 2));
          
          // Check session structure specifically
          const firstAssessment = assessmentStudents[0];
          console.log('Session 1 type:', typeof firstAssessment.session_1);
          console.log('Session 1 value:', firstAssessment.session_1);
          
          if (typeof firstAssessment.session_1 === 'object' && firstAssessment.session_1 !== null) {
            console.log('Session 1 properties:', Object.keys(firstAssessment.session_1));
            console.log('Session 1 observation:', firstAssessment.session_1.observation);
            console.log('Session 1 created_at:', firstAssessment.session_1.created_at);
          }
        }

        // Reset max sessions
        this.maxSessions = 1;

        // Map the assessment data to our students
        return this.students.map(student => {
          // Find this student in the assessment data by ID first, then fall back to name matching
          const assessmentData = assessmentStudents.find(a => {
            // If child_id is available, use it for exact matching
            if (a.child_id && student.id && a.child_id === student.id) {
              return true;
            }
            
            // Otherwise fall back to name matching
            return a.name && student.first_name && 
                  (a.name.toLowerCase() === student.first_name.toLowerCase() || 
                   a.name.toLowerCase().includes(student.first_name.toLowerCase()));
          });
          
          // Log whether we found a match for this student
          console.log(`Student ${student.first_name} (ID: ${student.id}) match found:`, !!assessmentData);

          const updatedStudent = { ...student };
          // Reset assessment fields before populating
          updatedStudent.assessed = false; updatedStudent.assessmentLevel = ''; updatedStudent.assessmentDate = '';
          updatedStudent.assessed2 = false; updatedStudent.assessmentLevel2 = ''; updatedStudent.assessmentDate2 = '';
          updatedStudent.assessed3 = false; updatedStudent.assessmentLevel3 = ''; updatedStudent.assessmentDate3 = '';
          updatedStudent.assessed4 = false; updatedStudent.assessmentLevel4 = ''; updatedStudent.assessmentDate4 = '';
          updatedStudent.sessions = 0;

          if (assessmentData) {
            // Count the number of sessions this student has
            let sessionCount = 0;
            
            // Log the raw session data for debugging
            console.log('Session data for student:', student.first_name);
            console.log('Session 1:', assessmentData.session_1);
            console.log('Session 2:', assessmentData.session_2);
            console.log('Session 3:', assessmentData.session_3);
            console.log('Session 4:', assessmentData.session_4);
            
            // Helper function to process session data
            const processSession = (sessionData: any, sessionNumber: number) => {
              if (!sessionData || sessionData === '-') { // If sessionData itself is '-' or null/undefined
                return false; // No session data at all for this slot
              }

                // Handle object format (expected from API based on logs)
              if (typeof sessionData === 'object' && sessionData.observation != null && sessionData.created_at != null) {
                let level = ''; // Default to empty string for level
                if (sessionData.observation !== '-') {
                  level = String(sessionData.observation);
                }
                // Session exists, so set assessed flags and date
                switch (sessionNumber) {
                  case 1:
                    updatedStudent.assessed = true;
                    console.log(`Student: ${updatedStudent.first_name}, Session: ${sessionNumber}, API Observation: ${sessionData.observation}, Calculated Level: '${level}'`);
                    updatedStudent.assessmentLevel = level;
                    updatedStudent.assessmentDate = this.formatDateForDisplay(sessionData.created_at);
                    // Store session-specific remarks
                    updatedStudent.remarks1 = sessionData.remarks || '';
                    console.log(`Session 1 remarks for ${updatedStudent.first_name}:`, updatedStudent.remarks1);
                    break;
                  case 2:
                    updatedStudent.assessed2 = true;
                    console.log(`Student: ${updatedStudent.first_name}, Session: ${sessionNumber}, API Observation: ${sessionData.observation}, Calculated Level: '${level}'`);
                    updatedStudent.assessmentLevel2 = level;
                    updatedStudent.assessmentDate2 = this.formatDateForDisplay(sessionData.created_at);
                    // Store session-specific remarks
                    updatedStudent.remarks2 = sessionData.remarks || '';
                    console.log(`Session 2 remarks for ${updatedStudent.first_name}:`, updatedStudent.remarks2);
                    break;
                  case 3:
                    updatedStudent.assessed3 = true;
                    console.log(`Student: ${updatedStudent.first_name}, Session: ${sessionNumber}, API Observation: ${sessionData.observation}, Calculated Level: '${level}'`);
                    updatedStudent.assessmentLevel3 = level;
                    updatedStudent.assessmentDate3 = this.formatDateForDisplay(sessionData.created_at);
                    // Store session-specific remarks
                    updatedStudent.remarks3 = sessionData.remarks || '';
                    console.log(`Session 3 remarks for ${updatedStudent.first_name}:`, updatedStudent.remarks3);
                    break;
                  case 4:
                    updatedStudent.assessed4 = true;
                    console.log(`Student: ${updatedStudent.first_name}, Session: ${sessionNumber}, API Observation: ${sessionData.observation}, Calculated Level: '${level}'`);
                    updatedStudent.assessmentLevel4 = level;
                    updatedStudent.assessmentDate4 = this.formatDateForDisplay(sessionData.created_at);
                    // Store session-specific remarks
                    updatedStudent.remarks4 = sessionData.remarks || '';
                    console.log(`Session 4 remarks for ${updatedStudent.first_name}:`, updatedStudent.remarks4);
                    break;
                }
                return true; // Session processed, contributes to sessionCount
              } else if (typeof sessionData === 'string' && sessionData !== '-') {
                let level = sessionData;
                let date = this.formatDateForDisplay(new Date().toISOString()); // Or a placeholder date
                switch (sessionNumber) {
                  case 1: updatedStudent.assessed = true; updatedStudent.assessmentLevel = level; updatedStudent.assessmentDate = date; break; // remarks1 removed
                  case 2: updatedStudent.assessed2 = true; updatedStudent.assessmentLevel2 = level; updatedStudent.assessmentDate2 = date; break; // remarks2 removed
                  case 3: updatedStudent.assessed3 = true; updatedStudent.assessmentLevel3 = level; updatedStudent.assessmentDate3 = date; break; // remarks3 removed
                  case 4: updatedStudent.assessed4 = true; updatedStudent.assessmentLevel4 = level; updatedStudent.assessmentDate4 = date; break; // remarks4 removed
                }
                return true;
              }

              return false; // Default if not processed or unrecognized format
            };
            
            // Process each session
            if (processSession(assessmentData.session_1, 1)) sessionCount = Math.max(sessionCount, 1);
            if (processSession(assessmentData.session_2, 2)) sessionCount = Math.max(sessionCount, 2);
            if (processSession(assessmentData.session_3, 3)) sessionCount = Math.max(sessionCount, 3);
            if (processSession(assessmentData.session_4, 4)) sessionCount = Math.max(sessionCount, 4);
            
            if (sessionCount > this.maxSessions) {
              this.maxSessions = sessionCount;
            }
            updatedStudent.remarks = assessmentData.remarks || '';
            updatedStudent.sessions = sessionCount;
          }
          return updatedStudent;
        });
      }),
      catchError(error => {
        console.error('Error loading assessments:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load assessments',
          life: 3000
        });
        // Return the original students array with reset assessment fields
        return of(this.students.map(student => {
          const resetStudent = { ...student };
          resetStudent.assessed = false; resetStudent.assessmentLevel = ''; resetStudent.assessmentDate = '';
          resetStudent.assessed2 = false; resetStudent.assessmentLevel2 = ''; resetStudent.assessmentDate2 = '';
          resetStudent.assessed3 = false; resetStudent.assessmentLevel3 = ''; resetStudent.assessmentDate3 = '';
          resetStudent.assessed4 = false; resetStudent.assessmentLevel4 = ''; resetStudent.assessmentDate4 = '';
          resetStudent.sessions = 0;
          return resetStudent;
        }));
      })
    ).subscribe(updatedStudents => {
      this.students = updatedStudents;
      this.updateDisplayedColumns();
      this.updateDataSource();
    });
  }
  
  /**
   * Update displayed columns based on the maximum number of sessions
   */
  updateDisplayedColumns() {
    // Start with the base columns
    this.displayedColumns = ['select', 'name'];
    
    // Add session columns based on max sessions
    for (let i = 1; i <= this.maxSessions; i++) {
      this.displayedColumns.push(`assessmentInfo${i > 1 ? i : ''}`);
    }
    
    // Add remarks column at the end - temporarily disabled
    // this.displayedColumns.push('remarks');
    
    console.log('Updated displayed columns:', this.displayedColumns);
  }

  /**
   * Handle form submission
   */
  onSubmit() {
    console.log('Submitting assessment:', this.assessment);

    // Validation
    if (!this.assessment.observation) { // Changed from score to observation
      this.showMessage('Please select a level.', true);
      return;
    }

    if (this.selection.selected.length === 0) {
      this.showMessage('Please select at least one student.', true);
      return;
    }
    
    // Check if any selected student already has 4 sessions completed
    if (this.hasMaxSessionsReached()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Maximum Sessions Reached',
        detail: 'You have already submitted assessments for all 4 sessions for one or more selected students. Please select another competency to assess.',
        life: 5000
      });
      return;
    }

    // Show confirmation dialog
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Assessment Submission',
        message: 'Once submitted, this assessment cannot be edited. Are you sure you want to proceed?',
        confirmText: 'Submit Assessment'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.submitAssessment();
      }
    });
  }

  /**
   * Submit assessment after confirmation
   */
  private submitAssessment() {
    // Get selected student IDs
    const selectedStudentIds = this.selection.selected.map((student: Student) => student.id);
    
    if (selectedStudentIds.length === 0) {
      this.showMessage('No students selected. Please select at least one student.', true);
      return;
    }
    
    console.log('Selected student IDs:', selectedStudentIds);
    
    // Update the assessment object with the selected student IDs
    this.assessment.child_ids = selectedStudentIds;
    
    // Get the current user's anganwadi ID
    const currentUser = this.userService.getCurrentUser();
    const anganwadiId = currentUser?.anganwadi_id || this.currentUserAnganwadiId;
    
    if (!anganwadiId) {
      this.showMessage('Anganwadi ID not found. Please ensure you are logged in with AWW role.', true);
      return;
    }
    
    // Create assessment submissions for each selected student
    const submissions: AssessmentSubmission[] = selectedStudentIds.map(childId => {
      // Find the student to determine which session/attempt this is
      const student = this.students.find(s => s.id === childId);
      let attemptNumber = 1; // Default to 1 if no previous assessments
      
      if (student) {
        // Determine the next attempt number based on existing sessions
        if (student.assessed && student.assessed2 && student.assessed3 && student.assessed4) {
          // All sessions are already assessed, we'll update the last one
          attemptNumber = 4;
        } else if (student.assessed && student.assessed2 && student.assessed3) {
          attemptNumber = 4; // Fourth assessment
        } else if (student.assessed && student.assessed2) {
          attemptNumber = 3; // Third assessment
        } else if (student.assessed) {
          attemptNumber = 2; // Second assessment
        }
        // If none are assessed, it remains 1 (first assessment)
      }
      
      console.log(`Student ${childId} attempt number: ${attemptNumber}`);
      const currentObservationForSubmission = this.assessment.observation; // Changed variable name and source
      console.log(`[Debug] For child ${childId}, attempt ${attemptNumber}, captured observation for submission payload: '${currentObservationForSubmission}'`); // Log message updated, variable updated
      
      return {
        children: [childId], //  array with the child ID
        competency_id: this.assessment.competency_id,
        observation: currentObservationForSubmission,
        assessment_date: this.assessment.assessment_date,
        remarks: this.assessment.remarks || '', 
        anganwadi_id: anganwadiId,
        attempt_number: attemptNumber
      };
    });
    
    console.log('Submitting assessments (payload to service):', submissions);

    // Submit assessments to API
    this.assessmentService.submitMultipleAssessments(submissions).subscribe({
      next: (response) => {
        this.showMessage('Assessment saved successfully!');
        
        // Reload assessments from the server to ensure we have the latest data
        this.loadAssessments();

        // Update student assessment status locally
        this.students = this.students.map(student => {
          if (selectedStudentIds.includes(student.id)) {
            // Get today's date for the assessment
            const today = new Date().toISOString().split('T')[0];
            const updatedStudent = { ...student };
            
            // Determine which session to update based on existing data
            if (!student.assessed) {
              // First assessment
              updatedStudent.assessed = true;
              updatedStudent.assessmentLevel = this.assessment.observation;
              updatedStudent.assessmentDate = today;
              updatedStudent.sessions = 1;
            } else if (!student.assessed2) {
              // Second assessment
              updatedStudent.assessed2 = true;
              updatedStudent.assessmentLevel2 = this.assessment.observation;
              updatedStudent.assessmentDate2 = today;
              updatedStudent.sessions = 2;
            } else if (!student.assessed3) {
              // Third assessment
              updatedStudent.assessed3 = true;
              updatedStudent.assessmentLevel3 = this.assessment.observation;
              updatedStudent.assessmentDate3 = today;
              updatedStudent.sessions = 3;
            } else if (!student.assessed4) {
              // Fourth assessment
              updatedStudent.assessed4 = true;
              updatedStudent.assessmentLevel4 = this.assessment.observation;
              updatedStudent.assessmentDate4 = today;
            }
            
            return updatedStudent;
          }
          return student;
        });
        
        // Update max sessions and displayed columns
        const maxSessionsFound = Math.max(...this.students.map(s => s.sessions || 0));
        if (maxSessionsFound > this.maxSessions) {
          this.maxSessions = maxSessionsFound;
          this.updateDisplayedColumns();
        }

        this.updateDataSource();

        // Reset form for next assessment
        this.assessment.observation = '';
        this.selection.clear();

        // Redirect back to the student selection tab
        this.setActiveTab('students');
      },
      error: (err) => {
        console.error('Error submitting assessment:', err);
        
        // Extract the error message from the error object
        let errorMessage = 'Failed to save assessment. Please try again.';
        
        if (err.message) {
          errorMessage = err.message;
        }
        
        // Log additional details for debugging
        if (err.error) {
          console.error('Error details:', err.error);
        }
        
        this.showMessage(errorMessage, true);
      }
    });
  }

  /**
   * Load level descriptions based on competency ID
   */
  /**
   * Set the active tab and update progress indicator
   */
  setActiveTab(tab: 'students' | 'levels') {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  /**
   * Check if any selected student has already completed 4 sessions
   * @returns true if any selected student has 4 sessions completed
   */
  hasMaxSessionsReached(): boolean {
    if (!this.selection || this.selection.selected.length === 0) {
      return false;
    }
    
    // Check if any selected student already has 4 sessions completed
    return this.selection.selected.some(student => {
      return student.assessed && student.assessed2 && student.assessed3 && student.assessed4;
    });
  }

  /**
   * Check if all selected students have completed all 4 sessions
   * @returns true if all selected students have completed all 4 sessions
   */
  areAllSessionsCompleted(): boolean {
    if (!this.selection || this.selection.selected.length === 0) {
      return false;
    }
    
    // Check if all selected students have completed all 4 sessions
    return this.selection.selected.every(student => {
      return student.assessed && student.assessed2 && student.assessed3 && student.assessed4;
    });
  }

  /**
   * Update the data source for the table
   */
  updateDataSource() {
    this.dataSource.data = this.students;
    this.cdr.detectChanges(); // Trigger change detection
  
    this.filteredStudents = [...this.students];
    this.dataSource.data = this.filteredStudents;
    setTimeout(() => {
      if (this.sort) {
        this.dataSource.sort = this.sort;
      }
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
      this.cdr.detectChanges();
    });
  }

  /**
   * Filter the students table
   */
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    
    if (!filterValue) {
      this.filteredStudents = [...this.students];
    } else {
      this.filteredStudents = this.students.filter(student => 
        student.first_name.toLowerCase().includes(filterValue)
      );
    }
    
    this.dataSource.data = this.filteredStudents;
    this.cdr.detectChanges();
  }

  /**
   * Check if all rows are selected
   */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.filteredStudents.length;
    return numSelected === numRows;
  }

  /**
   * Toggle all rows selection
   */
  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.filteredStudents.forEach(row => this.selection.select(row));
    }
  }

  /**
   * Open remarks dialog for a student
   */
  openRemarks(student: Student) {
    this.currentStudent = student;
    this.currentRemarks = student.remarks || '';
    
    const dialogRef = this.dialog.open(this.remarksDialog);
    dialogRef.afterClosed().subscribe((result: string | false) => { 
      if (result !== false && this.currentStudent) {
        this.currentStudent.remarks = result as string; 
        this.updateDataSource(); 
      }
    });
  }

  /**
   * Show message with auto-fade
   */
  showMessage(message: string, isError: boolean = false) {
    // Clear any existing timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    
    // Set the message
    if (isError) {
      this.createError = message;
      this.createSuccess = '';
    } else {
      this.createSuccess = message;
      this.createError = '';
    }
    
    // Auto-fade after 5 seconds
    this.messageTimeout = setTimeout(() => {
      this.createSuccess = '';
      this.createError = '';
      this.cdr.detectChanges();
    }, 5000);
  }
  
  /**
   * Navigate back to the details page for the current competency
   */
  backToVideos() {
    if (this.competencyId) {
      this.router.navigate(['/details', this.competencyId]);
    } else {
      // If no competency ID is available, navigate to the select competency page
      this.router.navigate(['/select-competency']);
    }
  }

  /**
   * Calculate age from birth date
   */
  calculateAge(birthDate: string): number {
    if (!birthDate) return 0;
    
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Load level descriptions based on competency ID
   */
  loadLevelDescriptions() {
    const competencyId = this.assessment.competency_id;
    const competencyName = this.selectedCompetency.toLowerCase();
    
    // Set level descriptions based on competency type
    if (competencyName.includes('gross motor')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Limited balance in gross motor activities, e.g., jumping', color: '#FFD657' },
        { level: 'Progressing', description: 'Maintains balance in gross motor activities', color: '#FFC067' },
        { level: 'Advanced', description: 'Maintains balance and controls body while moving quickly', color: '#AFD588' },
        { level: 'PSR', description: 'Balances and coordinates well in a variety of activities, such as throwing a ball with aim or kicking a ball at a given target', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('fine motor')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Limited coordination of small muscles in fine motor activities', color: '#FFD657' },
        { level: 'Progressing', description: 'Maintains coordination of small muscles in fine motor activities', color: '#FFC067' },
        { level: 'Advanced', description: 'Maintains coordination of small muscles while manipulating objects', color: '#AFD588' },
        { level: 'PSR', description: 'Controls and coordinates well in a variety of small muscle activities', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('vocabulary') || competencyName.includes('expression')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Uses gestures to express/describe any event', color: '#FFD657' },
        { level: 'Progressing', description: 'Uses words to express/describe any event', color: '#FFC067' },
        { level: 'Advanced', description: 'Uses incomplete sentences to express/describe any event', color: '#AFD588' },
        { level: 'PSR', description: 'Uses complete sentences to express/describe any event', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('reading')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Recognizes some letters and sounds. Shows interest in books.', color: '#FFD657' },
        { level: 'Progressing', description: 'Reads simple words. Understands basic story elements.', color: '#FFC067' },
        { level: 'Advanced', description: 'Reads fluently. Comprehends main ideas and details.', color: '#AFD588' },
        { level: 'PSR', description: 'Reads with expression. Understands complex texts and makes connections.', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('listening')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Does not pay attention to a story/conversation', color: '#FFD657' },
        { level: 'Progressing', description: 'Listens actively to a story/conversation', color: '#FFC067' },
        { level: 'Advanced', description: 'Understands a story/conversation – responds to simple/close-ended questions (e.g., what, when, who)', color: '#AFD588' },
        { level: 'PSR', description: 'Understands a story/conversation –responds to complex/open-ended questions (e.g., why and how)', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('classification')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Unable to sort objects based on any characteristic', color: '#FFD657' },
        { level: 'Progressing', description: 'Sorts objects based on any one characteristic', color: '#FFC067' },
        { level: 'Advanced', description: 'Classifies objects based on any two characteristics', color: '#AFD588' },
        { level: 'PSR', description: 'Classifies objects based on three characteristics', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('creative') || competencyName.includes('representation')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Unable to create something to represent an idea or object (e.g., by using arts and crafts, dance or music)', color: '#FFD657' },
        { level: 'Progressing', description: 'Creates something with an adult\'s assistance', color: '#FFC067' },
        { level: 'Advanced', description: 'Creates something on her/his own', color: '#AFD588' },
        { level: 'PSR', description: 'Creates something innovative to represent an idea or object', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('writing')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Scribbles to represent writing', color: '#FFD657' },
        { level: 'Progressing', description: 'Draws shapes to represent writing', color: '#FFC067' },
        { level: 'Advanced', description: 'Engages in make-believe writing by using a combination of drawing and writing to express an idea', color: '#AFD588' },
        { level: 'PSR', description: 'Uses inventive spelling (based on phonics) to write words that are connected to a given topic', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('seriation') || competencyName.includes('pattern')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Unable to copy patterns', color: '#FFD657' },
        { level: 'Progressing', description: 'Copies patterns', color: '#FFC067' },
        { level: 'Advanced', description: 'Completes simple alternating patterns', color: '#AFD588' },
        { level: 'PSR', description: 'Completes complex patterns', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('sequencing') || competencyName.includes('ordering')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Unable to compare two objects in terms of size, length, or quantity', color: '#FFD657' },
        { level: 'Progressing', description: 'Compares two similar objects based on size, length, or quantity', color: '#FFC067' },
        { level: 'Advanced', description: 'Arranges up to three objects by size, length, or quantity', color: '#AFD588' },
        { level: 'PSR', description: 'Arranges up to five objects by size, length, or quantity', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('number')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Unable to compare quantities', color: '#FFD657' },
        { level: 'Progressing', description: 'Connects a number with an object and counts each object with understanding', color: '#FFC067' },
        { level: 'Advanced', description: 'Identifies numerals and can link them with concrete objects', color: '#AFD588' },
        { level: 'PSR', description: 'Identifies both the smallest and the largest numerals within 1 to 10', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('emotional') || competencyName.includes('regulation') || competencyName.includes('focus')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Focuses on play activities for a short period of time (about 5 minutes)', color: '#FFD657' },
        { level: 'Progressing', description: 'Engages in play activities for about 10 minutes', color: '#FFC067' },
        { level: 'Advanced', description: 'Sustains focus in play activities for about 15 minutes', color: '#AFD588' },
        { level: 'PSR', description: 'Sustains focus in play activities for at least 20-25 minutes, even if there are distractions', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('interaction') || competencyName.includes('social play')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Plays alongside or near others but not with others', color: '#FFD657' },
        { level: 'Progressing', description: 'Starts to play with others', color: '#FFC067' },
        { level: 'Advanced', description: 'Plays with others to make/create something jointly', color: '#AFD588' },
        { level: 'PSR', description: 'Engages in games with rules with other children', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('imagination'))  {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Unable to answer questions about what would happen next in a story', color: '#FFD657' },
        { level: 'Progressing', description: 'Answers questions about what would happen next in a story', color: '#FFC067' },
        { level: 'Advanced', description: 'Role-plays characters in a story or uses props to tell a story', color: '#AFD588' },
        { level: 'PSR', description: 'Makes up and tells own story', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('initiative')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Does not take action even after being asked to do something', color: '#FFD657' },
        { level: 'Progressing', description: 'Begins to take initiative when encouraged', color: '#FFC067' },
        { level: 'Advanced', description: 'Takes initiative in some activities which she/he likes', color: '#AFD588' },
        { level: 'PSR', description: 'Takes initiative readily in most/all of the classroom activities', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('sharing')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Shares unwillingly with peers and only when asked', color: '#FFD657' },
        { level: 'Progressing', description: 'Begins to share selectively when encouraged', color: '#FFC067' },
        { level: 'Advanced', description: 'Comes forward and shares with selected/few peers', color: '#AFD588' },
        { level: 'PSR', description: 'Comes forward and shares with all/any peers on her/his own', color: '#9FDFF8' }
      ];
    } else {
      // Default fallback for other competencies
      this.levelDescriptions = [
        { level: 'Beginner', description: 'The child shows initial attempts with limited success. Assess based on effort and support needed.', color: '#FFD657' },
        { level: 'Progressing', description: 'The child improves with practice but needs guidance. Assess based on progress shown.', color: '#FFC067' },
        { level: 'Advanced', description: 'The child performs the task with confidence. Assess based on consistency and skill.', color: '#AFD588' },
        { level: 'PSR', description: 'The child masters the task and applies it in context. Assess based on readiness for next stage.', color: '#9FDFF8' }
      ];
    }
  }

  private formatDateForDisplay(dateString: string | null | undefined): string {
    if (!dateString) return '';
    try {
      // Check if dateString is already in DD/MM/YYYY format
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return dateString;
      }

      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        const parts = dateString.split(/[- :T]/);
        if (parts.length >= 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);

          if (year > 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const manualDate = new Date(Date.UTC(year, month - 1, day));
            if (!isNaN(manualDate.getTime())) {
              const d = manualDate.getUTCDate().toString().padStart(2, '0');
              const m = (manualDate.getUTCMonth() + 1).toString().padStart(2, '0');
              const y = manualDate.getUTCFullYear();
              return `${d}/${m}/${y}`;
            }
          }
        }
        console.warn('Invalid date string for formatting:', dateString);
        return dateString; 
      }

      const d = date.getUTCDate().toString().padStart(2, '0');
      const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const y = date.getUTCFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      console.error('Error formatting date:', dateString, e);
      return dateString;
    }
  }
}