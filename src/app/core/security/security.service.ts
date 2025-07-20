import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { AppStateService } from '../state/app.state';

export interface SecurityConfig {
  tokenRefreshThreshold: number; // seconds before expiry to refresh
  maxTokenAge: number; // maximum token age in seconds
  encryptionEnabled: boolean;
  sessionTimeout: number; // minutes
}

export interface TokenInfo {
  token: string;
  expiresAt: number;
  refreshToken?: string;
  userId: number;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private readonly SECURITY_KEY = 'srt_security_v1';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';
  
  private tokenRefreshSubject = new BehaviorSubject<boolean>(false);
  public tokenRefresh$ = this.tokenRefreshSubject.asObservable();
  
  private readonly config: SecurityConfig = {
    tokenRefreshThreshold: 300, // 5 minutes
    maxTokenAge: 3600, // 1 hour
    encryptionEnabled: true,
    sessionTimeout: 30 // 30 minutes
  };
  
  private sessionTimer: any;
  private lastActivity = Date.now();
  
  constructor(
    private http: HttpClient,
    private appState: AppStateService
  ) {
    this.initializeSecurity();
    this.setupActivityMonitoring();
  }
  
  // Token Management
  setToken(token: string, refreshToken?: string): void {
    try {
      const tokenInfo = this.decodeToken(token);
      if (!tokenInfo) {
        throw new Error('Invalid token format');
      }
      
      const encryptedToken = this.encrypt(token);
      const encryptedRefresh = refreshToken ? this.encrypt(refreshToken) : null;
      
      localStorage.setItem(this.TOKEN_KEY, encryptedToken);
      if (encryptedRefresh) {
        localStorage.setItem(this.REFRESH_KEY, encryptedRefresh);
      }
      
      this.appState.setAuthentication(token, tokenInfo);
      this.startSessionTimer();
      this.resetActivityTimer();
      
    } catch (error) {
      console.error('Failed to set token:', error);
      this.clearTokens();
    }
  }
  
  getToken(): string | null {
    try {
      const encrypted = localStorage.getItem(this.TOKEN_KEY);
      return encrypted ? this.decrypt(encrypted) : null;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }
  
  getRefreshToken(): string | null {
    try {
      const encrypted = localStorage.getItem(this.REFRESH_KEY);
      return encrypted ? this.decrypt(encrypted) : null;
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }
  
  clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.appState.clearAuthentication();
    this.stopSessionTimer();
  }
  
  // Token Validation
  isTokenValid(token?: string): boolean {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return false;
    
    try {
      const decoded = this.decodeToken(tokenToCheck);
      if (!decoded || !decoded.exp) return false;
      
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp > now;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
  
  isTokenExpiringSoon(token?: string): boolean {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return false;
    
    try {
      const decoded = this.decodeToken(tokenToCheck);
      if (!decoded || !decoded.exp) return false;
      
      const now = Math.floor(Date.now() / 1000);
      return (decoded.exp - now) < this.config.tokenRefreshThreshold;
    } catch (error) {
      console.error('Token expiry check error:', error);
      return false;
    }
  }
  
  // Token Refresh
  refreshToken(): Observable<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    
    this.tokenRefreshSubject.next(true);
    
    return this.http.post<{ token: string; refresh_token?: string }>('/api/auth/refresh', {
      refresh_token: refreshToken
    }).pipe(
      tap(response => {
        this.setToken(response.token, response.refresh_token);
        this.tokenRefreshSubject.next(false);
      }),
      map(response => response.token),
      catchError(error => {
        this.tokenRefreshSubject.next(false);
        this.clearTokens();
        return throwError(() => error);
      })
    );
  }
  
  // User Data Management
  setUserData(user: any): void {
    try {
      const encrypted = this.encrypt(JSON.stringify(user));
      localStorage.setItem(this.USER_KEY, encrypted);
    } catch (error) {
      console.error('Failed to set user data:', error);
    }
  }
  
  getUserData(): any | null {
    try {
      const encrypted = localStorage.getItem(this.USER_KEY);
      if (!encrypted) return null;
      
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }
  
  // Encryption/Decryption
  private encrypt(data: string): string {
    if (!this.config.encryptionEnabled) return data;
    
    try {
      // Simple XOR encryption for demo - in production use proper encryption
      const key = this.SECURITY_KEY;
      let encrypted = '';
      for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return btoa(encrypted);
    } catch (error) {
      console.error('Encryption failed:', error);
      return data;
    }
  }
  
  private decrypt(encryptedData: string): string {
    if (!this.config.encryptionEnabled) return encryptedData;
    
    try {
      const key = this.SECURITY_KEY;
      const decoded = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedData;
    }
  }
  
  // Token Decoding
  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  }
  
  // Session Management
  private startSessionTimer(): void {
    this.stopSessionTimer();
    this.sessionTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = (now - this.lastActivity) / (1000 * 60); // minutes
      
      if (timeSinceActivity > this.config.sessionTimeout) {
        this.handleSessionTimeout();
      }
    }, 60000); // Check every minute
  }
  
  private stopSessionTimer(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }
  
  private handleSessionTimeout(): void {
    console.warn('Session timeout detected');
    this.clearTokens();
    // Redirect to login
    window.location.href = '/login?timeout=true';
  }
  
  // Activity Monitoring
  private setupActivityMonitoring(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.resetActivityTimer();
      }, true);
    });
  }
  
  private resetActivityTimer(): void {
    this.lastActivity = Date.now();
  }
  
  // Security Headers
  getSecurityHeaders(): HttpHeaders {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Security-Version': '1.0'
    });
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }
  
  // CSRF Protection
  getCSRFToken(): string {
    return this.generateCSRFToken();
  }
  
  private generateCSRFToken(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return btoa(`${timestamp}:${random}:${this.SECURITY_KEY}`).replace(/[^a-zA-Z0-9]/g, '');
  }
  
  // Input Sanitization
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .trim();
  }
  
  // Password Strength Validation
  validatePasswordStrength(password: string): { isValid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;
    
    if (password.length >= 8) score += 1;
    else feedback.push('Password must be at least 8 characters long');
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include at least one lowercase letter');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include at least one uppercase letter');
    
    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Include at least one number');
    
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push('Include at least one special character');
    
    const isValid = score >= 4;
    
    return { isValid, score, feedback };
  }
  
  // Rate Limiting
  private requestCount = 0;
  private lastRequestTime = 0;
  
  checkRateLimit(): boolean {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    const maxRequests = 100; // max requests per minute
    
    if (now - this.lastRequestTime > timeWindow) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }
    
    this.requestCount++;
    return this.requestCount <= maxRequests;
  }
  
  // Security Audit
  logSecurityEvent(event: string, details?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.log('Security Event:', logEntry);
    // In production, send to security monitoring service
  }
  
  // Initialization
  private initializeSecurity(): void {
    // Check for existing session
    const token = this.getToken();
    if (token && this.isTokenValid(token)) {
      const userData = this.getUserData();
      if (userData) {
        this.appState.setAuthentication(token, userData);
        this.startSessionTimer();
      }
    } else {
      this.clearTokens();
    }
    
    // Log security initialization
    this.logSecurityEvent('security_initialized');
  }
  
  // Cleanup
  destroy(): void {
    this.stopSessionTimer();
  }
} 