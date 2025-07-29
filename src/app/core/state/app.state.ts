import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { LoggerService } from '../logger.service';

// Application State Interface
export interface AppState {
  // Authentication State
  isAuthenticated: boolean;
  currentUser: any | null;
  token: string | null;
  
  // Loading States
  isLoading: boolean;
  loadingStates: { [key: string]: boolean };
  
  // Error States
  errors: { [key: string]: string | null };
  
  // Cache States
  cache: { [key: string]: { data: any; timestamp: number; ttl: number } };
  
  // UI States
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  
  // Data States
  students: any[];
  users: any[];
  anganwadis: any[];
  competencies: any[];
  assessments: any[];
}

// Initial State
const initialState: AppState = {
  isAuthenticated: false,
  currentUser: null,
  token: null,
  isLoading: false,
  loadingStates: {},
  errors: {},
  cache: {},
  sidebarCollapsed: false,
  theme: 'light',
  students: [],
  users: [],
  anganwadis: [],
  competencies: [],
  assessments: []
};

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private state$ = new BehaviorSubject<AppState>(initialState);
  private logger = inject(LoggerService);
  
  // Public observables for components
  readonly appState$ = this.state$.asObservable().pipe(shareReplay(1));
  
  // Specific state selectors
  readonly isAuthenticated$ = this.select(state => state.isAuthenticated);
  readonly currentUser$ = this.select(state => state.currentUser);
  readonly token$ = this.select(state => state.token);
  readonly isLoading$ = this.select(state => state.isLoading);
  readonly errors$ = this.select(state => state.errors);
  readonly students$ = this.select(state => state.students);
  readonly users$ = this.select(state => state.users);
  readonly anganwadis$ = this.select(state => state.anganwadis);
  readonly competencies$ = this.select(state => state.competencies);
  readonly assessments$ = this.select(state => state.assessments);
  readonly theme$ = this.select(state => state.theme);
  readonly sidebarCollapsed$ = this.select(state => state.sidebarCollapsed);
  
  // Loading state selectors
  readonly loadingStates$ = this.select(state => state.loadingStates);
  
  // Cache state selectors
  readonly cache$ = this.select(state => state.cache);
  
  constructor() {
    // Initialize from localStorage
    this.initializeFromStorage();
  }
  
  // State selectors
  private select<T>(selector: (state: AppState) => T): Observable<T> {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }
  
  // State updates
  updateState(partial: Partial<AppState>): void {
    const currentState = this.state$.value;
    const newState = { ...currentState, ...partial };
    this.state$.next(newState);
    this.persistToStorage(newState);
  }
  
  // Authentication actions
  setAuthentication(token: string, user: any): void {
    this.updateState({
      isAuthenticated: true,
      token,
      currentUser: user,
      errors: {}
    });
  }
  
  clearAuthentication(): void {
    this.updateState({
      isAuthenticated: false,
      token: null,
      currentUser: null,
      errors: {}
    });
  }
  
  // Loading state actions
  setLoading(isLoading: boolean, key?: string): void {
    const currentState = this.state$.value;
    const loadingStates = key 
      ? { ...currentState.loadingStates, [key]: isLoading }
      : currentState.loadingStates;
    
    this.updateState({
      isLoading,
      loadingStates
    });
  }
  
  // Error state actions
  setError(error: string, key: string): void {
    const currentState = this.state$.value;
    this.updateState({
      errors: { ...currentState.errors, [key]: error }
    });
  }
  
  clearError(key: string): void {
    const currentState = this.state$.value;
    const errors = { ...currentState.errors };
    delete errors[key];
    this.updateState({ errors });
  }
  
  // Data actions
  setStudents(students: any[]): void {
    this.updateState({ students });
  }
  
  setUsers(users: any[]): void {
    this.updateState({ users });
  }
  
  setAnganwadis(anganwadis: any[]): void {
    this.updateState({ anganwadis });
  }
  
  setCompetencies(competencies: any[]): void {
    this.updateState({ competencies });
  }
  
  setAssessments(assessments: any[]): void {
    this.updateState({ assessments });
  }
  
  // Cache actions
  setCache(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    const currentState = this.state$.value;
    const cache = {
      ...currentState.cache,
      [key]: {
        data,
        timestamp: Date.now(),
        ttl
      }
    };
    this.updateState({ cache });
  }
  
  getCache(key: string): any | null {
    const currentState = this.state$.value;
    const cached = currentState.cache[key];
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.clearCache(key);
      return null;
    }
    
    return cached.data;
  }
  
  clearCache(key?: string): void {
    const currentState = this.state$.value;
    const cache = key 
      ? { ...currentState.cache }
      : {};
    
    if (key) {
      delete cache[key];
    }
    
    this.updateState({ cache });
  }
  
  // UI actions
  toggleSidebar(): void {
    const currentState = this.state$.value;
    this.updateState({
      sidebarCollapsed: !currentState.sidebarCollapsed
    });
  }
  
  setTheme(theme: 'light' | 'dark'): void {
    this.updateState({ theme });
  }
  
  // Storage persistence
  private persistToStorage(state: AppState): void {
    try {
      const persistData = {
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
        token: state.token,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme
      };
      localStorage.setItem('appState', JSON.stringify(persistData));
    } catch (error) {
              this.logger.error('Failed to persist state to storage:', error);
    }
  }
  
  private initializeFromStorage(): void {
    try {
      const stored = localStorage.getItem('appState');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.updateState({
          isAuthenticated: parsed.isAuthenticated || false,
          currentUser: parsed.currentUser || null,
          token: parsed.token || null,
          sidebarCollapsed: parsed.sidebarCollapsed || false,
          theme: parsed.theme || 'light'
        });
      }
    } catch (error) {
              this.logger.error('Failed to initialize state from storage:', error);
    }
  }
  
  // Utility methods
  getCurrentState(): AppState {
    return this.state$.value;
  }
  
  // Reset state
  resetState(): void {
    this.state$.next(initialState);
    localStorage.removeItem('appState');
  }
} 