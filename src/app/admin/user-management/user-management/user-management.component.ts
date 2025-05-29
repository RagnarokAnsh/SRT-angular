import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, RouterModule, ToastModule],
  template: `
    <p-toast></p-toast>
    <div class="container mt-4">
      <div class="card">
        <div class="card-body">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class UserManagementComponent {
  constructor(private messageService: MessageService) {}

  showSuccess(message: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
      life: 3000
    });
  }

  showError(message: string) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 3000
    });
  }
}