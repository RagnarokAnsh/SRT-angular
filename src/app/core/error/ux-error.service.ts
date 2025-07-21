import { Injectable } from '@angular/core';

export interface UXErrorMessage {
  title: string;
  message: string;
  action?: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UXErrorService {
  private errorMap: { [context: string]: { [status: number]: UXErrorMessage } } = {
    'login': {
      401: {
        title: 'Login Failed',
        message: 'Your email or password is incorrect.',
        action: 'Try again or reset your password',
        icon: 'pi pi-lock'
      },
      0: {
        title: 'Connection Problem',
        message: 'We couldn\'t connect to our servers.',
        action: 'Check your internet connection and try again',
        icon: 'pi pi-wifi-off'
      }
    },
    'student-create': {
      422: {
        title: 'Validation Error',
        message: 'Please check the student details and try again.',
        icon: 'pi pi-exclamation-triangle'
      },
      0: {
        title: 'Connection Problem',
        message: 'Could not connect to the server.',
        icon: 'pi pi-wifi-off'
      }
    },
    'user-create': {
      422: {
        title: 'Validation Error',
        message: 'Please check the user details and try again.',
        icon: 'pi pi-exclamation-triangle'
      },
      0: {
        title: 'Connection Problem',
        message: 'Could not connect to the server.',
        icon: 'pi pi-wifi-off'
      }
    },
    'assessment': {
      404: {
        title: 'Assessment Not Found',
        message: 'The requested assessment could not be found.',
        icon: 'pi pi-search'
      },
      422: {
        title: 'Invalid Assessment Data',
        message: 'Please check the assessment details and try again.',
        icon: 'pi pi-exclamation-triangle'
      },
      0: {
        title: 'Connection Problem',
        message: 'Could not connect to the server.',
        icon: 'pi pi-wifi-off'
      }
    },
    'students-list': {
      404: {
        title: 'No Students Found',
        message: 'No students could be found for this list.',
        icon: 'pi pi-users'
      },
      0: {
        title: 'Connection Problem',
        message: 'Could not connect to the server.',
        icon: 'pi pi-wifi-off'
      }
    },
    'anganwadi-create': {
      422: {
        title: 'Validation Error',
        message: 'Please check the anganwadi center details and try again.',
        icon: 'pi pi-exclamation-triangle'
      },
      0: {
        title: 'Connection Problem',
        message: 'Could not connect to the server.',
        icon: 'pi pi-wifi-off'
      }
    }
    // Add more contexts and error codes as needed
  };

  getContextualMessage(error: any, context: string): UXErrorMessage {
    const status = error?.status;
    return this.errorMap[context]?.[status] || this.getGenericMessage();
  }

  getGenericMessage(): UXErrorMessage {
    return {
      title: 'Something went wrong',
      message: 'An unexpected error occurred. Please try again later.',
      icon: 'pi pi-times-circle'
    };
  }
} 