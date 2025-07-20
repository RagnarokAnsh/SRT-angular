import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  pageLoadTime: number;
  componentRenderTime: number;
  apiResponseTime: number;
}

export interface PerformanceConfig {
  enableMonitoring: boolean;
  enableOptimization: boolean;
  memoryThreshold: number; // MB
  cpuThreshold: number; // percentage
  networkThreshold: number; // ms
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private readonly config: PerformanceConfig = {
    enableMonitoring: true,
    enableOptimization: true,
    memoryThreshold: 100, // 100MB
    cpuThreshold: 80, // 80%
    networkThreshold: 5000 // 5 seconds
  };
  
  private metricsSubject = new BehaviorSubject<PerformanceMetrics>({
    memoryUsage: 0,
    cpuUsage: 0,
    networkLatency: 0,
    pageLoadTime: 0,
    componentRenderTime: 0,
    apiResponseTime: 0
  });
  
  public metrics$ = this.metricsSubject.asObservable();
  
  private performanceObserver: PerformanceObserver | null = null;
  private memoryObserver: any = null;
  
  constructor() {
    if (this.config.enableMonitoring) {
      this.initializeMonitoring();
    }
  }
  
  // Initialize Performance Monitoring
  private initializeMonitoring(): void {
    // Monitor page load performance
    this.monitorPageLoad();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor network performance
    this.monitorNetworkPerformance();
    
    // Monitor component rendering
    this.monitorComponentRendering();
  }
  
  // Page Load Monitoring
  private monitorPageLoad(): void {
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
          this.updateMetrics({ pageLoadTime: loadTime });
          
          if (loadTime > this.config.networkThreshold) {
            this.logPerformanceIssue('Slow page load', { loadTime });
          }
        }
      });
    }
  }
  
  // Memory Usage Monitoring
  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
        
        this.updateMetrics({ memoryUsage });
        
        if (memoryUsage > this.config.memoryThreshold) {
          this.logPerformanceIssue('High memory usage', { memoryUsage });
          this.optimizeMemory();
        }
      }, 10000); // Check every 10 seconds
    }
  }
  
  // Network Performance Monitoring
  private monitorNetworkPerformance(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if (connection) {
        connection.addEventListener('change', () => {
          const latency = connection.rtt || 0;
          this.updateMetrics({ networkLatency: latency });
          
          if (latency > this.config.networkThreshold) {
            this.logPerformanceIssue('High network latency', { latency });
          }
        });
      }
    }
  }
  
  // Component Rendering Monitoring
  private monitorComponentRendering(): void {
    if (typeof window !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            const renderTime = entry.duration;
            this.updateMetrics({ componentRenderTime: renderTime });
            
            if (renderTime > 100) { // 100ms threshold for component rendering
              this.logPerformanceIssue('Slow component rendering', { 
                component: entry.name, 
                renderTime 
              });
            }
          }
        }
      });
      
      observer.observe({ entryTypes: ['measure'] });
    }
  }
  
  // API Response Time Monitoring
  monitorApiResponse(url: string, startTime: number): void {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    this.updateMetrics({ apiResponseTime: responseTime });
    
    if (responseTime > this.config.networkThreshold) {
      this.logPerformanceIssue('Slow API response', { url, responseTime });
    }
  }
  
  // Memory Optimization
  private optimizeMemory(): void {
    if (!this.config.enableOptimization) return;
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
    
    // Clear unused caches
    this.clearUnusedCaches();
    
    // Log optimization attempt
    console.log('Memory optimization performed');
  }
  
  // Cache Management
  private clearUnusedCaches(): void {
    // Clear image cache
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('images')) {
            caches.delete(cacheName);
          }
        });
      });
    }
  }
  
  // Performance Issue Logging
  private logPerformanceIssue(type: string, details: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.warn('Performance Issue:', logEntry);
    
    // In production, send to monitoring service
    // this.sendToMonitoringService(logEntry);
  }
  
  // Metrics Update
  private updateMetrics(partial: Partial<PerformanceMetrics>): void {
    const currentMetrics = this.metricsSubject.value;
    const newMetrics = { ...currentMetrics, ...partial };
    this.metricsSubject.next(newMetrics);
  }
  
  // Public API
  getMetrics(): PerformanceMetrics {
    return this.metricsSubject.value;
  }
  
  getMetricsObservable(): Observable<PerformanceMetrics> {
    return this.metrics$;
  }
  
  // Performance Measurement
  measureComponentRender(componentName: string): void {
    if (typeof window !== 'undefined') {
      performance.mark(`${componentName}-start`);
      
      setTimeout(() => {
        performance.mark(`${componentName}-end`);
        performance.measure(
          `${componentName}-render`,
          `${componentName}-start`,
          `${componentName}-end`
        );
      }, 0);
    }
  }
  
  // API Performance Wrapper
  wrapApiCall<T>(apiCall: Observable<T>, url: string): Observable<T> {
    const startTime = performance.now();
    
    return new Observable(observer => {
      apiCall.subscribe({
        next: (result) => {
          this.monitorApiResponse(url, startTime);
          observer.next(result);
        },
        error: (error) => {
          this.monitorApiResponse(url, startTime);
          observer.error(error);
        },
        complete: () => {
          observer.complete();
        }
      });
    });
  }
  
  // Configuration
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    Object.assign(this.config, newConfig);
  }
  
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }
  
  // Performance Recommendations
  getPerformanceRecommendations(): string[] {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];
    
    if (metrics.memoryUsage > this.config.memoryThreshold) {
      recommendations.push('Consider implementing virtual scrolling for large lists');
      recommendations.push('Optimize image loading and caching');
      recommendations.push('Review component lifecycle management');
    }
    
    if (metrics.apiResponseTime > this.config.networkThreshold) {
      recommendations.push('Implement request caching');
      recommendations.push('Consider using pagination for large datasets');
      recommendations.push('Optimize API queries');
    }
    
    if (metrics.componentRenderTime > 100) {
      recommendations.push('Use OnPush change detection strategy');
      recommendations.push('Implement trackBy functions for ngFor');
      recommendations.push('Consider lazy loading for heavy components');
    }
    
    return recommendations;
  }
  
  // Cleanup
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.memoryObserver) {
      clearInterval(this.memoryObserver);
    }
  }
} 