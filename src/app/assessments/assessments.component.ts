import { Component, ChangeDetectionStrategy, inject, OnInit, ViewChild, TemplateRef, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
// import { StorageService } from '../services/storage.service'; // Comment out original import
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
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

/**
 * Interface for Assessment data structure
 */
interface Assessment {
  child_ids: number[];
  competency_id: number;
  score: string;
  assessment_date: string;
  notes: string;
}

/**
 * Interface for Student data structure
 */
interface Student {
  id: number;
  first_name: string;
  birth_date: string;
  aww_id?: number;
  selected: boolean;
  assessed: boolean;
  assessmentLevel: string;
  assessed2?: boolean;
  assessmentLevel2?: string;
  assessmentDate2?: string;
  remarks?: string;
}

/**
 * Interface for level descriptions
 */
interface LevelDescription {
  level: string;
  description: string;
  color: string;
}

// Mock StorageService for development without the backend service
class MockStorageService {
  getItem(key: string): string | null {
    console.log(`MockStorageService: getItem(${key}) called`);
    // Provide a default mock value for selectedCompetencyName
    if (key === 'selectedCompetencyName') {
      return 'Gross Motor'; // Provide a default mock competency name
    }
    return null;
  }

  setItem(key: string, value: string): void {
    console.log(`MockStorageService: setItem(${key}, ${value}) called`);
    // Do nothing or store in a local object if needed for more complex mocks
  }

  removeItem(key: string): void {
    console.log(`MockStorageService: removeItem(${key}) called`);
    // Do nothing for mock
  }
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
    MatPaginatorModule
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
  ],
  providers: [MockStorageService]
})
export class AssessmentsComponent implements OnInit {
  // Template references
  @ViewChild('teachingStrategiesDialog') teachingStrategiesDialog!: TemplateRef<any>;
  @ViewChild('remarksDialog') remarksDialog!: TemplateRef<any>;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('videoPlayer') videoPlayer!: ElementRef;

  // Active tab tracking
  activeTab: 'students' | 'levels' = 'students';

  // UI control
  menuOpen = false;
  currentRemarks: string = '';
  currentStudent: Student | null = null;
  
  // Audio player reference
  currentAudio: HTMLAudioElement | null = null;

  // Table data
  displayedColumns: string[] = ['select', 'name', 'age', 'assessmentInfo', 'assessmentInfo2', 'remarks'];
  dataSource: any;
  selection = new SelectionModel<Student>(true, []);
  filteredStudents: Student[] = [];

  // Assessment data
  assessment: Assessment = {
    child_ids: [],
    competency_id: 0,
    score: '',
    assessment_date: new Date().toISOString().split('T')[0],
    notes: ''
  };

  // Student data
  students: Student[] = [];

  // Competency information
  selectedCompetency: string = '';

  // UI feedback messages
  createSuccess: string = '';
  createError: string = '';
  messageTimeout: any;

