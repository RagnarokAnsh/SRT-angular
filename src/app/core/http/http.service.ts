import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpRequest, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, switchMap, tap, retry, timeout, shareReplay, filter } from 'rxjs/operators';
import { SecurityService } from '../security/security.service';
import { ErrorHandlerService } from '../error/error-handler.service';
import { AppStateService } from '../state/app.state';
import { LoggerService } from '../logger.service';
import { inject } from '@angular/core';

export interface HttpConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCaching: boolean;
  cacheTimeout: number;
  enableLogging: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private readonly config: HttpConfig = {
    baseUrl: 'http://3.111.249.111/sribackend/api',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000,
    enableCaching: true,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    enableLogging: true
  };
  
  private cache = new Map<string, CacheEntry<any>>();
  private requestQueue = new Map<string, Observable<any>>();
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  private logger = inject(LoggerService);
  
  constructor(
    private http: HttpClient,
    private securityService: SecurityService,
    private errorHandler: ErrorHandlerService,
    private appState: AppStateService
  ) {}
  
  // GET Request with caching
  get<T>(endpoint: string, params?: any, useCache: boolean = true): Observable<T> {
    const url = this.buildUrl(endpoint);
    const cacheKey = this.generateCacheKey('GET', url, params);
    
    // Check cache first
    if (useCache && this.config.enableCaching) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        this.logRequest('GET', url, 'CACHE_HIT');
        return of(cached);
      }
    }
    
    // Check if request is already in progress
    if (this.requestQueue.has(cacheKey)) {
      this.logRequest('GET', url, 'QUEUE_HIT');
      return this.requestQueue.get(cacheKey)!;
    }
    
    // Create new request
    const request = this.createRequest<T>('GET', url, params).pipe(
      tap(response => {
        if (useCache && this.config.enableCaching) {
          this.setCache(cacheKey, response);
        }
        this.requestQueue.delete(cacheKey);
      }),
      catchError(error => {
        this.requestQueue.delete(cacheKey);
        return this.errorHandler.handleHttpError(error, `GET ${endpoint}`);
      }),
      shareReplay(1)
    );
    
    this.requestQueue.set(cacheKey, request);
    return request;
  }
  
  // POST Request
  post<T>(endpoint: string, data: any, params?: any): Observable<T> {
    const url = this.buildUrl(endpoint);
    this.logRequest('POST', url, 'SEND');
    
    return this.createRequest<T>('POST', url, params, data).pipe(
      catchError(error => this.errorHandler.handleHttpError(error, `POST ${endpoint}`))
    );
  }
  
  // PUT Request
  put<T>(endpoint: string, data: any, params?: any): Observable<T> {
    const url = this.buildUrl(endpoint);
    this.logRequest('PUT', url, 'SEND');
    
    return this.createRequest<T>('PUT', url, params, data).pipe(
      catchError(error => this.errorHandler.handleHttpError(error, `PUT ${endpoint}`))
    );
  }
  
  // DELETE Request
  delete<T>(endpoint: string, params?: any): Observable<T> {
    const url = this.buildUrl(endpoint);
    this.logRequest('DELETE', url, 'SEND');
    
    return this.createRequest<T>('DELETE', url, params).pipe(
      catchError(error => this.errorHandler.handleHttpError(error, `DELETE ${endpoint}`))
    );
  }
  
  // PATCH Request
  patch<T>(endpoint: string, data: any, params?: any): Observable<T> {
    const url = this.buildUrl(endpoint);
    this.logRequest('PATCH', url, 'SEND');
    
    return this.createRequest<T>('PATCH', url, params, data).pipe(
      catchError(error => this.errorHandler.handleHttpError(error, `PATCH ${endpoint}`))
    );
  }
  
  // File Upload
  upload<T>(endpoint: string, file: File, progressCallback?: (progress: number) => void): Observable<T> {
    const url = this.buildUrl(endpoint);
    const formData = new FormData();
    formData.append('file', file);
    
    this.logRequest('UPLOAD', url, 'SEND');
    
    return this.http.post<T>(url, formData, {
      headers: this.securityService.getSecurityHeaders(),
      reportProgress: true,
      observe: 'events'
    }).pipe(
      filter((event: HttpEvent<T>) => {
        if (event.type === HttpEventType.UploadProgress && progressCallback) {
          const progress = Math.round(100 * event.loaded / (event.total || 1));
          progressCallback(progress);
        }
        return event.type === HttpEventType.Response;
      }),
      map((event: HttpEvent<T>) => {
        if (event.type === HttpEventType.Response) {
          return event.body!;
        }
        throw new Error('Upload failed');
      }),
      catchError(error => this.errorHandler.handleHttpError(error, `UPLOAD ${endpoint}`))
    );
  }
  
  // Batch Requests
  batch<T>(requests: Array<{ method: string; endpoint: string; data?: any; params?: any }>): Observable<T[]> {
    const observables = requests.map(req => {
      switch (req.method.toUpperCase()) {
        case 'GET':
          return this.get<T>(req.endpoint, req.params);
        case 'POST':
          return this.post<T>(req.endpoint, req.data, req.params);
        case 'PUT':
          return this.put<T>(req.endpoint, req.data, req.params);
        case 'DELETE':
          return this.delete<T>(req.endpoint, req.params);
        default:
          return throwError(() => new Error(`Unsupported method: ${req.method}`));
      }
    });
    
    return new Observable<T[]>(observer => {
      const results: T[] = [];
      let completed = 0;
      
      observables.forEach((obs, index) => {
        obs.subscribe({
          next: (result) => {
            results[index] = result;
            completed++;
            if (completed === observables.length) {
              observer.next(results);
              observer.complete();
            }
          },
          error: (error) => {
            observer.error(error);
          }
        });
      });
    });
  }
  
  // Cache Management
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.cacheTimeout
    });
  }
  
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
  
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
  
  // Request Creation
  private createRequest<T>(
    method: string, 
    url: string, 
    params?: any, 
    data?: any
  ): Observable<T> {
    const headers = this.securityService.getSecurityHeaders();
    let httpParams = new HttpParams();
    
    // Add query parameters
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    // Add CSRF token
    const csrfToken = this.securityService.getCSRFToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
    
    const options: any = {
      headers,
      params: httpParams,
      observe: 'response'
    };
    
    let request: Observable<any>;
    
    switch (method.toUpperCase()) {
      case 'GET':
        request = this.http.get(url, options);
        break;
      case 'POST':
        request = this.http.post(url, data, options);
        break;
      case 'PUT':
        request = this.http.put(url, data, options);
        break;
      case 'DELETE':
        request = this.http.delete(url, options);
        break;
      case 'PATCH':
        request = this.http.patch(url, data, options);
        break;
      default:
        return throwError(() => new Error(`Unsupported HTTP method: ${method}`));
    }
    
    return request.pipe(
      timeout(this.config.timeout),
      retry({
        count: this.config.retryAttempts,
        delay: this.config.retryDelay,
        resetOnSuccess: true
      }),
      map(response => response.body),
      tap(() => {
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        throw error;
      })
    );
  }
  
  // URL Building
  private buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.config.baseUrl}/${cleanEndpoint}`;
  }
  
  // Cache Key Generation
  private generateCacheKey(method: string, url: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${method}:${url}:${paramString}`;
  }
  
  // Request Logging
  private logRequest(method: string, url: string, status: string): void {
    if (!this.config.enableLogging) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      method,
      url,
      status,
      userAgent: navigator.userAgent
    };
    
    this.logger.log('HTTP Request:', logEntry);
  }
  
  // Performance Monitoring
  private startRequestTimer(): number {
    return Date.now();
  }
  
  private endRequestTimer(startTime: number, method: string, url: string): void {
    const duration = Date.now() - startTime;
    this.logger.log(`Request completed in ${duration}ms: ${method} ${url}`);
    
    // Log slow requests
    if (duration > 5000) {
      this.logger.warn(`Slow request detected: ${method} ${url} took ${duration}ms`);
    }
  }
  
  // Request Queue Management
  getQueueSize(): number {
    return this.requestQueue.size;
  }
  
  clearQueue(): void {
    this.requestQueue.clear();
  }
  
  // Health Check
  healthCheck(): Observable<boolean> {
    return this.get<any>('health').pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
  
  // Configuration
  updateConfig(newConfig: Partial<HttpConfig>): void {
    Object.assign(this.config, newConfig);
  }
  
  getConfig(): HttpConfig {
    return { ...this.config };
  }
  
  // Utility Methods
  isOnline(): boolean {
    return navigator.onLine;
  }
  
  getNetworkInfo(): { online: boolean; effectiveType?: string; downlink?: number } {
    const connection = (navigator as any).connection;
    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink
    };
  }
} 