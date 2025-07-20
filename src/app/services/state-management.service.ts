import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { LoggerService } from './logger.service';

export interface AppState {
  user: UserState;
  assessment: AssessmentState;
  students: StudentsState;
  ui: UIState;
  performance: PerformanceState;
}

export interface UserState {
  currentUser: any | null;
  isAuthenticated: boolean;
  roles: string[];
  permissions: string[];
  anganwadiId: number | null;
  loading: boolean;
  error: string | null;
}

export interface AssessmentState {
  selectedCompetency: any | null;
  selectedStudents: any[];
  currentAssessment: any | null;
  assessmentHistory: any[];
  loading: boolean;
  error: string | null;
  levelDescriptions: any[];
  maxSessions: number;
}

export interface StudentsState {
  students: any[];
  filteredStudents: any[];
  selectedStudents: any[];
  loading: boolean;
  error: string | null;
  filters: {
    search: string;
    gender: string;
    ageRange: [number, number] | null;
    assessmentStatus: string;
  };
}

export interface UIState {
  activeTab: string;
  menuOpen: boolean;
  loading: boolean;
  notifications: Notification[];
  theme: 'light' | 'dark';
  isMobile: boolean;
  sidebarCollapsed: boolean;
}

export interface PerformanceState {
  loadTimes: { [key: string]: number };
  apiMetrics: ApiMetric[];
  errorCounts: { [key: string]: number };
  memoryUsage: number;
}

export interface ApiMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: Date;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoHide?: boolean;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class StateManagementService {
  private readonly initialState: AppState = {
    user: {
      currentUser: null,
      isAuthenticated: false,
      roles: [],
      permissions: [],
      anganwadiId: null,
      loading: false,
      error: null
    },
    assessment: {
      selectedCompetency: null,
      selectedStudents: [],
      currentAssessment: null,
      assessmentHistory: [],
      loading: false,
      error: null,
      levelDescriptions: [],
      maxSessions: 4
    },
    students: {
      students: [],
      filteredStudents: [],
      selectedStudents: [],
      loading: false,
      error: null,
      filters: {
        search: '',
        gender: '',
        ageRange: null,
        assessmentStatus: ''
      }
    },
    ui: {
      activeTab: 'students',
      menuOpen: false,
      loading: false,
      notifications: [],
      theme: 'light',
      isMobile: false,
      sidebarCollapsed: false
    },
    performance: {
      loadTimes: {},
      apiMetrics: [],
      errorCounts: {},
      memoryUsage: 0
    }
  };

  private state$ = new BehaviorSubject<AppState>(this.initialState);

  // State selectors
  public readonly currentState$: Observable<AppState> = this.state$.asObservable();
  
  // User state selectors
  public readonly user$ = this.state$.pipe(
    map(state => state.user),
    distinctUntilChanged(),
    shareReplay(1)
  );

  public readonly isAuthenticated$ = this.user$.pipe(
    map(user => user.isAuthenticated),
    distinctUntilChanged()
  );

  public readonly currentUser$ = this.user$.pipe(
    map(user => user.currentUser),
    distinctUntilChanged()
  );

  public readonly userRoles$ = this.user$.pipe(
    map(user => user.roles),
    distinctUntilChanged()
  );

  // Assessment state selectors
  public readonly assessment$ = this.state$.pipe(
    map(state => state.assessment),
    distinctUntilChanged(),
    shareReplay(1)
  );

  public readonly selectedCompetency$ = this.assessment$.pipe(
    map(assessment => assessment.selectedCompetency),
    distinctUntilChanged()
  );

  public readonly selectedStudents$ = this.assessment$.pipe(
    map(assessment => assessment.selectedStudents),
    distinctUntilChanged()
  );

  // Students state selectors
  public readonly students$ = this.state$.pipe(
    map(state => state.students),
    distinctUntilChanged(),
    shareReplay(1)
  );

  public readonly allStudents$ = this.students$.pipe(
    map(students => students.students),
    distinctUntilChanged()
  );

  public readonly filteredStudents$ = this.students$.pipe(
    map(students => students.filteredStudents),
    distinctUntilChanged()
  );

  // UI state selectors
  public readonly ui$ = this.state$.pipe(
    map(state => state.ui),
    distinctUntilChanged(),
    shareReplay(1)
  );

  public readonly activeTab$ = this.ui$.pipe(
    map(ui => ui.activeTab),
    distinctUntilChanged()
  );

