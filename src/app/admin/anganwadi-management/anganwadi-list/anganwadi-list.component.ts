import { Component, OnInit, Inject, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { AnganwadiService, AnganwadiCenter } from '../anganwadi.service';
import { MessageService } from 'primeng/api';
import { SkeletonLoaderComponent } from '../../../components/skeleton-loader';
import { LoggerService } from '../../../core/logger.service';


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
    MatDialogModule,
    MatPaginatorModule,
    SkeletonLoaderComponent
  ],

  templateUrl: './anganwadi-list.component.html',
  styleUrls: ['./anganwadi-list.component.scss']
})
export class AnganwadiListComponent implements OnInit {
  dataSource = new MatTableDataSource<AnganwadiCenter>([]);
  displayedColumns: string[] = ['name', 'code', 'project', 'sector', 'country', 'state', 'district', 'actions'];
  isLoading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  pageSize = 10;

  private messageService = inject(MessageService);

  constructor(
    private anganwadiService: AnganwadiService,
    private router: Router,
    private dialog: MatDialog,
    private logger: LoggerService
  ) { }

  ngOnInit() {
    this.setPageSize();
    window.addEventListener('resize', this.setPageSize.bind(this));
    this.loadAnganwadiCenters();
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.setPageSize.bind(this));
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.paginator.pageSize = this.pageSize;
  }

  setPageSize() {
    const width = window.innerWidth;
    this.pageSize = width <= 768 ? 5 : 10;
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.paginator._changePageSize(this.pageSize);
    }
  }

  loadAnganwadiCenters() {
    this.isLoading = true;
    this.anganwadiService.getAnganwadiCentersWithNamesDetailed().subscribe({
      next: (centers) => {
        this.dataSource.data = centers;
        this.isLoading = false;
      },
      error: (error) => {
        this.logger.error('Error loading centers with names, falling back to basic load:', error);
        // Fallback to basic centers
        this.anganwadiService.getAnganwadiCenters().subscribe({
          next: (centers) => {
            this.dataSource.data = centers.map(center => ({
              ...center,
              country_name: `Country ID: ${center.country_id}`,
              state_name: `State ID: ${center.state_id}`,
              district_name: `District ID: ${center.district_id}`
            }));
            this.isLoading = false;
          },
          error: (basicError) => {
            this.logger.error('Error loading anganwadi centers:', basicError);
            this.dataSource.data = [];
            this.isLoading = false;
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
        // Use setTimeout to ensure the toast is shown after the component is fully initialized
        setTimeout(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Anganwadi center deleted successfully',
            life: 3000
          });
        }, 0);
        this.loadAnganwadiCenters();
      },
      error: (error) => {
        setTimeout(() => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to delete anganwadi center: ${error.message || 'Unknown error'}`,
            life: 5000
          });
        }, 0);
        this.logger.error('Error deleting anganwadi center:', error);
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