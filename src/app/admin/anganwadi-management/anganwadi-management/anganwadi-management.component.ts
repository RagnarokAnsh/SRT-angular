import { Component } from '@angular/core';

import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-anganwadi-management',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './anganwadi-management.component.html',
  styles: [],
})
export class AnganwadiManagementComponent {
  constructor(private messageService: MessageService) {}

  showSuccess(message: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
    });
  }

  showError(message: string) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
    });
  }
}
