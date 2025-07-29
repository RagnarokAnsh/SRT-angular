import { Component, Input, Output, EventEmitter, forwardRef, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface DropdownOption {
  label: string;
  value: any;
  code?: string;
}

@Component({
  selector: 'app-custom-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-dropdown.component.html',
  styleUrls: ['./custom-dropdown.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomDropdownComponent),
      multi: true
    }
  ]
})
export class CustomDropdownComponent implements ControlValueAccessor, OnInit, OnDestroy, OnChanges {
  @ViewChild('dropdownContainer', { static: false }) dropdownContainer!: ElementRef;
  
  @Input() options: DropdownOption[] = [];
  @Input() set placeholder(value: string) {
    this._placeholder = value || 'Select options';
  }
  get placeholder(): string {
    return this._placeholder;
  }
  @Input() multiple: boolean = false;
  @Input() disabled: boolean = false;
  @Input() showClear: boolean = true;
  @Input() maxSelectedLabels: number = 2;
  @Input() icon: string = '';

  private _placeholder: string = 'Select options';
  
  @Output() selectionChange = new EventEmitter<any>();

  isOpen = false;
  selectedOptions: DropdownOption[] = [];
  searchTerm = '';
  filteredOptions: DropdownOption[] = [];

  private onChange = (value: any) => {};
  private onTouched = () => {};

  constructor(private cdr: ChangeDetectorRef) {
    // Ensure selectedOptions is always initialized
    this.selectedOptions = [];
  }

    ngOnInit() {
    this.filteredOptions = [...this.options];
    

    if (!this.selectedOptions) {
      this.selectedOptions = [];
    }


    document.addEventListener('click', this.onDocumentClick.bind(this));



   
    setTimeout(() => {
      if (this.selectedOptions.length === 0) {
        this.cdr.detectChanges();
      }
    }, 10);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['placeholder']) {
      // Placeholder changed
    }
    if (changes['options']) {
      this.filteredOptions = [...this.options];
    }
  }

  ngAfterViewInit() {
    // Ensure placeholders are shown if no values are set
    if (this.selectedOptions.length === 0) {
      this.cdr.detectChanges();
    }
    
    // Force initialization if no value has been set
    setTimeout(() => {
      if (this.selectedOptions.length === 0) {
        this.cdr.detectChanges();
      }
    }, 0);
  }

  // Method to force reset to show placeholder
  forceReset(): void {
    this.selectedOptions = [];
    this.searchTerm = '';
    this.filterOptions();
    this.cdr.detectChanges();
    
    // Force another change detection after a short delay
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.onDocumentClick.bind(this));
  }

  onDocumentClick(event: Event) {
    if (this.dropdownContainer && !this.dropdownContainer.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  toggleDropdown() {
    if (this.disabled) return;
    
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.filterOptions();
    }
    this.onTouched();
  }

  closeDropdown() {
    this.isOpen = false;
    this.searchTerm = '';
    this.filterOptions();
  }

  selectOption(option: DropdownOption) {
    // Option clicked - removed console log for production
    
    if (this.multiple) {
      const index = this.selectedOptions.findIndex(o => o.value === option.value);
      if (index > -1) {
        this.selectedOptions.splice(index, 1);
      } else {
        this.selectedOptions.push(option);
      }
    } else {
      this.selectedOptions = [option];
      this.closeDropdown();
    }
    
    this.emitChange();
  }



  removeOption(option: DropdownOption, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    const index = this.selectedOptions.findIndex(o => o.value === option.value);
    if (index > -1) {
      this.selectedOptions.splice(index, 1);
      this.emitChange();
    }
  }

  clearAll(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    this.selectedOptions = [];
    this.emitChange();
  }

  private emitChange() {
    const value = this.multiple 
      ? this.selectedOptions.map(o => o.value)
      : this.selectedOptions[0]?.value || null;
    
    this.onChange(value);
    this.selectionChange.emit(this.multiple ? this.selectedOptions : this.selectedOptions[0]);
  }

  isSelected(option: DropdownOption): boolean {
    return this.selectedOptions.some(o => o.value === option.value);
  }

  filterOptions() {
    if (!this.searchTerm.trim()) {
      this.filteredOptions = [...this.options];
    } else {
      this.filteredOptions = this.options.filter(option =>
        option.label.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  get showChips(): boolean {
    return this.multiple && this.selectedOptions.length > 0;
  }

  get shouldShowPlaceholder(): boolean {
    const shouldShow = !this.selectedOptions || this.selectedOptions.length === 0;
    // If we should show placeholder but selectedOptions is not initialized, force it
    if (shouldShow && !this.selectedOptions) {
      this.selectedOptions = [];
    }
    
    return shouldShow;
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    // Handle empty/null/undefined values explicitly
    if (value === null || value === undefined || 
        (Array.isArray(value) && value.length === 0) ||
        value === '' || 
        (this.multiple && (!Array.isArray(value) || value.length === 0)) ||
        (!this.multiple && (value === null || value === undefined || value === ''))) {
      this.selectedOptions = [];
    } else if (this.multiple && Array.isArray(value) && value.length > 0) {
      this.selectedOptions = this.options.filter(option => value.includes(option.value));
    } else if (!this.multiple && value !== null && value !== undefined && value !== '') {
      const option = this.options.find(o => o.value === value);
      this.selectedOptions = option ? [option] : [];
    } else {
      this.selectedOptions = [];
    }
    
    this.filterOptions(); // Refresh filtered options
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
} 