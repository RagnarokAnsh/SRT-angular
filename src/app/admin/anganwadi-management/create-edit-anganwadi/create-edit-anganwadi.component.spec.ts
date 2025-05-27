import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateEditAnganwadiComponent } from './create-edit-anganwadi.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { AnganwadiService, Country, State, District } from '../anganwadi.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('CreateEditAnganwadiComponent', () => {
  let component: CreateEditAnganwadiComponent;
  let fixture: ComponentFixture<CreateEditAnganwadiComponent>;
  let mockAnganwadiService: jasmine.SpyObj<AnganwadiService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAnganwadiService = jasmine.createSpyObj('AnganwadiService', [
      'getCountries',
      'getStates',
      'getDistricts',
      'createAnganwadi',
      'updateAnganwadi',
      'getAnganwadi'
    ]);

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        CreateEditAnganwadiComponent,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCardModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: AnganwadiService, useValue: mockAnganwadiService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => null
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEditAnganwadiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.anganwadiForm.get('name')?.value).toBe('');
    expect(component.anganwadiForm.get('code')?.value).toBe('');
    expect(component.anganwadiForm.get('project')?.value).toBe('');
    expect(component.anganwadiForm.get('sector')?.value).toBe('');
    expect(component.anganwadiForm.get('country_id')?.value).toBe('');
    expect(component.anganwadiForm.get('state_id')?.value).toBe('');
    expect(component.anganwadiForm.get('district_id')?.value).toBe('');
  });

  it('should load countries on init', () => {
    const mockCountries: Country[] = [{ id: 1, name: 'Country 1' }];
    mockAnganwadiService.getCountries.and.returnValue(of(mockCountries));

    component.ngOnInit();
    expect(mockAnganwadiService.getCountries).toHaveBeenCalled();
    expect(component.countries).toEqual(mockCountries);
  });

  it('should load states when country is selected', () => {
    const mockStates: State[] = [{ id: 1, name: 'State 1', country_id: 1 }];
    mockAnganwadiService.getStates.and.returnValue(of(mockStates));

    component.onCountryChange(1);
    expect(mockAnganwadiService.getStates).toHaveBeenCalledWith(1);
    expect(component.states).toEqual(mockStates);
  });

  it('should load districts when state is selected', () => {
    const mockDistricts: District[] = [{ id: 1, name: 'District 1', state_id: 1 }];
    mockAnganwadiService.getDistricts.and.returnValue(of(mockDistricts));

    component.onStateChange(1);
    expect(mockAnganwadiService.getDistricts).toHaveBeenCalledWith(1);
    expect(component.districts).toEqual(mockDistricts);
  });

  it('should navigate back when goBack is called', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: TestBed.inject(ActivatedRoute) });
  });
}); 