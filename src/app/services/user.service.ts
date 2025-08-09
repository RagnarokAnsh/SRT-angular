import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { AppStateService } from '../core/state/app.state';
import { SecurityService } from '../core/security/security.service';
import { ErrorHandlerService } from '../core/error/error-handler.service';

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
  pivot: {
    model_type: string;
    model_id: number;
    role_id: number;
  };
}

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  roles: Role[];
  country_id?: number | null;
  state_id?: number | null;
  district_id?: number | null;
  project?: string | null;
  sector?: string | null;
  anganwadi_id?: number | null;
  country?: any;
  state?: any;
  district?: any;
  anganwadi?: any;
}

export interface LoginResponse {
  token: string;
  user: User; // Updated to include roles directly
  roles: string[]; // Array of role names
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://3.111.249.111/sribackend/api';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private appState: AppStateService,
    private securityService: SecurityService,
    private errorHandler: ErrorHandlerService
  ) {
    // Check if user is already logged in
    const token = this.securityService.getToken();
    const userData = this.securityService.getUserData();
    
    if (token && userData && this.securityService.isTokenValid(token)) {
      try {
        this.isAuthenticatedSubject.next(true);
        this.currentUserSubject.next(userData);
        this.appState.setAuthentication(token, userData);
      } catch (error) {
        // If user data is corrupted, clear storage
        this.logout();
      }
    } else {
      this.logout();
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    // Sanitize input
    const sanitizedEmail = this.securityService.sanitizeInput(email);
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { 
      email: sanitizedEmail, 
      password 
    }).pipe(
      tap((response: LoginResponse) => {
        // --- FIX: Remove role normalization, backend returns correct structure ---
        // (No normalization needed)

        if (response.token && response.user && this.securityService.isTokenValid(response.token)) {
          // Store token and user data securely
          this.securityService.setToken(response.token);
          this.securityService.setUserData(response.user);
          
          // Update authentication status and current user
          this.isAuthenticatedSubject.next(true);
          this.currentUserSubject.next(response.user);
          this.appState.setAuthentication(response.token, response.user);
          
          // Log security event
          this.securityService.logSecurityEvent('user_login_success', { email: sanitizedEmail });
          
          // Route user based on their role immediately
          this.routeUserBasedOnRole(response.user);
        } else {
          this.logout();
        }
      }),
      catchError(error => {
        this.securityService.logSecurityEvent('user_login_failed', { email: sanitizedEmail, error: error.message });
        return this.errorHandler.handleHttpError(error, 'login');
      })
    );
  }

  logout(): void {
    // Log security event
    this.securityService.logSecurityEvent('user_logout', { 
      userId: this.getCurrentUser()?.id 
    });
    
    // Clear secure storage
    this.securityService.clearTokens();
    
    // Reset authentication status
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    this.appState.clearAuthentication();
    
    // Redirect to login
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const token = this.securityService.getToken();
    return !!token && this.securityService.isTokenValid(token);
  }

  // Utility: Decode JWT and check expiration (kept for backward compatibility)
  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (e) {
      return null;
    }
  }

  private isTokenValid(token: string): boolean {
    return this.securityService.isTokenValid(token);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getUserRoles(): string[] {
    const user = this.getCurrentUser();
    return user ? user.roles.map(role => role.name.toLowerCase()) : [];
  }

  hasRole(roleName: string): boolean {
    const roles = this.getUserRoles();
    return roles.includes(roleName);
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isAWW(): boolean {
    return this.hasRole('aww');
  }

  isSupervisor(): boolean {
    return this.hasRole('supervisor');
  }

  isCDPO(): boolean {
    return this.hasRole('cdpo');
  }

  isDPO(): boolean {
    return this.hasRole('dpo');
  }

  isStateOfficial(): boolean {
    return this.hasRole('stateofficial');
  }

  // Check if user has admin-level access (admin, stateofficial, dpo, cdpo)
  hasAdminAccess(): boolean {
    return this.hasRole('admin') || this.hasRole('stateofficial') || this.hasRole('dpo') || this.hasRole('cdpo');
  }

  // Check if user has supervisor-level access (supervisor and above)
  hasSupervisorAccess(): boolean {
    return this.hasAdminAccess() || this.hasRole('supervisor');
  }

  // Check if user has field-level access (aww and above)
  hasFieldAccess(): boolean {
    return this.hasSupervisorAccess() || this.hasRole('aww');
  }

  // Get user's highest role priority (lower number = higher priority)
  getUserRolePriority(): number {
    const roles = this.getUserRoles();
    const rolePriorities = {
      'admin': 1,
      'stateofficial': 2,
      'dpo': 3,
      'cdpo': 4,
      'supervisor': 5,
      'aww': 6
    };

    return Math.min(...roles.map(role => rolePriorities[role as keyof typeof rolePriorities] || 999));
  }

  // Permission-based access control
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Define role-based permissions
    const rolePermissions: { [key: string]: string[] } = {
      'admin': ['*'], // Admin has all permissions
      'stateofficial': ['view_reports', 'manage_districts', 'view_analytics'],
      'dpo': ['view_reports', 'manage_cdpos', 'view_district_analytics'],
      'cdpo': ['view_reports', 'manage_supervisors', 'view_cdpo_analytics'],
      'supervisor': ['view_reports', 'manage_awws', 'view_supervisor_analytics'],
      'aww': ['manage_students', 'conduct_assessments', 'view_student_reports']
    };

    const userRoles = this.getUserRoles();
    
    // Check if user has admin role (all permissions)
    if (userRoles.includes('admin')) return true;

    // Check specific permissions for user roles
    return userRoles.some(role => {
      const permissions = rolePermissions[role] || [];
      return permissions.includes(permission) || permissions.includes('*');
    });
  }

  // Centralized dashboard redirection logic
  redirectToUserDashboard(): void {
    const user = this.getCurrentUser();
    if (!user) {
      this.router.navigate(['/home']);
      return;
    }

    const roles = user.roles.map(role => role.name);
    
    // Route based on highest priority role
    if (roles.includes('admin')) {
      this.router.navigate(['/admin/dashboard']);
    } else if (roles.includes('stateofficial')) {
      this.router.navigate(['/state/dashboard']);
    } else if (roles.includes('dpo')) {
      this.router.navigate(['/dpo/dashboard']);
    } else if (roles.includes('cdpo')) {
      this.router.navigate(['/cdpo/dashboard']);
    } else if (roles.includes('supervisor')) {
      this.router.navigate(['/supervisor/dashboard']);
    } else if (roles.includes('aww')) {
      // AWW users should be redirected to select-competency page instead of dashboard
      this.router.navigate(['/select-competency']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  private routeUserBasedOnRole(user: User): void {
    this.redirectToUserDashboard();
  }

  // Get all users (for admin functionality) - Keep this if still needed elsewhere
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }
}