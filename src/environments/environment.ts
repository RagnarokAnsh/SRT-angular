export const environment = {
  production: false,
  development: true,
  staging: false,
  
  // API Configuration
  apiUrl: 'http://3.111.249.111/sribackend/api',
  apiTimeout: 30000,
  apiRetryAttempts: 3,
  
  // Security Configuration
  enableEncryption: true,
  sessionTimeout: 30, // minutes
  tokenRefreshThreshold: 300, // seconds
  
  // Performance Configuration
  enableCaching: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  
  // Error Handling Configuration
  enableErrorLogging: true,
  enableUserNotifications: true,
  maxErrorRetries: 3,
  
  // Feature Flags
  features: {
    advancedAnalytics: true,
    realTimeUpdates: false,
    offlineMode: false,
    darkMode: true,
    accessibility: true
  },
  
  // Logging Configuration
  logLevel: 'debug',
  enableConsoleLogging: true,
  enableRemoteLogging: false,
  
  // Monitoring Configuration
  enableErrorTracking: true,
  enableUserAnalytics: false,
  
  // Cache Configuration
  enableHttpCaching: true,
  enableImageCaching: true,
  enableComponentCaching: true,
  
  // Network Configuration
  enableOfflineSupport: false,
  enableRequestQueuing: true,
  enableRequestDeduplication: true,
  
  // UI Configuration
  enableAnimations: true,
  enableSmoothScrolling: true,
  enableResponsiveDesign: true,
  
  // Development Tools
  enableDebugMode: true,
  enableHotReload: true,
  enableSourceMaps: true
}; 