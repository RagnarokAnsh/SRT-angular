import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AnganwadiService, AnganwadiCenter } from '../anganwadi.service';

@Component({
  selector: 'app-anganwadi-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule
  ],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-body">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            <h2 class="heading-heading mb-3 mb-md-0">
              <span class="heading-highlight">Anganwadi</span> Centers List
            </h2>
            <button type="button" routerLink="create" class="btn btn-primary">
              <mat-icon>add</mat-icon>
              <span class="d-none d-sm-inline ms-1">Add Center</span>
            </button>
          </div>

          <div class="table-responsive">
            <table mat-table [dataSource]="anganwadiCenters" class="mat-elevation-z2 w-100">
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let center">{{center.name}}</td>
              </ng-container>

              <!-- Code Column -->
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>Code</th>
                <td mat-cell *matCellDef="let center">{{center.code}}</td>
              </ng-container>

              <!-- Project Column -->
              <ng-container matColumnDef="project">
                <th mat-header-cell *matHeaderCellDef class="d-none d-md-table-cell">Project</th>
                <td mat-cell *matCellDef="let center" class="d-none d-md-table-cell">{{center.project}}</td>
              </ng-container>

              <!-- Sector Column -->
              <ng-container matColumnDef="sector">
                <th mat-header-cell *matHeaderCellDef class="d-none d-lg-table-cell">Sector</th>
                <td mat-cell *matCellDef="let center" class="d-none d-lg-table-cell">{{center.sector}}</td>
              </ng-container>

              <!-- Country Column -->
              <ng-container matColumnDef="country">
                <th mat-header-cell *matHeaderCellDef class="d-none d-lg-table-cell">Country</th>
                <td mat-cell *matCellDef="let center" class="d-none d-lg-table-cell">{{center.country_name || 'N/A'}}</td>
              </ng-container>

              <!-- State Column -->
              <ng-container matColumnDef="state">
                <th mat-header-cell *matHeaderCellDef class="d-none d-lg-table-cell">State</th>
                <td mat-cell *matCellDef="let center" class="d-none d-lg-table-cell">{{center.state_name || 'N/A'}}</td>
              </ng-container>

              <!-- District Column -->
              <ng-container matColumnDef="district">
                <th mat-header-cell *matHeaderCellDef class="d-none d-lg-table-cell">District</th>
                <td mat-cell *matCellDef="let center" class="d-none d-lg-table-cell">{{center.district_name || 'N/A'}}</td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let center">
                  <div class="d-flex gap-2 justify-content-center">
                    <button mat-icon-button color="primary" [routerLink]="['edit', center.id]" matTooltip="Edit">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="openDeleteDialog(center)" matTooltip="Delete">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <div *ngIf="anganwadiCenters.length === 0" class="text-center py-4">
            <p class="text-muted">No Anganwadi Centers found</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: var(--spacing-md);
    }

    .table-responsive {
      margin-top: var(--spacing-md);
      border-radius: var(--border-radius-md);
      overflow: hidden;
    }

    table {
      width: 100%;
    }
    .mat-icon{
      text-align: center;
    }

    .mat-column-actions {
      width: 100px;
      text-align: center;
    }

    .mat-mdc-row:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }

    .mat-mdc-header-row {
      background-color: var(--background-color);
    }

    .mat-mdc-cell, .mat-mdc-header-cell {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    @media (max-width: 768px) {
      .mat-mdc-cell, .mat-mdc-header-cell {
        padding: var(--spacing-xs) var(--spacing-sm);
      }
    }
  `]
})
export class AnganwadiListComponent implements OnInit {
  anganwadiCenters: AnganwadiCenter[] = [];
  displayedColumns: string[] = ['name', 'code', 'project', 'sector', 'country', 'state', 'district', 'actions'];

  constructor(
    private anganwadiService: AnganwadiService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadAnganwadiCenters();
  }

  loadAnganwadiCenters() {
    // First, try to load centers with names, if that fails, load basic centers
    this.anganwadiService.getAnganwadiCentersWithNamesDetailed().subscribe({
      next: (centers) => {
        this.anganwadiCenters = centers;
      },
      error: (error) => {
        console.error('Error loading centers with names, falling back to basic load:', error);
        // Fallback to basic centers
        this.anganwadiService.getAnganwadiCenters().subscribe({
          next: (centers) => {
            this.anganwadiCenters = centers.map(center => ({
              ...center,
              country_name: `Country ID: ${center.country_id}`,
              state_name: `State ID: ${center.state_id}`,
              district_name: `District ID: ${center.district_id}`
            }));
          },
          error: (basicError) => {
            console.error('Error loading anganwadi centers:', basicError);
            this.anganwadiCenters = [];
          }
        });
      }
    });
  }

  openDeleteDialog(center: AnganwadiCenter) {
    const dialogRef = this.dialog.open(DeleteConfirmDialog, {
      width: '300px',
      data: { name: center.name }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteAnganwadiCenter(center.id);
      }
    });
  }

  deleteAnganwadiCenter(id: number) {
    this.anganwadiService.deleteAnganwadiCenter(id).subscribe({
      next: () => {
        this.loadAnganwadiCenters();
      },
      error: (error) => {
        console.error('Error deleting anganwadi center:', error);
      }
    });
  }
}

@Component({
  selector: 'delete-confirm-dialog',
  template: `
    <h2 mat-dialog-title>Delete Anganwadi Center</h2>
    <mat-dialog-content>
      Are you sure you want to delete {{data.name}}?
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="btn btn-outline-secondary me-2" mat-dialog-close>Cancel</button>
      <button type="button" class="btn btn-danger" [mat-dialog-close]="true">Delete</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [MatDialogModule, MatButtonModule]
})
export class DeleteConfirmDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { name: string }) {}
}