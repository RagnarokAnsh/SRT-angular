import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

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
    private router: Router
  ) {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.isAuthenticatedSubject.next(true);
        this.currentUserSubject.next(user);
      } catch (error) {
        // If user data is corrupted, clear storage
        this.logout();
      }
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((response: LoginResponse) => {
        if (response.token && response.user) {
          // Store token and user data with roles
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          
          // Update authentication status and current user
          this.isAuthenticatedSubject.next(true);
          this.currentUserSubject.next(response.user);
          
          // Route user based on their role immediately
          this.routeUserBasedOnRole(response.user);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getUserRoles(): string[] {
    const user = this.getCurrentUser();
    return user ? user.roles.map(role => role.name) : [];
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

  private routeUserBasedOnRole(user: User): void {
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
      this.router.navigate(['/dashboard']);
    } else {
      // Default route for users without specific roles
      this.router.navigate(['/home']);
    }
  }

  // Get all users (for admin functionality) - Keep this if still needed elsewhere
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }
}