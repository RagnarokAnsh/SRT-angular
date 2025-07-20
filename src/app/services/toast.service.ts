import { Injectable } from '@angular/core';
import { MessageService, Message } from 'primeng/api';
import { LoggerService } from './logger.service';

export interface ToastOptions {
  title?: string;
  message: string;
  duration?: number;
  closable?: boolean;
  sticky?: boolean;
  data?: any;
  id?: string;
  key?: string;
}

export interface ToastPosition {
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'center';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private defaultDuration = 5000;
  private toastCounter = 0;

  constructor(
    private messageService: MessageService,
    private logger: LoggerService
  ) {}

  /**
   * Show a success toast message
   */
  success(message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.showToast('success', message, title, options);
  }

  /**
   * Show an error toast message
   */
  error(message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.showToast('error', message, title, { 
      ...options, 
      duration: options?.duration || 8000, // Longer duration for errors
      sticky: options?.sticky !== undefined ? options.sticky : false
    });
  }

  /**
   * Show a warning toast message
   */
  warning(message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.showToast('warn', message, title, options);
  }

  /**
   * Show an info toast message
   */
  info(message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.showToast('info', message, title, options);
  }

  /**
   * Show a custom toast message with specified severity
   */
  custom(severity: 'success' | 'info' | 'warn' | 'error', message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.showToast(severity, message, title, options);
  }

  /**
   * Show a loading toast message
   */
  loading(message: string = 'Loading...', title?: string, options?: Partial<ToastOptions>): string {
    const toastId = `loading_${this.toastCounter++}`;
    this.showToast('info', message, title, {
      ...options,
      sticky: true,
      closable: false,
      id: toastId
    });
    return toastId;
  }

  /**
   * Update a loading toast with success
   */
  updateLoadingSuccess(toastId: string, message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.clear(toastId);
    this.success(message, title, options);
  }

  /**
   * Update a loading toast with error
   */
  updateLoadingError(toastId: string, message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.clear(toastId);
    this.error(message, title, options);
  }

  /**
   * Show a confirmation toast with actions
   */
  confirmation(
    message: string,
    title?: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    options?: Partial<ToastOptions>
  ): void {
    const toastMessage: Message = {
      severity: 'warn',
      summary: title || 'Confirmation Required',
      detail: message,
      sticky: true,
      closable: true,
      data: {
        onConfirm,
        onCancel
      }
    };

    this.messageService.add(toastMessage);
    this.logger.trackUserAction('toast_confirmation_shown', { 
      title, 
      message: message.substring(0, 100) 
    });
  }

  /**
   * Clear all toast messages
   */
  clearAll(): void {
    this.messageService.clear();
    this.logger.debug('All toast messages cleared');
  }

  /**
   * Clear specific toast message by key or id
   */
  clear(keyOrId?: string): void {
    if (keyOrId) {
      this.messageService.clear(keyOrId);
      this.logger.debug('Toast message cleared', { keyOrId });
    } else {
      this.clearAll();
    }
  }

  /**
   * Show a toast for API errors with automatic retry option
   */
  apiError(
    message: string, 
    title: string = 'API Error', 
    retryCallback?: () => void,
    options?: Partial<ToastOptions>
  ): void {
    const toastMessage: Message = {
      severity: 'error',
      summary: title,
      detail: message,
      life: 10000, // Longer duration for API errors
      closable: true,
      data: {
        retryCallback,
        isApiError: true
      }
    };

    this.messageService.add(toastMessage);
    this.logger.error('API Error toast shown', { title, message }, 'ToastService');
  }

  /**
   * Show a toast for offline/network errors
   */
  networkError(
    message: string = 'Network connection lost. Please check your internet connection.',
    title: string = 'Network Error',
    options?: Partial<ToastOptions>
  ): void {
    this.showToast('error', message, title, {
      ...options,
      sticky: true,
      closable: true,
      key: 'network-error' // Prevent duplicate network error toasts
    });
  }