  public readonly notifications$ = this.ui$.pipe(
    map(ui => ui.notifications),
    distinctUntilChanged()
  );

  public readonly isMobile$ = this.ui$.pipe(
    map(ui => ui.isMobile),
    distinctUntilChanged()
  );

  // Performance state selectors
  public readonly performance$ = this.state$.pipe(
    map(state => state.performance),
    distinctUntilChanged(),
    shareReplay(1)
  );

  // Combined selectors
  public readonly isLoading$ = combineLatest([
    this.user$,
    this.students$,
    this.assessment$,
    this.ui$
  ]).pipe(
    map(([user, students, assessment, ui]) => 
      user.loading || students.loading || assessment.loading || ui.loading
    ),
    distinctUntilChanged()
  );

  constructor(private logger: LoggerService) {
    this.initializeResponsiveListener();
    this.logger.info('State Management Service initialized', null, 'StateManagementService');
  }

  // User Actions
  setUser(user: any): void {
    this.updateState({
      user: {
        ...this.state$.value.user,
        currentUser: user,
        isAuthenticated: !!user,
        roles: user?.roles?.map((role: any) => role.name) || [],
        anganwadiId: user?.anganwadi_id || null,
        loading: false,
        error: null
      }
    });
    this.logger.info('User state updated', { userId: user?.id }, 'StateManagementService');
  }

  setUserLoading(loading: boolean): void {
    this.updateState({
      user: { ...this.state$.value.user, loading }
    });
  }

  setUserError(error: string | null): void {
    this.updateState({
      user: { ...this.state$.value.user, error, loading: false }
    });
    if (error) {
      this.logger.error('User state error', { error }, 'StateManagementService');
    }
  }

  logout(): void {
    this.updateState({
      user: this.initialState.user,
      assessment: this.initialState.assessment,
      students: this.initialState.students
    });
    this.logger.info('User logged out, state reset', null, 'StateManagementService');
  }

  // Assessment Actions
  setSelectedCompetency(competency: any): void {
    this.updateState({
      assessment: {
        ...this.state$.value.assessment,
        selectedCompetency: competency,
        selectedStudents: [],
        currentAssessment: null
      }
    });
    this.logger.info('Selected competency updated', { competencyId: competency?.id }, 'StateManagementService');
  }

  setSelectedStudents(students: any[]): void {
    this.updateState({
      assessment: {
        ...this.state$.value.assessment,
        selectedStudents: students
      }
    });
    this.logger.info('Selected students updated', { count: students.length }, 'StateManagementService');
  }

  setCurrentAssessment(assessment: any): void {
    this.updateState({
      assessment: {
        ...this.state$.value.assessment,
        currentAssessment: assessment
      }
    });
  }

  addToAssessmentHistory(assessment: any): void {
    const currentHistory = this.state$.value.assessment.assessmentHistory;
    this.updateState({
      assessment: {
        ...this.state$.value.assessment,
        assessmentHistory: [...currentHistory, assessment]
      }
    });
  }

  setAssessmentLoading(loading: boolean): void {
    this.updateState({
      assessment: { ...this.state$.value.assessment, loading }
    });
  }

  setAssessmentError(error: string | null): void {
    this.updateState({
      assessment: { ...this.state$.value.assessment, error, loading: false }
    });
    if (error) {
      this.logger.error('Assessment state error', { error }, 'StateManagementService');
    }
  }

  setLevelDescriptions(levels: any[]): void {
    this.updateState({
      assessment: {
        ...this.state$.value.assessment,
        levelDescriptions: levels
      }
    });
  }

  // Students Actions
  setStudents(students: any[]): void {
    this.updateState({
      students: {
        ...this.state$.value.students,
        students,
        filteredStudents: students,
        loading: false,
        error: null
      }
    });
    this.logger.info('Students loaded', { count: students.length }, 'StateManagementService');
  }

  setFilteredStudents(students: any[]): void {
    this.updateState({
      students: {
        ...this.state$.value.students,
        filteredStudents: students
      }
    });
  }

  setStudentsLoading(loading: boolean): void {
    this.updateState({
      students: { ...this.state$.value.students, loading }
    });
  }

  setStudentsError(error: string | null): void {
    this.updateState({
      students: { ...this.state$.value.students, error, loading: false }
    });
    if (error) {
      this.logger.error('Students state error', { error }, 'StateManagementService');
    }
  }

