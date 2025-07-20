/**
 * ToastService Usage Examples
 * 
 * This file contains examples of how to use the new ToastService
 * to replace existing MessageService usage throughout the application.
 */

import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable()
export class ToastExamples {
  private toastService = inject(ToastService);

  // Basic toast examples
  showBasicToasts() {
    // Success toast
    this.toastService.success('Operation completed successfully!');
    
    // Error toast
    this.toastService.error('Something went wrong. Please try again.');
    
    // Warning toast
    this.toastService.warning('Please save your work before continuing.');
    
    // Info toast
    this.toastService.info('New features are available in this update.');
  }

  // Form-related toasts
  showFormToasts() {
    // Form submission success
    this.toastService.formSuccess('User profile updated successfully!');
    
    // Form validation error
    this.toastService.validationError('Please fill in all required fields.');
    
    // Save operation
    this.toastService.saveSuccess('Changes have been saved.');
    
    // Delete operation
    this.toastService.deleteSuccess('User deleted successfully.');
  }

  // API-related toasts
  showApiToasts() {
    // API error with retry
    this.toastService.apiError(
      'Failed to load data from server.',
      'Connection Error',
      () => {
        // Retry logic here
        console.log('Retrying API call...');
      }
    );
    
    // Network error
    this.toastService.networkError();
    
    // Permission error
    this.toastService.permissionError('You do not have access to this feature.');
  }

  // Loading states
  async showLoadingToasts() {
    // Show loading toast
    const loadingId = this.toastService.loading('Processing your request...');
    
    try {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update with success
      this.toastService.updateLoadingSuccess(
        loadingId, 
        'Request processed successfully!'
      );
    } catch (error) {
      // Update with error
      this.toastService.updateLoadingError(
        loadingId,
        'Failed to process request.'
      );
    }
  }

  // Progress tracking
  async showProgressToasts() {
    const progressId = this.toastService.progress('Uploading file...', 'Upload Progress', 0);
    
    // Simulate progress updates
    for (let i = 10; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      this.toastService.updateProgress(progressId, i, 'Uploading file...');
    }
  }

  // Sequential toasts
  showSequentialToasts() {
    this.toastService.showSequence([
      {
        severity: 'info',
        message: 'Starting process...',
        delay: 0
      },
      {
        severity: 'info', 
        message: 'Processing data...',
        delay: 1000
      },
      {
        severity: 'success',
        message: 'Process completed!',
        delay: 2000
      }
    ]);
  }

  // Confirmation toast
  showConfirmationToast() {
    this.toastService.confirmation(
      'Are you sure you want to delete this item?',
      'Confirm Deletion',
      () => {
        // Confirm action
        this.toastService.success('Item deleted successfully!');
      },
      () => {
        // Cancel action
        this.toastService.info('Deletion cancelled.');
      }
    );
  }

  // Custom toast with options
  showCustomToast() {
    this.toastService.custom(
      'warn',
      'This is a custom warning message with specific options.',
      'Custom Warning',
      {
        duration: 10000, // 10 seconds
        sticky: false,
        closable: true,
        data: { customData: 'example' }
      }
    );
  }

  // Toast management
  manageToasts() {
    // Clear all toasts
    this.toastService.clearAll();
    
    // Clear specific toast by key
    this.toastService.clear('specific-key');
  }
}

/**
 * Migration Guide: From MessageService to ToastService
 * 
 * OLD WAY (MessageService):
 * ```typescript
 * this.messageService.add({
 *   severity: 'success',
 *   summary: 'Success',
 *   detail: 'Operation completed successfully!'
 * });
 * ```
 * 
 * NEW WAY (ToastService):
 * ```typescript
 * this.toastService.success('Operation completed successfully!');
 * ```
 * 
 * Benefits of ToastService:
 * 1. Simplified API with semantic method names
 * 2. Built-in error handling and retry functionality
 * 3. Automatic logging and analytics integration
 * 4. Loading state management
 * 5. Progress tracking capabilities
 * 6. Consistent styling and behavior
 * 7. Enhanced accessibility features
 * 8. Mobile-optimized positioning and animations
 */

export const TOAST_MIGRATION_EXAMPLES = {
  // Basic success message
  old: `this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Saved!' });`,
  new: `this.toastService.success('Saved!');`,

  // Error message  
  oldError: `this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save' });`,
  newError: `this.toastService.error('Failed to save');`,

  // Warning message
  oldWarning: `this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Check input' });`,
  newWarning: `this.toastService.warning('Check input');`,

  // Info message
  oldInfo: `this.messageService.add({ severity: 'info', summary: 'Info', detail: 'New update available' });`,
  newInfo: `this.toastService.info('New update available');`,

  // Custom duration
  oldCustom: `this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Done!', life: 3000 });`,
  newCustom: `this.toastService.success('Done!', undefined, { duration: 3000 });`,

  // Sticky message
  oldSticky: `this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Important!', sticky: true });`,
  newSticky: `this.toastService.info('Important!', undefined, { sticky: true });`
};