  /**
   * Show a toast for form validation errors
   */
  validationError(
    message: string,
    title: string = 'Validation Error',
    options?: Partial<ToastOptions>
  ): void {
    this.showToast('warn', message, title, {
      ...options,
      duration: 6000
    });
  }

  /**
   * Show a toast for successful form submissions
   */
  formSuccess(
    message: string,
    title: string = 'Success',
    options?: Partial<ToastOptions>
  ): void {
    this.showToast('success', message, title, {
      ...options,
      duration: 4000
    });
  }

  /**
   * Show a toast for permission/authorization errors
   */
  permissionError(
    message: string = 'You do not have permission to perform this action.',
    title: string = 'Permission Denied',
    options?: Partial<ToastOptions>
  ): void {
    this.showToast('error', message, title, {
      ...options,
      duration: 7000
    });
  }

  /**
   * Show a toast for data save operations
   */
  saveSuccess(
    message: string = 'Data saved successfully!',
    title: string = 'Saved',
    options?: Partial<ToastOptions>
  ): void {
    this.showToast('success', message, title, {
      ...options,
      duration: 3000
    });
  }

  /**
   * Show a toast for data delete operations
   */
  deleteSuccess(
    message: string = 'Item deleted successfully!',
    title: string = 'Deleted',
    options?: Partial<ToastOptions>
  ): void {
    this.showToast('success', message, title, {
      ...options,
      duration: 3000
    });
  }

  /**
   * Core method to show toast messages
   */
  private showToast(
    severity: 'success' | 'info' | 'warn' | 'error',
    message: string,
    title?: string,
    options?: Partial<ToastOptions>
  ): void {
    const toastMessage: Message = {
      severity,
      summary: title || this.getDefaultTitle(severity),
      detail: message,
      life: options?.duration || options?.sticky ? undefined : this.defaultDuration,
      closable: options?.closable !== false,
      sticky: options?.sticky || false,
      data: options?.data,
      id: options?.id,
      key: options?.key
    };

    this.messageService.add(toastMessage);

    // Log toast for analytics and debugging
    this.logger.trackUserAction('toast_shown', {
      severity,
      title: title || this.getDefaultTitle(severity),
      message: message.substring(0, 100), // Truncate long messages for logging
      duration: options?.duration || this.defaultDuration,
      sticky: options?.sticky || false
    });
  }

  /**
   * Get default title based on severity
   */
  private getDefaultTitle(severity: string): string {
    switch (severity) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warn':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Notification';
    }
  }

  /**
   * Show multiple toasts in sequence
   */
  showSequence(toasts: Array<{
    severity: 'success' | 'info' | 'warn' | 'error';
    message: string;
    title?: string;
    delay?: number;
    options?: Partial<ToastOptions>;
  }>): void {
    toasts.forEach((toast, index) => {
      setTimeout(() => {
        this.showToast(toast.severity, toast.message, toast.title, toast.options);
      }, (toast.delay || 1000) * index);
    });
  }

  /**
   * Show a progress toast that can be updated
   */
  progress(
    message: string,
    title: string = 'Progress',
    initialProgress: number = 0,
    options?: Partial<ToastOptions>
  ): string {
    const toastId = `progress_${this.toastCounter++}`;
    const progressMessage = `${message} (${initialProgress}%)`;
    
    this.showToast('info', progressMessage, title, {
      ...options,
      sticky: true,
      closable: false,
      id: toastId
    });
    
    return toastId;
  }

  /**
   * Update progress toast
   */
  updateProgress(toastId: string, progress: number, message?: string): void {
    this.clear(toastId);
    const progressMessage = `${message || 'Processing'} (${progress}%)`;
    
    if (progress >= 100) {
      this.success(`${message || 'Process'} completed successfully!`);
    } else {
      this.showToast('info', progressMessage, 'Progress', {
        sticky: true,
        closable: false,
        id: toastId
      });
    }
  }
}