  updateStudentFilters(filters: Partial<StudentsState['filters']>): void {
    const currentFilters = this.state$.value.students.filters;
    this.updateState({
      students: {
        ...this.state$.value.students,
        filters: { ...currentFilters, ...filters }
      }
    });
  }

  // UI Actions
  setActiveTab(tab: string): void {
    this.updateState({
      ui: { ...this.state$.value.ui, activeTab: tab }
    });
    this.logger.logUserAction('tab_change', 'AssessmentComponent', { tab });
  }

  setMenuOpen(open: boolean): void {
    this.updateState({
      ui: { ...this.state$.value.ui, menuOpen: open }
    });
  }

  setUILoading(loading: boolean): void {
    this.updateState({
      ui: { ...this.state$.value.ui, loading }
    });
  }

  addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): void {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      autoHide: notification.autoHide ?? true,
      duration: notification.duration ?? 5000
    };

    const currentNotifications = this.state$.value.ui.notifications;
    this.updateState({
      ui: {
        ...this.state$.value.ui,
        notifications: [...currentNotifications, newNotification]
      }
    });

    this.logger.info('Notification added', { type: notification.type, title: notification.title }, 'StateManagementService');

    // Auto-remove notification if specified
    if (newNotification.autoHide) {
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, newNotification.duration);
    }
  }

  removeNotification(id: string): void {
    const currentNotifications = this.state$.value.ui.notifications;
    this.updateState({
      ui: {
        ...this.state$.value.ui,
        notifications: currentNotifications.filter(n => n.id !== id)
      }
    });
  }

  clearAllNotifications(): void {
    this.updateState({
      ui: {
        ...this.state$.value.ui,
        notifications: []
      }
    });
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.updateState({
      ui: { ...this.state$.value.ui, theme }
    });
    localStorage.setItem('theme', theme);
    this.logger.info('Theme changed', { theme }, 'StateManagementService');
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.updateState({
      ui: { ...this.state$.value.ui, sidebarCollapsed: collapsed }
    });
  }

  // Performance Actions
  recordLoadTime(component: string, time: number): void {
    const currentLoadTimes = this.state$.value.performance.loadTimes;
    this.updateState({
      performance: {
        ...this.state$.value.performance,
        loadTimes: { ...currentLoadTimes, [component]: time }
      }
    });
    this.logger.info('Load time recorded', { component, time }, 'StateManagementService');
  }

  addApiMetric(metric: ApiMetric): void {
    const currentMetrics = this.state$.value.performance.apiMetrics;
    const updatedMetrics = [...currentMetrics, metric].slice(-50); // Keep last 50 metrics
    
    this.updateState({
      performance: {
        ...this.state$.value.performance,
        apiMetrics: updatedMetrics
      }
    });
  }

  incrementErrorCount(errorType: string): void {
    const currentCounts = this.state$.value.performance.errorCounts;
    this.updateState({
      performance: {
        ...this.state$.value.performance,
        errorCounts: {
          ...currentCounts,
          [errorType]: (currentCounts[errorType] || 0) + 1
        }
      }
    });
  }

  updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const memoryUsage = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
      this.updateState({
        performance: {
          ...this.state$.value.performance,
          memoryUsage
        }
      });
    }
  }

  // Utility Methods
  getCurrentState(): AppState {
    return this.state$.value;
  }

  resetState(): void {
    this.updateState(this.initialState);
    this.logger.info('State reset to initial values', null, 'StateManagementService');
  }

  exportState(): string {
    const state = this.getCurrentState();
    return JSON.stringify(state, null, 2);
  }

  // Success and error helper methods
  showSuccess(title: string, message: string): void {
    this.addNotification({
      type: 'success',
      title,
      message
    });
  }

  showError(title: string, message: string): void {
    this.addNotification({
      type: 'error',
      title,
      message,
      autoHide: false
    });
  }

  showWarning(title: string, message: string): void {
    this.addNotification({
      type: 'warning',
      title,
      message
    });
  }

  showInfo(title: string, message: string): void {
    this.addNotification({
      type: 'info',
      title,
      message
    });
  }

  private updateState(partialState: Partial<AppState>): void {
    const currentState = this.state$.value;
    const newState = { ...currentState, ...partialState };
    this.state$.next(newState);
  }

  private initializeResponsiveListener(): void {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile !== this.state$.value.ui.isMobile) {
        this.updateState({
          ui: { ...this.state$.value.ui, isMobile }
        });
      }
    };

    // Initial check
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);
  }
}