  // Level descriptions (initialized in loadLevelDescriptions)
  levelDescriptions: LevelDescription[] = [];

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private storageService: MockStorageService // Inject the mock service
  ) {}

  /**
   * Initialize component
   */
  ngOnInit() {
    this.selectedCompetency = this.storageService.getItem('selectedCompetencyName') || '';

    // Replace API call with mock data for competency
    // this.apiService.getCompetencies().subscribe({
    //   next: (competencies) => {
    //     const selectedCompetency = competencies.find((c: any) => c.name === this.selectedCompetency);
    //     if (selectedCompetency) {
    //       this.assessment.competency_id = selectedCompetency.id;
    //       this.loadLevelDescriptions();
    //     }
    //   },
    //   error: (err) => {
    //     console.error('Error fetching competencies:', err);
    //     this.showMessage('Failed to load competency information.', true);
    //   }
    // });

    // Set a default competency ID for mock data
    this.assessment.competency_id = 1; // Set a default ID, adjust if needed
    this.loadLevelDescriptions();

    this.loadStudents(); // This will need to be updated to use mock data
    this.loadAssessments(); // This will need to be updated to use mock data
  }

  /**
   * Set the active tab and update progress indicator
   */
  setActiveTab(tab: 'students' | 'levels') {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  /**
   * Update the data source for the table
   */
  updateDataSource() {
    this.filteredStudents = [...this.students];
    this.dataSource = this.filteredStudents;
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
    
    this.dataSource = this.filteredStudents;
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
   * Stop any currently playing audio
   */
  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Play audio instructions
   */
  playAudio(audioUrl: string | undefined) {
    if (!audioUrl) return;
    
    // Stop any currently playing audio
    this.stopAudio();
    
    // Play the new audio
    const audio = new Audio(audioUrl);
    this.currentAudio = audio;
    audio.play();
  }

  /**
   * Toggle audio playback
   */
  toggleAudio(audioUrl: string | undefined) {
    if (!audioUrl) return;
    
    const audioFileName = audioUrl.split('/').pop() || '';
    
    if (this.currentAudio && this.currentAudio.src.includes(audioFileName)) {
      this.stopAudio();
    } else {
      this.playAudio(audioUrl);
    }
  }

  /**
   * Play strategy audio based on selected level
   */
  playStrategyAudio() {
    // implement this to play the appropriate audio file
    const audioUrl = `assets/audio/strategy_${this.assessment.score.toLowerCase()}.mp3`;
    this.toggleAudio(audioUrl);
  }

  /**
   * Open remarks dialog for a student
   */
  openRemarks(student: Student) {
    this.currentStudent = student;
    this.currentRemarks = student.remarks || '';
    
    const dialogRef = this.dialog.open(this.remarksDialog);
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result !== false && this.currentStudent) {
        this.currentStudent.remarks = result;
      }
    });
  }

  /**
   * Continue to next assessment after showing teaching strategies
   */
  continueToNextAssessment() {
    // Reset form for next assessment
    this.loadAssessments();
    this.assessment.score = '';
    this.assessment.notes = '';
    this.selection.clear();
    this.setActiveTab('students');
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
   * Toggle menu visibility
   */
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  /**
   * Handle logout action
   */
  onLogout() {
    // this.apiService.logout().subscribe({
    //   next: () => {
    //     this.storageService.removeItem('token');
    //     this.storageService.removeItem('user');
    //     this.router.navigate(['/login']);
    //   }
    // });
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
   * Track students by ID for performance optimization
   */
  trackById(index: number, student: Student): number {
    return student.id;
  }

  /**
   * Load students from API
   */
  loadStudents() {
    // Replace API call with mock data loading
    // TODO: Load mock student data here
    console.log('Loading mock students');
    // Example mock student data:
    this.students = [
    { id: 1, first_name: 'Shyam', birth_date: '2020-05-15', selected: false, assessed: true, assessmentLevel: 'Beginner', },
    { id: 2, first_name: 'Ghanshyam', birth_date: '2023-01-10', selected: false, assessed: true, assessmentLevel: 'Beginner',},
    { id: 3, first_name: 'Binod', birth_date: '2021-03-22', selected: false, assessed: true, assessmentLevel: 'Advanced', },
    { id: 4, first_name: 'Mukesh', birth_date: '2021-07-19', selected: false, assessed: true, assessmentLevel: 'Advanced',  },
    { id: 5, first_name: 'Ram', birth_date: '2022-02-05', selected: false, assessed: true, assessmentLevel: 'Progressing',  },
    { id: 6, first_name: 'Hemant', birth_date: '2022-09-12', selected: false, assessed: true, assessmentLevel: 'PSR',  }
  
    ];
    this.updateDataSource();
  }

  /**
   * Load existing assessments from API
   */
  loadAssessments() {
    // Replace API call with mock data loading
    // this.apiService.getAssessments().subscribe({
    //   next: (assessments) => {
    //     ...
    //   },
    //   error: (err) => {
    //     ...
    //   }
    // });

    console.log('Loading mock assessments');
    // TODO: Implement more sophisticated mock assessment loading if needed

    // Simulate loading some mock assessment data and updating students
    const mockAssessments = [
      { child_id: 1, competency_id: this.assessment.competency_id, score: 'Beginner', assessment_date: '2023-10-26', notes: 'Excellent progress' },
      { child_id: 2, competency_id: this.assessment.competency_id, score: 'Progressing', assessment_date: '2023-10-20', notes: 'Needs more practice' },
      { child_id: 3, competency_id: this.assessment.competency_id, score: 'Progressing', assessment_date: '2023-09-15', notes: 'Initial assessment' },
      { child_id: 4, competency_id: this.assessment.competency_id, score: 'Advanced', assessment_date: '2023-10-26', notes: 'Excellent progress' },
      { child_id: 5, competency_id: this.assessment.competency_id, score: 'Progressing', assessment_date: '2023-10-20', notes: 'Needs more practice' },
      { child_id: 6, competency_id: this.assessment.competency_id, score: 'Progressing', assessment_date: '2023-09-15', notes: 'Initial assessment' },
      { child_id: 1, competency_id: this.assessment.competency_id, score: 'Beginner', assessment_date: '2023-10-26', notes: 'Excellent progress' },
      { child_id: 2, competency_id: this.assessment.competency_id, score: 'Progressing', assessment_date: '2023-10-20', notes: 'Needs more practice' },
      { child_id: 3, competency_id: this.assessment.competency_id, score: 'Advanced', assessment_date: '2023-09-15', notes: 'Initial assessment' },
      { child_id: 4, competency_id: this.assessment.competency_id, score: 'PSR', assessment_date: '2023-10-26', notes: 'Excellent progress' },
      { child_id: 5, competency_id: this.assessment.competency_id, score: 'PSR', assessment_date: '2023-10-20', notes: 'Needs more practice' },
      { child_id: 6, competency_id: this.assessment.competency_id, score: 'PSR', assessment_date: '2023-09-15', notes: 'Initial assessment' },
    ];

    const competencyId = this.assessment.competency_id;

    this.students = this.students.map(student => {
      // Find assessments for this student and competency
      const studentAssessments = mockAssessments.filter(a =>
        a.child_id === student.id && a.competency_id === competencyId
      );

      // Sort assessments by date to get the most recent ones
      studentAssessments.sort((a, b) =>
        new Date(b.assessment_date).getTime() - new Date(a.assessment_date).getTime()
      );

      // Get the two most recent assessments
      const latestAssessment = studentAssessments[0];
      const previousAssessment = studentAssessments[1];

      return {
        ...student,
        assessed: !!latestAssessment,
        assessmentLevel: latestAssessment?.score || '',
        assessed2: !!previousAssessment,
        assessmentLevel2: previousAssessment?.score || '',
        assessmentDate2: previousAssessment?.assessment_date || '',
        remarks: latestAssessment?.notes || student.remarks
      };
    });

    this.updateDataSource();
    console.log('Loaded mock assessments and updated students:', this.students);
  }

  /**
   * Handle form submission
   */
  onSubmit() {
    console.log('Submitting assessment:', this.assessment);

    // Validation
    if (!this.assessment.score) {
      this.showMessage('Please select a level.', true);
      return;
    }

    if (this.selection.selected.length === 0) {
      this.showMessage('Please select at least one student.', true);
      return;
    }

    this.assessment.child_ids = this.selection.selected.map((student: Student) => student.id);

    // Replace API call with mock save logic
    // this.apiService.createAssessment(payload).subscribe({
    //   next: (response) => {
    //     ...
    //   },
    //   error: (err) => {
    //     ...
    //   }
    // });

    // TODO: Simulate successful save with mock data
    this.showMessage('Assessment saved successfully!');

    // Simulate updating student assessment status locally
    this.students = this.students.map(student => {
      if (this.assessment.child_ids.includes(student.id)) {
        return {
          ...student,
          assessed: true,
          assessmentLevel: this.assessment.score
        };
      }
      return student;
    });

    this.updateDataSource();

    // Show teaching strategies dialog
    this.dialog.open(this.teachingStrategiesDialog);
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
        { level: 'Beginner', description: 'Learning to maintain balance in gross motor activities, e.g., jumping.', color: '#FFD657' },
        { level: 'Progressing', description: 'Maintaining balance in gross motor activities.', color: '#FFC067' },
        { level: 'Advanced', description: 'Maintaining and controlling body while moving quickly', color: '#AFD588' },
        { level: 'PSR', description: 'Balances and coordinates well in a game such as throwing a ball.', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('fine motor')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'The child struggles to hold a pencil and makes random marks. Assess as Beginner if they need constant guidance.', color: '#FFD657' },
        { level: 'Progressing', description: 'The child holds a pencil and draws basic shapes with help. Assess as Progressing if they show some control.', color: '#FFC067' },
        { level: 'Advanced', description: 'The child draws recognizable shapes or letters independently. Assess as Advanced if they demonstrate precision.', color: '#AFD588' },
        { level: 'PSR', description: 'The child writes simple words or copies text accurately. Assess as PSR if they are ready for writing tasks.', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('vocabulary') || competencyName.includes('expression')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Uses single words or short phrases. Limited vocabulary and expression.', color: '#FFD657' },
        { level: 'Progressing', description: 'Uses simple sentences. Growing vocabulary with some errors.', color: '#FFC067' },
        { level: 'Advanced', description: 'Uses complex sentences. Good vocabulary with minor errors.', color: '#AFD588' },
        { level: 'PSR', description: 'Uses varied vocabulary and complex sentences correctly.', color: '#9FDFF8' }
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
        { level: 'Beginner', description: 'Follows simple one-step instructions. Limited attention span.', color: '#FFD657' },
        { level: 'Progressing', description: 'Follows two-step instructions. Shows improved attention.', color: '#FFC067' },
        { level: 'Advanced', description: 'Follows complex instructions. Good attention and recall.', color: '#AFD588' },
        { level: 'PSR', description: 'Follows detailed instructions. Excellent attention and comprehension.', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('seriation') || competencyName.includes('classification')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Sorts objects by one attribute. Needs guidance for patterns.', color: '#FFD657' },
        { level: 'Progressing', description: 'Sorts by multiple attributes. Creates simple patterns.', color: '#FFC067' },
        { level: 'Advanced', description: 'Creates complex patterns. Understands relationships.', color: '#AFD588' },
        { level: 'PSR', description: 'Applies patterns to new situations. Shows logical thinking.', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('number')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Counts to 10. Recognizes basic numbers.', color: '#FFD657' },
        { level: 'Progressing', description: 'Counts to 20. Understands basic addition.', color: '#FFC067' },
        { level: 'Advanced', description: 'Counts to 100. Solves simple problems.', color: '#AFD588' },
        { level: 'PSR', description: 'Understands place value. Solves complex problems.', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('emotional') || competencyName.includes('regulation')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Shows basic emotions. Needs help with regulation.', color: '#FFD657' },
        { level: 'Progressing', description: 'Expresses emotions appropriately. Learning self-regulation.', color: '#FFC067' },
        { level: 'Advanced', description: 'Manages emotions well. Shows empathy.', color: '#AFD588' },
        { level: 'PSR', description: 'Demonstrates emotional intelligence. Helps others regulate.', color: '#9FDFF8' }
      ];
    } else if (competencyName.includes('interaction') || competencyName.includes('sharing')) {
      this.levelDescriptions = [
        { level: 'Beginner', description: 'Plays alongside others. Limited interaction.', color: '#FFD657' },
        { level: 'Progressing', description: 'Plays with others. Shares with prompting.', color: '#FFC067' },
        { level: 'Advanced', description: 'Cooperates well. Shares willingly.', color: '#AFD588' },
        { level: 'PSR', description: 'Leads group activities. Shows strong social skills.', color: '#9FDFF8' }
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
}