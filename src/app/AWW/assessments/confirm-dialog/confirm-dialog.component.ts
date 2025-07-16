import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirm-dialog">
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>
        <div class="dialog-content">
          <mat-icon color="warn">warning</mat-icon>
          <p>{{ data.message }}</p>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" class="btn btn-outline-secondary me-2 me-md-3" [mat-dialog-close]="false">Cancel</button>
        <button type="button" class="btn btn-primary" [mat-dialog-close]="true">{{ data.confirmText }}</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      padding: var(--spacing-xs);
      
      @media (min-width: 480px) {
        padding: var(--spacing-sm);
      }
      
      @media (min-width: 768px) {
        padding: 16px;
      }
    }
    
    .dialog-content {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-xs);
      margin: var(--spacing-xs) 0;
      
      @media (min-width: 480px) {
        gap: var(--spacing-sm);
        margin: var(--spacing-sm) 0;
      }
      
      @media (min-width: 768px) {
        align-items: center;
        gap: 16px;
        margin: 16px 0;
      }
    }
    
    mat-icon {
      font-size: 20px;
      height: 20px;
      width: 20px;
      flex-shrink: 0;
      margin-top: 2px;
      
      @media (min-width: 480px) {
        font-size: 24px;
        height: 24px;
        width: 24px;
      }
      
      @media (min-width: 768px) {
        font-size: 32px;
        height: 32px;
        width: 32px;
        margin-top: 0;
      }
    }
    
    p {
      margin: 0;
      font-size: 0.75rem;
      line-height: 1.4;
      
      @media (min-width: 480px) {
        font-size: 0.875rem;
      }
      
      @media (min-width: 768px) {
        font-size: 1rem;
      }
    }
    
    mat-dialog-actions {
      padding: var(--spacing-xs) 0 0;
      margin: 0;
      gap: var(--spacing-xs);
      
      @media (min-width: 480px) {
        padding: var(--spacing-sm) 0 0;
        gap: var(--spacing-sm);
      }
      
      @media (min-width: 768px) {
        padding: 16px 0 0;
        gap: var(--spacing-md);
      }
    }
    
    .btn {
      min-height: 44px;
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: 0.75rem;
      
      @media (min-width: 480px) {
        padding: var(--spacing-sm) var(--spacing-md);
        font-size: 0.875rem;
      }
      
      @media (min-width: 768px) {
        padding: var(--spacing-sm) var(--spacing-lg);
        font-size: 1rem;
      }
    }
    
    .me-2 {
      margin-right: var(--spacing-sm);
    }
    
    .me-md-3 {
      @media (min-width: 768px) {
        margin-right: var(--spacing-md);
      }
    }
    
    // Mobile-specific improvements
    @media (max-width: 767.98px) {
      .confirm-dialog {
        max-width: 95vw;
        margin: 0 auto;
      }
      
      mat-dialog-actions {
        flex-direction: column;
        width: 100%;
      }
      
      .btn {
        width: 100%;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      title: string;
      message: string;
      confirmText: string;
    }
  ) {}
}
