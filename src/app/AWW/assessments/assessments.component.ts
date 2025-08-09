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

import { MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';
import { AssessmentService, AssessmentSubmission } from './assessment.service';
import { UserService } from '../../services/user.service';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { ErrorHandlerService } from '../../core/error/error-handler.service';
import { SkeletonLoaderComponent } from '../../components/skeleton-loader';
import { LoggerService } from '../../core/logger.service';

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
  // Height/weight per session for competency 10 and 11
  height1?: string;
  weight1?: string;
  height2?: string;
  weight2?: string;
  height3?: string;
  weight3?: string;
  height4?: string;
  weight4?: string;
  // Age per session
  age1?: string;
  age2?: string;
  age3?: string;
  age4?: string;
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

    InputNumberModule,
    SkeletonLoaderComponent
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
  pageSize = 10;
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
  showHeightWeightColumns: boolean = false;
  showHeightWeightInputs: boolean = false;
  isGrossOrFineMotor: boolean = false;

  // UI feedback messages - now using PrimeNG toasts

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
    private userService: UserService,
    private errorHandler: ErrorHandlerService,
    private logger: LoggerService
  ) {}

  /**
   * Initialize component
   */
  ngOnInit() {
    this.setPageSize();
    window.addEventListener('resize', this.setPageSize.bind(this));
    // Get the current user's anganwadi ID
    const currentUser = this.userService.getCurrentUser();
    if (currentUser && this.userService.isAWW() && currentUser.anganwadi_id) {
      this.currentUserAnganwadiId = currentUser.anganwadi_id;
      this.logger.log('Current user anganwadi ID:', this.currentUserAnganwadiId);
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

  ngOnDestroy() {
    window.removeEventListener('resize', this.setPageSize.bind(this));
  }

  loadStudents() {
    if (!this.currentUserAnganwadiId) {
      this.logger.warn('Cannot load students: missing current user anganwadi ID.');
      this.students = [];
      this.allStudents = [];
      this.updateDataSource();
      this.checkAndLoadAssessments(); // Still attempt, in case anganwadi ID is set later by another means
      this.isLoading = false;
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
            height: serviceStudent.height !== undefined ? String(serviceStudent.height) : '',
            weight: serviceStudent.weight !== undefined ? String(serviceStudent.weight) : '',
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
        this.logger.log('Students loaded and processed.');
        this.checkAndLoadAssessments();
      },
      error: (err: any) => {
        this.logger.error('Error loading students:', err);
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
      this.logger.log('checkAndLoadAssessments: Prerequisites met. Calling loadAssessments.');
      this.loadAssessments();
    } else {
      let missing = [];
      if (!this.students || this.students.length === 0) missing.push('students not loaded or empty');
      if (!this.assessment || !this.assessment.competency_id) missing.push('assessment.competency_id not set');
      if (!this.currentUserAnganwadiId) missing.push('currentUserAnganwadiId not set');
      this.logger.log(`checkAndLoadAssessments: Prerequisites not met. Missing: ${missing.join('; ')}.`);
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
        this.logger.error('Error fetching competency data:', err);
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
        this.logger.error('Error fetching competencies:', err);
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
    // Always clear remarks when loading new assessments
    this.assessment.remarks = '';
    if (!this.currentUserAnganwadiId || !this.assessment.competency_id) {
      this.logger.warn('Cannot load assessments: missing anganwadi ID or competency ID');
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
    this.logger.log(`Loading assessments for competency_id: ${this.assessment.competency_id} and anganwadi_id: ${this.currentUserAnganwadiId}`);

    this.assessmentService.getAssessmentsByAnganwadiAndCompetency(
      this.currentUserAnganwadiId,
      this.assessment.competency_id
    ).pipe(
      tap(rawAssessmentData => {
      this.logger.log('[AssessmentsComponent] Raw data from assessmentService.getAssessmentsByAnganwadiAndCompetency:', JSON.parse(JSON.stringify(rawAssessmentData)));
      
      // Extract general assessment remarks from the first assessment if available
      if (rawAssessmentData && rawAssessmentData.length > 0) {
        // First check if there's a top-level remarks field in the first assessment
        if (rawAssessmentData[0].remarks) {
          this.assessment.remarks = rawAssessmentData[0].remarks;
          this.logger.log('Loaded general assessment remarks from top-level field:', this.assessment.remarks);
        } 
        // If no top-level remarks, check if the latest session has remarks
        else {
          const firstAssessment = rawAssessmentData[0];
          // Check session 4 first (most recent), then 3, 2, 1
          if (firstAssessment.session_4 && typeof firstAssessment.session_4 === 'object' && firstAssessment.session_4.remarks) {
            this.assessment.remarks = firstAssessment.session_4.remarks;
            this.logger.log('Loaded general assessment remarks from session 4:', this.assessment.remarks);
          } else if (firstAssessment.session_3 && typeof firstAssessment.session_3 === 'object' && firstAssessment.session_3.remarks) {
            this.assessment.remarks = firstAssessment.session_3.remarks;
            this.logger.log('Loaded general assessment remarks from session 3:', this.assessment.remarks);
          } else if (firstAssessment.session_2 && typeof firstAssessment.session_2 === 'object' && firstAssessment.session_2.remarks) {
            this.assessment.remarks = firstAssessment.session_2.remarks;
            this.logger.log('Loaded general assessment remarks from session 2:', this.assessment.remarks);
          } else if (firstAssessment.session_1 && typeof firstAssessment.session_1 === 'object' && firstAssessment.session_1.remarks) {
            this.assessment.remarks = firstAssessment.session_1.remarks;
            this.logger.log('Loaded general assessment remarks from session 1:', this.assessment.remarks);
          }
        }
      }
    }),
    map((assessmentStudents: any[]) => {
        this.logger.log('Loaded assessments:', assessmentStudents);
        
        // Debug: Log the raw structure of the first assessment to understand the API response format
        if (assessmentStudents && assessmentStudents.length > 0) {
          this.logger.log('First assessment data structure:', JSON.stringify(assessmentStudents[0], null, 2));
          
          // Check session structure specifically
          const firstAssessment = assessmentStudents[0];
          this.logger.log('Session 1 type:', typeof firstAssessment.session_1);
          this.logger.log('Session 1 value:', firstAssessment.session_1);
          
          if (typeof firstAssessment.session_1 === 'object' && firstAssessment.session_1 !== null) {
            this.logger.log('Session 1 properties:', Object.keys(firstAssessment.session_1));
            this.logger.log('Session 1 observation:', firstAssessment.session_1.observation);
            this.logger.log('Session 1 created_at:', firstAssessment.session_1.created_at);
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
          this.logger.log(`Student ${student.first_name} (ID: ${student.id}) match found:`, !!assessmentData);

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
            this.logger.log('Session data for student:', student.first_name);
            this.logger.log('Session 1:', assessmentData.session_1);
            this.logger.log('Session 2:', assessmentData.session_2);
            this.logger.log('Session 3:', assessmentData.session_3);
            this.logger.log('Session 4:', assessmentData.session_4);
            
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
                
                // Extract age from session data if available
                if (sessionData.age) {
                  (updatedStudent as any)[`age${sessionNumber}`] = sessionData.age;
                }
                
                // Session exists, so set assessed flags and date
                switch (sessionNumber) {
                  case 1:
                    updatedStudent.assessed = true;
                    this.logger.log(`Student: ${updatedStudent.first_name}, Session: ${sessionNumber}, API Observation: ${sessionData.observation}, Calculated Level: '${level}'`);
                    updatedStudent.assessmentLevel = level;
                    updatedStudent.assessmentDate = this.formatDateForDisplay(sessionData.created_at);
                    // Store session-specific remarks
                    updatedStudent.remarks1 = sessionData.remarks || '';
                    this.logger.log(`Session 1 remarks for ${updatedStudent.first_name}:`, updatedStudent.remarks1);
                    break;
                  case 2:
                    updatedStudent.assessed2 = true;
                    this.logger.log(`Student: ${updatedStudent.first_name}, Session: ${sessionNumber}, API Observation: ${sessionData.observation}, Calculated Level: '${level}'`);
                    updatedStudent.assessmentLevel2 = level;
                    updatedStudent.assessmentDate2 = this.formatDateForDisplay(sessionData.created_at);
                    // Store session-specific remarks
                    updatedStudent.remarks2 = sessionData.remarks || '';
                    this.logger.log(`Session 2 remarks for ${updatedStudent.first_name}:`, updatedStudent.remarks2);
                    break;
                  case 3:
                    updatedStudent.assessed3 = true;
                    this.logger.log(`Student: ${updatedStudent.first_name}, Session: ${sessionNumber}, API Observation: ${sessionData.observation}, Calculated Level: '${level}'`);
                    updatedStudent.assessmentLevel3 = level;
                    updatedStudent.assessmentDate3 = this.formatDateForDisplay(sessionData.created_at);
                    // Store session-specific remarks
                    updatedStudent.remarks3 = sessionData.remarks || '';
                    this.logger.log(`Session 3 remarks for ${updatedStudent.first_name}:`, updatedStudent.remarks3);
                    break;
                  case 4:
                    updatedStudent.assessed4 = true;
                    this.logger.log(`Student: ${updatedStudent.first_name}, Session: ${sessionNumber}, API Observation: ${sessionData.observation}, Calculated Level: '${level}'`);
                    updatedStudent.assessmentLevel4 = level;
                    updatedStudent.assessmentDate4 = this.formatDateForDisplay(sessionData.created_at);
                    // Store session-specific remarks
                    updatedStudent.remarks4 = sessionData.remarks || '';
                    this.logger.log(`Session 4 remarks for ${updatedStudent.first_name}:`, updatedStudent.remarks4);
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
          // Add height/weight if available (for gross/fine motor)
          if (assessmentData) {
            // Store height/weight per session if available
            if (assessmentData.session_1 && assessmentData.session_1.height) {
              const h1 = assessmentData.session_1.height;
              (updatedStudent as any).height1 = (!isNaN(Number(h1)) && h1 !== null && h1 !== undefined && h1 !== '') ? Number(h1) : '';
            }
            if (assessmentData.session_1 && assessmentData.session_1.weight) {
              (updatedStudent as any).weight1 = assessmentData.session_1.weight;
            }
            if (assessmentData.session_2 && assessmentData.session_2.height) {
              const h2 = assessmentData.session_2.height;
              (updatedStudent as any).height2 = (!isNaN(Number(h2)) && h2 !== null && h2 !== undefined && h2 !== '') ? Number(h2) : '';
            }
            if (assessmentData.session_2 && assessmentData.session_2.weight) {
              (updatedStudent as any).weight2 = assessmentData.session_2.weight;
            }
            if (assessmentData.session_3 && assessmentData.session_3.height) {
              const h3 = assessmentData.session_3.height;
              (updatedStudent as any).height3 = (!isNaN(Number(h3)) && h3 !== null && h3 !== undefined && h3 !== '') ? Number(h3) : '';
            }
            if (assessmentData.session_3 && assessmentData.session_3.weight) {
              (updatedStudent as any).weight3 = assessmentData.session_3.weight;
            }
            if (assessmentData.session_4 && assessmentData.session_4.height) {
              const h4 = assessmentData.session_4.height;
              (updatedStudent as any).height4 = (!isNaN(Number(h4)) && h4 !== null && h4 !== undefined && h4 !== '') ? Number(h4) : '';
            }
            if (assessmentData.session_4 && assessmentData.session_4.weight) {
              (updatedStudent as any).weight4 = assessmentData.session_4.weight;
            }
          }
          return updatedStudent;
        });
      }),
      catchError(error => {
        this.logger.error('Error loading assessments:', error);
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
    
    // Add height/weight input columns for competency 10 and 11
    if (this.showHeightWeightInputs) {
      this.displayedColumns.push('heightInput', 'weightInput');
    }
    
    // Add session columns based on max sessions
    for (let i = 1; i <= this.maxSessions; i++) {
      this.displayedColumns.push(`assessmentInfo${i > 1 ? i : ''}`);
    }
    
    // Add remarks column at the end - temporarily disabled
    // this.displayedColumns.push('remarks');
    this.logger.log('Updated displayed columns:', this.displayedColumns);
  }

  /**
   * Handle form submission
   */
  onSubmit() {
    this.logger.log('onSubmit called');
    
    if (!this.assessment.observation) {
      this.showMessage('Please select an assessment level.', true);
      return;
    }

    // Validate height/weight if required
    if (this.isGrossOrFineMotor) {
      const validation = this.validateHeightWeightInputs();
      if (!validation.isValid) {
        this.showMessage(validation.message, true);
        return;
      }
    }

    // Set assessment date to today
    this.assessment.assessment_date = new Date().toISOString().split('T')[0];
    
    this.logger.log('Submitting assessment with data:', this.assessment);
    
    // Call the submit assessment method
    this.submitAssessment();
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
    
    this.logger.log('Selected student IDs:', selectedStudentIds);
    
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
      let ageString = '';
      let height = '';
      let weight = '';
      if (student) {
        // Determine the next attempt number based on existing sessions
        if (student.assessed && student.assessed2 && student.assessed3 && student.assessed4) {
          attemptNumber = 4;
        } else if (student.assessed && student.assessed2 && student.assessed3) {
          attemptNumber = 4; // Fourth assessment
        } else if (student.assessed && student.assessed2) {
          attemptNumber = 3; // Third assessment
        } else if (student.assessed) {
          attemptNumber = 2; // Second assessment
        }
        // Calculate age at assessment
        ageString = this.calculateAgeString(student.birth_date, this.assessment.assessment_date);
        // Use height/weight for the current session if available (for gross/fine motor)
        // For submission, we use the session number that matches the input fields
        const currentSessionNumber = this.getCurrentSessionForInput();
        height = (student as any)[`height${currentSessionNumber}`] || '';
        weight = (student as any)[`weight${currentSessionNumber}`] || '';
      }
      const currentObservationForSubmission = this.assessment.observation;
      return {
        children: [childId],
        competency_id: this.assessment.competency_id,
        observation: currentObservationForSubmission,
        assessment_date: this.assessment.assessment_date,
        remarks: this.assessment.remarks || '',
        anganwadi_id: anganwadiId,
        attempt_number: attemptNumber,
        age: ageString,
        height: height,
        weight: weight
      };
    });
    
    this.logger.log('Submitting assessments:', submissions);
    
    // Submit assessments using the multiple assessments method
    this.assessmentService.submitMultipleAssessments(submissions).subscribe({
      next: (response) => {
        this.logger.log('All assessments submitted successfully');
        this.showMessage('Assessment submitted successfully!', false);
        
        // Reset height/weight inputs after successful submission
        this.resetHeightWeightInputs();
        
        // Clear selection
        this.selection.clear();
        
        // Reload assessments to show updated data
        this.loadAssessments();
        
        // Update local student data after successful submission
        this.updateLocalStudentData(selectedStudentIds);

        // Clear assessment form after submission
        this.clearAssessmentForm();
        
        // Reset to students tab
        this.setActiveTab('students');
      },
      error: (error) => {
        this.logger.error('Error submitting assessments:', error);
        this.showMessage('Error submitting assessment. Please try again.', true);
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
    if (tab === 'students') {
      this.clearAssessmentForm();
    }
    if (tab === 'levels') {
      this.assessment.remarks = '';
    }
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
        this.paginator.pageSize = this.pageSize;
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
    this.isAllSelected() ?
      this.selection.clear() :
      this.students.forEach(row => this.selection.select(row));
    
    // Trigger change detection to update button state
    this.onStudentSelectionChange();
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
   * Show message with PrimeNG toast
   */
  showMessage(message: string, isError: boolean = false) {
    if (isError) {
      // Error toast is already handled in the service, do not call errorHandler here
    } else {
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: message,
        life: 5000
      });
    }
  }
  
  /**
   * Reset component state when navigating back
   */
  resetComponentState(): void {
    this.selection.clear();
    this.activeTab = 'students';
    this.assessment.observation = '';
    this.assessment.remarks = '';
    this.clearAllHeightWeightInputs();
  }

  /**
   * Handle navigation back to videos
   */
  backToVideos() {
    this.resetComponentState();
    // Navigate back to the details page (where videos are) with the current competency ID
    if (this.assessment.competency_id) {
      this.router.navigate(['/details', this.assessment.competency_id]);
    } else {
      // Fallback to select-competency if no competency ID is available
      this.router.navigate(['/select-competency']);
    }
  }

  /**
   * Calculate age from birth date
   */
  calculateAge(birthDate: string): string {
    if (!birthDate) return '';
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;
    return this.calculateAgeString(birthDate, todayStr);
  }

  /**
   * Load level descriptions based on competency ID
   */
  loadLevelDescriptions() {
    const competencyId = this.assessment.competency_id;
    const competencyName = this.selectedCompetency.toLowerCase();
    
    // Check if it's gross or fine motor (competency IDs 10 and 11)
    const wasGrossOrFineMotor = this.isGrossOrFineMotor;
    this.isGrossOrFineMotor = competencyId === 10 || competencyId === 11;
    this.showHeightWeightInputs = this.isGrossOrFineMotor;
    
    // Clear height/weight inputs when switching competencies
    if (wasGrossOrFineMotor !== this.isGrossOrFineMotor) {
      this.clearAllHeightWeightInputs();
    }
    
    // Clear assessment form (including remarks) when switching competencies
    this.clearAssessmentForm();

    if (competencyName.includes('classification')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Unable to sort objects based on any characteristic', color: '#FFD657' },
        { level: 'Progressing', description: 'Sorts objects based on any one characteristic', color: '#FFC067' },
        { level: 'Advancing', description: 'Classifies objects based on any two characteristics', color: '#AFD588' },
        { level: 'School Ready', description: 'Classifies objects based on three characteristics', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('emergent writing')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Scribbles to represent writing', color: '#FFD657' },
        { level: 'Progressing', description: 'Draws shapes to represent writing', color: '#FFC067' },
        { level: 'Advancing', description: 'Engages in make-believe writing by using a combination of drawing and writing to express an idea', color: '#AFD588' },
        { level: 'School Ready', description: 'Uses inventive spelling (based on phonics) to write words that are connected to a given topic', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('book handling') || competencyName.includes('emergent reading')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Picks up books and explores them', color: '#FFD657' },
        { level: 'Progressing', description: 'Identifies the cover page of a book', color: '#FFC067' },
        { level: 'Advancing', description: 'Differentiates text from pictures', color: '#AFD588' },
        { level: 'School Ready', description: 'Understands directionality of the text', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('creative expression')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Unable to create something to represent an idea or object (e.g., by using arts and crafts, dance or music)', color: '#FFD657' },
        { level: 'Progressing', description: 'Creates something with an adult assistance', color: '#FFC067' },
        { level: 'Advancing', description: 'Creates something on her/his own', color: '#AFD588' },
        { level: 'School Ready', description: 'Creates something innovative to represent an idea or object', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('fine motor')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Limited coordination of small muscles in fine motor activities', color: '#FFD657' },
        { level: 'Progressing', description: 'Maintains coordination of small muscles in fine motor activities', color: '#FFC067' },
        { level: 'Advancing', description: 'Maintains coordination of small muscles while manipulating objects', color: '#AFD588' },
        { level: 'School Ready', description: 'Controls and coordinates well in a variety of small muscle activities', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('imagination') || competencyName.includes('story')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Unable to answer questions about what would happen next in a story', color: '#FFD657' },
        { level: 'Progressing', description: 'Answers questions about what would happen next in a story', color: '#FFC067' },
        { level: 'Advancing', description: 'Role-plays characters in a story or uses props to tell a story', color: '#AFD588' },
        { level: 'School Ready', description: 'Makes up and tells own story', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('gross motor')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Limited balance in gross motor activities, e.g., jumping', color: '#FFD657' },
        { level: 'Progressing', description: 'Maintains balance in gross motor activities', color: '#FFC067' },
        { level: 'Advancing', description: 'Maintains balance and controls body while moving quickly', color: '#AFD588' },
        { level: 'School Ready', description: 'Balances and coordinates well in a variety of activities, such as throwing a ball with aim or kicking a ball at a given target', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('emotional') || competencyName.includes('emotion')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Unable to identify emotions', color: '#FFD657' },
        { level: 'Progressing', description: 'Identifies own emotions', color: '#FFC067' },
        { level: 'Advancing', description: 'Understands what triggers emotions', color: '#AFD588' },
        { level: 'School Ready', description: 'Gives appropriate response to her/his emotions', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('initiative')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Does not take action even after being asked to do something', color: '#FFD657' },
        { level: 'Progressing', description: 'Begins to take initiative when encouraged', color: '#FFC067' },
        { level: 'Advancing', description: 'Takes initiative in some activities which she/he likes', color: '#AFD588' },
        { level: 'School Ready', description: 'Takes initiative readily in most/all of the classroom activities', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('number concept') || competencyName.includes('numerals')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Unable to compare quantities', color: '#FFD657' },
        { level: 'Progressing', description: 'Connects a number with an object and counts each object with understanding', color: '#FFC067' },
        { level: 'Advancing', description: 'Identifies numerals and can link them with concrete objects', color: '#AFD588' },
        { level: 'School Ready', description: 'Identifies both the smallest and the largest numerals within 1 to 10', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('interaction') || competencyName.includes('social interaction')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Plays alongside or near others but not with others', color: '#FFD657' },
        { level: 'Progressing', description: 'Starts to play with others', color: '#FFC067' },
        { level: 'Advancing', description: 'Plays with others to make/create something jointly', color: '#AFD588' },
        { level: 'School Ready', description: 'Engages in games with rules with other children', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('listening') || competencyName.includes('comprehension')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Does not pay attention to a story/conversation', color: '#FFD657' },
        { level: 'Progressing', description: 'Listens actively to a story/conversation', color: '#FFC067' },
        { level: 'Advancing', description: 'Understands a story/conversation – responds to simple/close-ended questions (e.g., what, when, who)', color: '#AFD588' },
        { level: 'School Ready', description: 'Understands a story/conversation –responds to complex/open-ended questions (e.g., why and how)', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('seriation') || competencyName.includes('ordering')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Unable to compare two objects in terms of size, length, or quantity', color: '#FFD657' },
        { level: 'Progressing', description: 'Compares two similar objects based on size, length, or quantity', color: '#FFC067' },
        { level: 'Advancing', description: 'Arranges up to three objects by size, length, or quantity', color: '#AFD588' },
        { level: 'School Ready', description: 'Arranges up to five objects by size, length, or quantity', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('sharing') || competencyName.includes('sharing with others')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Shares unwillingly with peers and only when asked', color: '#FFD657' },
        { level: 'Progressing', description: 'Begins to share selectively when encouraged', color: '#FFC067' },
        { level: 'Advancing', description: 'Comes forward and shares with selected/few peers', color: '#AFD588' },
        { level: 'School Ready', description: 'Comes forward and shares with all/any peers on her/his own', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('patterns') || competencyName.includes('pattern')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Unable to copy patterns', color: '#FFD657' },
        { level: 'Progressing', description: 'Copies patterns', color: '#FFC067' },
        { level: 'Advancing', description: 'Completes simple alternating patterns', color: '#AFD588' },
        { level: 'School Ready', description: 'Completes complex patterns', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('task persistence') || competencyName.includes('persistence')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Focuses on play activities for a short period of time (about 5 minutes)', color: '#FFD657' },
        { level: 'Progressing', description: 'Engages in play activities for about 10 minutes', color: '#FFC067' },
        { level: 'Advancing', description: 'Sustains focus in play activities for about 15 minutes', color: '#AFD588' },
        { level: 'School Ready', description: 'Sustains focus in play activities for at least 20-25 minutes, even if there are distractions', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('vocabulary') || competencyName.includes('expression')) {
      this.levelDescriptions = [
        { level: 'Beginning', description: 'Uses gestures to express/describe any event', color: '#FFD657' },
        { level: 'Progressing', description: 'Uses words to express/describe any event', color: '#FFC067' },
        { level: 'Advancing', description: 'Uses incomplete sentences to express/describe any event', color: '#AFD588' },
        { level: 'School Ready', description: 'Uses complete sentences to express/describe any event', color: '#9FDFF8' }
      ];
    }
     else {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'The child shows initial attempts with limited success. Assess based on effort and support needed.', color: '#FFD657' },
        { level: 'Progressing', description: 'The child shows improvement with some support. Assess based on progress and guidance needed.', color: '#FFC067' },
        { level: 'Advanced', description: 'The child shows good understanding and application. Assess based on mastery and independence.', color: '#AFD588' },
        { level: 'School Ready', description: 'The child masters the task and applies it in context. Assess based on readiness for next stage.', color: '#9FDFF8' }
      ];
    }
  }

  /**
   * Clear all height/weight inputs for all students and all sessions
   */
  clearAllHeightWeightInputs(): void {
    this.students.forEach(student => {
      for (let i = 1; i <= 4; i++) {
        (student as any)[`height${i}`] = '';
        (student as any)[`weight${i}`] = '';
      }
    });
  }

  /**
   * Calculate age string in years and months from birth date and assessment date
   * Always returns in '3y 2m' format, or '' if invalid.
   */
  private calculateAgeString(birthDate: string, assessmentDate: string): string {
    if (!birthDate || !assessmentDate) return '';
    // Try to parse DD/MM/YYYY or YYYY-MM-DD
    let birth: Date;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(birthDate)) {
      const [day, month, year] = birthDate.split('/').map(Number);
      birth = new Date(year, month - 1, day);
    } else {
      birth = new Date(birthDate);
    }
    const assess = new Date(assessmentDate);
    let years = assess.getFullYear() - birth.getFullYear();
    let months = assess.getMonth() - birth.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    if (assess.getDate() < birth.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }
    // If any value is NaN or negative, return empty string
    if (isNaN(years) || isNaN(months) || years < 0 || months < 0) return '';
    return `${years}y ${months}m`;
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
        this.logger.warn('Invalid date string for formatting:', dateString);
        return dateString; 
      }

      const d = date.getUTCDate().toString().padStart(2, '0');
      const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const y = date.getUTCFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      this.logger.error('Error formatting date:', dateString, e);
      return dateString;
    }
  }

  /**
   * Get current session number for input fields
   */
  getCurrentSessionForInput(): number {
    const selectedStudents = this.selection.selected;
    if (selectedStudents.length === 0) return 1;
    
    // Determine the session number based on the most common assessment status
    return this.getCurrentSessionNumber();
  }

  /**
   * Check if height and weight are entered for all selected students
   */
  areHeightWeightEntered(): boolean {
    if (!this.isGrossOrFineMotor) return true;
    
    const selectedStudents = this.selection.selected;
    if (selectedStudents.length === 0) return false;
    
    // For input validation, we check session 1 since that's what we're entering
    const sessionNumber = this.getCurrentSessionForInput();
    
    return selectedStudents.every(student => {
      const height = (student as any)[`height${sessionNumber}`];
      const weight = (student as any)[`weight${sessionNumber}`];
      return height && weight && height.toString().trim() !== '' && weight.toString().trim() !== '';
    });
  }

  /**
   * Reset height and weight inputs for all students
   */
  resetHeightWeightInputs(): void {
    const sessionNumber = this.getCurrentSessionForInput();
    this.students.forEach(student => {
      (student as any)[`height${sessionNumber}`] = '';
      (student as any)[`weight${sessionNumber}`] = '';
    });
  }

  /**
   * Handle student removal from chip (deselection)
   */
  onChipStudentRemoved(student: Student) {
    this.selection.deselect(student);
    this.onStudentSelectionChange();
    if (this.selection.selected.length === 0) {
      this.assessment.observation = '';
    }
  }

  /**
   * Handle student selection change
   */
  onStudentSelectionChange(): void {
    // Clear height/weight inputs when selection changes to prevent showing old data
    this.clearHeightWeightInputsForUnselectedStudents();
    // Reset radio if selection is empty
    if (this.selection.selected.length === 0) {
      this.assessment.observation = '';
    }
    // Force change detection to update button state
    this.cdr.detectChanges();
  }

  /**
   * Clear height/weight inputs for unselected students
   */
  clearHeightWeightInputsForUnselectedStudents(): void {
    const sessionNumber = this.getCurrentSessionForInput();
    this.students.forEach(student => {
      if (!this.selection.isSelected(student)) {
        (student as any)[`height${sessionNumber}`] = '';
        (student as any)[`weight${sessionNumber}`] = '';
      }
    });
  }

  /**
   * Toggle individual student selection
   */
  toggleStudent(student: Student) {
    this.selection.toggle(student);
    this.onStudentSelectionChange();
  }

  /**
   * Get current session number based on selected students' assessment status
   */
  private getCurrentSessionNumber(): number {
    const selectedStudents = this.selection.selected;
    if (selectedStudents.length === 0) return 1;
    
    // Check the most common session number among selected students
    const sessionCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
    selectedStudents.forEach(student => {
      if (student.assessed && student.assessed2 && student.assessed3 && student.assessed4) {
        sessionCounts[4]++;
      } else if (student.assessed && student.assessed2 && student.assessed3) {
        sessionCounts[4]++;
      } else if (student.assessed && student.assessed2) {
        sessionCounts[3]++;
      } else if (student.assessed) {
        sessionCounts[2]++;
      } else {
        sessionCounts[1]++;
      }
    });
    
    // Return the session with the highest count
    let maxSession = 1;
    let maxCount = sessionCounts[1];
    
    if (sessionCounts[2] > maxCount) {
      maxSession = 2;
      maxCount = sessionCounts[2];
    }
    if (sessionCounts[3] > maxCount) {
      maxSession = 3;
      maxCount = sessionCounts[3];
    }
    if (sessionCounts[4] > maxCount) {
      maxSession = 4;
    }
    
    return maxSession;
  }

  /**
   * Get button disabled state
   */
  getButtonDisabledState(): { hasSelection: boolean, heightWeightValid: boolean, isDisabled: boolean } {
    const hasSelection = this.selection.hasValue();
    const heightWeightValid = this.isGrossOrFineMotor ? this.areHeightWeightEntered() : true;
    const isDisabled = !hasSelection || (this.isGrossOrFineMotor && !heightWeightValid);
    
    return { hasSelection, heightWeightValid, isDisabled };
  }

  /**
   * Update local student data after successful submission
   */
  updateLocalStudentData(selectedStudentIds: number[]): void {
    const currentSessionNumber = this.getCurrentSessionForInput();
    
    this.students = this.students.map(student => {
      if (selectedStudentIds.includes(student.id)) {
        const updatedStudent = { ...student };
        
        // Update the appropriate session based on current session number
        switch (currentSessionNumber) {
          case 1:
            updatedStudent.assessed = true;
            updatedStudent.assessmentLevel = this.assessment.observation;
            updatedStudent.assessmentDate = this.formatDateForDisplay(new Date().toISOString());
            break;
          case 2:
            updatedStudent.assessed2 = true;
            updatedStudent.assessmentLevel2 = this.assessment.observation;
            updatedStudent.assessmentDate2 = this.formatDateForDisplay(new Date().toISOString());
            break;
          case 3:
            updatedStudent.assessed3 = true;
            updatedStudent.assessmentLevel3 = this.assessment.observation;
            updatedStudent.assessmentDate3 = this.formatDateForDisplay(new Date().toISOString());
            break;
          case 4:
            updatedStudent.assessed4 = true;
            updatedStudent.assessmentLevel4 = this.assessment.observation;
            updatedStudent.assessmentDate4 = this.formatDateForDisplay(new Date().toISOString());
            break;
        }
        
        return updatedStudent;
      }
      return student;
    });
  }

  /**
   * Clear assessment form after submission
   */
  clearAssessmentForm(): void {
    this.assessment.observation = '';
    this.assessment.remarks = '';
    // Also clear any other form-related state if needed
  }

  /**
   * Validate height and weight inputs
   */
  validateHeightWeightInputs(): { isValid: boolean; message: string } {
    if (!this.isGrossOrFineMotor) {
      return { isValid: true, message: '' };
    }
    
    const selectedStudents = this.selection.selected;
    if (selectedStudents.length === 0) {
      return { isValid: false, message: 'Please select at least one student.' };
    }
    
    const sessionNumber = this.getCurrentSessionForInput();
    const invalidStudents: string[] = [];
    
    selectedStudents.forEach(student => {
      const height = (student as any)[`height${sessionNumber}`];
      const weight = (student as any)[`weight${sessionNumber}`];
      
      if (!height || !weight || height.toString().trim() === '' || weight.toString().trim() === '') {
        invalidStudents.push(student.first_name);
      } else {
        // Validate numeric values
        const heightNum = parseFloat(height.toString());
        const weightNum = parseFloat(weight.toString());
        
        if (isNaN(heightNum) || heightNum <= 0 || heightNum > 200) {
          invalidStudents.push(`${student.first_name} (invalid height)`);
        }
        if (isNaN(weightNum) || weightNum <= 0 || weightNum > 100) {
          invalidStudents.push(`${student.first_name} (invalid weight)`);
        }
      }
    });
    
    if (invalidStudents.length > 0) {
      return { 
        isValid: false, 
        message: `Please enter valid height and weight for: ${invalidStudents.join(', ')}` 
      };
    }
    
    return { isValid: true, message: '' };
  }

  /**
   * Handle height/weight input change
   */
  onHeightWeightInputChange(): void {
    const validation = this.validateHeightWeightInputs();
    if (!validation.isValid) {
      this.logger.log('Height/Weight validation:', validation.message);
    }
    this.onStudentSelectionChange();
  }

  setPageSize() {
    const width = window.innerWidth;
    this.pageSize = width <= 768 ? 5 : 10;
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.paginator._changePageSize(this.pageSize);
    }
  }
}