import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnganwadiListComponent } from './anganwadi-list.component';
import { RouterTestingModule } from '@angular/router/testing';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AnganwadiService, AnganwadiCenter } from '../anganwadi.service';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('AnganwadiListComponent', () => {
  let component: AnganwadiListComponent;
  let fixture: ComponentFixture<AnganwadiListComponent>;
  let mockAnganwadiService: jasmine.SpyObj<AnganwadiService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const mockCenters: AnganwadiCenter[] = [
    {
      id: 1,
      name: 'Test Center',
      code: 'TC001',
      project: 'Test Project',
      sector: 'Test Sector',
      country_id: 1,
      state_id: 1,
      district_id: 1,
      country_name: 'Test Country',
      state_name: 'Test State',
      district_name: 'Test District'
    }
  ];

  beforeEach(async () => {
    mockAnganwadiService = jasmine.createSpyObj('AnganwadiService', [
      'getAnganwadiCentersWithNamesDetailed',
      'getAnganwadiCenters',
      'deleteAnganwadiCenter'
    ]);

    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        AnganwadiListComponent,
        RouterTestingModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatDialogModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: AnganwadiService, useValue: mockAnganwadiService },
        { provide: MatDialog, useValue: mockDialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AnganwadiListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load centers with names on init', () => {
    mockAnganwadiService.getAnganwadiCentersWithNamesDetailed.and.returnValue(of(mockCenters));

    component.ngOnInit();
    expect(mockAnganwadiService.getAnganwadiCentersWithNamesDetailed).toHaveBeenCalled();
    expect(component.anganwadiCenters).toEqual(mockCenters);
  });

  it('should fallback to basic centers if detailed load fails', () => {
    const basicCenters = mockCenters.map(center => ({
      ...center,
      country_name: undefined,
      state_name: undefined,
      district_name: undefined
    }));

    mockAnganwadiService.getAnganwadiCentersWithNamesDetailed.and.returnValue(throwError(() => new Error('Failed')));
    mockAnganwadiService.getAnganwadiCenters.and.returnValue(of(basicCenters));

    component.ngOnInit();
    expect(mockAnganwadiService.getAnganwadiCenters).toHaveBeenCalled();
    expect(component.anganwadiCenters.length).toBe(1);
    expect(component.anganwadiCenters[0].country_name).toContain('Country ID:');
  });

  it('should open delete dialog', () => {
    const mockDialogRef = { afterClosed: () => of(true) };
    mockDialog.open.and.returnValue(mockDialogRef as any);

    component.openDeleteDialog(mockCenters[0]);
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should delete center when confirmed', () => {
    const mockDialogRef = { afterClosed: () => of(true) };
    mockDialog.open.and.returnValue(mockDialogRef as any);
    mockAnganwadiService.deleteAnganwadiCenter.and.returnValue(of(void 0));
    mockAnganwadiService.getAnganwadiCentersWithNamesDetailed.and.returnValue(of(mockCenters));

    component.openDeleteDialog(mockCenters[0]);
    expect(mockAnganwadiService.deleteAnganwadiCenter).toHaveBeenCalledWith(mockCenters[0].id);
  });
}); 