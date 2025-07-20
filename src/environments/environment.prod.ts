export const environment = {
  production: true,
  development: false,
  staging: false,
  
  // API Configuration
  apiUrl: 'https://api.schoolreadinesstool.com/api',
  apiTimeout: 30000,
  apiRetryAttempts: 3,
  
  // Security Configuration
  enableEncryption: true,
  sessionTimeout: 30, // minutes
  tokenRefreshThreshold: 300, // seconds
  
  // Performance Configuration
  enableCaching: true,
  cacheTimeout: 10 * 60 * 1000, // 10 minutes
  
  // Error Handling Configuration
  enableErrorLogging: true,
  enableUserNotifications: true,
  maxErrorRetries: 2,
  
  // Feature Flags
  features: {
    advancedAnalytics: true,
    realTimeUpdates: true,
    offlineMode: false,
    darkMode: true,
    accessibility: true
  },
  
  // Logging Configuration
  logLevel: 'error',
  enableConsoleLogging: false,
  enableRemoteLogging: true,
  
  // Monitoring Configuration
  enableErrorTracking: true,
  enableUserAnalytics: true,
  
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
  enableDebugMode: false,
  enableHotReload: false,
  enableSourceMaps: false
}; 