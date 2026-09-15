# CRITICAL Memory Leak Fixes - Step-by-Step Guide

##  PRIORITY 1: Dashboard Component Memory Leaks

### File: `src/app/AWW/dashboard/dashboard.component.ts`

#### Step 1: Add RxJS Imports (Line 7)
**After line 7, add:**
```typescript
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
```

#### Step 2: Add Memory Leak Prevention Properties (After line 96)
**After line 96 (`@ViewChild('competenciesDropdown'...)`), add:**
```typescript
  // Memory leak prevention
  private destroy$ = new Subject<void>();
  private boundOrientationChange = this.onOrientationChange.bind(this);
  private boundWindowResize = this.onWindowResize.bind(this);
  private boundKeydown = this.onKeydown.bind(this);
```

#### Step 3: Fix Event Listeners in ngOnInit (Lines 198-205)
**Replace lines 198-205:**
```typescript
    // OLD CODE (DELETE):
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.checkMobileOrientation(), 100);
    });
    
    window.addEventListener('resize', () => {
      this.checkMobileOrientation();
    });
    
    // NEW CODE (ADD):
    window.addEventListener('orientationchange', this.boundOrientationChange);
    window.addEventListener('resize', this.boundWindowResize);
```

#### Step 4: Fix ngOnDestroy (Replace lines 225-229)
**Replace the entire ngOnDestroy method:**
```typescript
  ngOnDestroy() {
    // Complete all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Remove all event listeners
    window.removeEventListener('orientationchange', this.boundOrientationChange);
    window.removeEventListener('resize', this.boundWindowResize);
    document.removeEventListener('keydown', this.boundKeydown);
    
    // Dispose chart instance
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
  }
```

#### Step 5: Add Event Handler Methods (After ngOnDestroy)
**Add these new methods after ngOnDestroy:**
```typescript
  private onOrientationChange(): void {
    setTimeout(() => this.checkMobileOrientation(), 100);
  }

  private onWindowResize(): void {
    this.checkMobileOrientation();
  }

  private onKeydown(event: KeyboardEvent): void {
    // F5 or Ctrl+R for chart refresh
    if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
      event.preventDefault();
      this.refreshData();
    }
  }
```

#### Step 6: Remove Duplicate Event Listener in initializeChart (Lines 283-287)
**DELETE lines 283-287:**
```typescript
    // DELETE THESE LINES:
    window.addEventListener('resize', () => {
      if (this.chartInstance) {
        this.chartInstance.resize();
      }
    });
```

**Replace with a comment:**
```typescript
    // Chart resize is handled by the global window resize listener
```

#### Step 7: Fix Observable Subscriptions (Line 352 and 461)
**Line 352 - Add takeUntil:**
```typescript
// OLD:
this.studentService.getStudents(false).subscribe({

// NEW:
this.studentService.getStudents(false)
  .pipe(takeUntil(this.destroy$))
  .subscribe({
```

**Line 461 - Add takeUntil:**
```typescript
// OLD:
this.competencyService.getDomainsWithCompetencies().subscribe({

// NEW:
this.competencyService.getDomainsWithCompetencies()
  .pipe(takeUntil(this.destroy$))
  .subscribe({
```

#### Step 8: Fix setupKeyboardShortcuts (Lines 1702-1715)
**Replace the entire setupKeyboardShortcuts method:**
```typescript
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', this.boundKeydown);
  }
```

---

## ✅ [COMPLETED] PRIORITY 2: Custom Dropdown Component - Critical Bug Fix

### File: `src/app/components/custom-dropdown/custom-dropdown.component.ts`

#### Fix Event Listener Memory Leak (Lines 67, 116)

**CURRENT CODE (BROKEN - Creates memory leak):**
```typescript
// Line 67:
document.addEventListener('click', this.onDocumentClick.bind(this));

// Line 116:
document.removeEventListener('click', this.onDocumentClick.bind(this));
```

**FIXED CODE:**
```typescript
// Add property at top of class (after line 51):
private boundDocumentClick = this.onDocumentClick.bind(this);

// Line 67 - UPDATE TO:
document.addEventListener('click', this.boundDocumentClick);

// Line 116 - UPDATE TO:
document.removeEventListener('click', this.boundDocumentClick);
```

---

## ✅ PRIORITY 3: Assessments Component

### File: `src/app/AWW/assessments/assessments.component.ts`

#### Step 1: Add RxJS Imports (After line 7)
```typescript
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
```

#### Step 2: Add destroy$ Subject (After line 163)
```typescript
  private destroy$ = new Subject<void>();
  private boundResize = this.setPageSize.bind(this);
```

#### Step 3: Fix resize listener (Line 219)
```typescript
// OLD:
window.addEventListener('resize', this.setPageSize.bind(this));

// NEW:
window.addEventListener('resize', this.boundResize);
```

#### Step 4: Fix ngOnDestroy (Currently line 245-247)
```typescript
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', this.boundResize);
  }
```

#### Step 5: Fix Route Subscription (Line 228)
```typescript
// OLD:
this.route.params.subscribe(params => {

// NEW:
this.route.params
  .pipe(takeUntil(this.destroy$))
  .subscribe(params => {
```

####Step 6: Fix Other Subscriptions
Add `.pipe(takeUntil(this.destroy$))` before `.subscribe` on lines:
- 260 (student service)
- 334 (competency service)
- 368 (competency service)
- 435 (assessment service)
- 796 (assessment service)

---

## ✅ [COMPLETED] PRIORITY 4: Student Service

### File: `src/app/AWW/student-management/student.service.ts`

#### Fix Subscription Leak (Line 64)

**Problem:** Service creates subscription but never unsubscribes

**Solution Options:**

**Option A - Auto-unsubscribe pattern:**
```typescript
// Replace constructor (lines 62-67):
constructor(private http: HttpClient, private userService: UserService) {
  // Use first() operator to auto-complete after first emission
  this.userService.currentUser$
    .pipe(first())
    .subscribe(user => {
      this.currentUser = user;
    });
}
```

**Option B - Add OnDestroy:**
```typescript
// Add at top:
import { Injectable, OnDestroy } from '@angular/core';

// Modify class declaration:
export class StudentService implements OnDestroy {

// Add method at end:
  ngOnDestroy() {
    if (this.currentUserSubscription) {
      this.currentUserSubscription.unsubscribe();
    }
  }
```

---

## Testing Checklist

After applying each fix:

1. ✅ Check that `ng serve` compiles without errors
2. ✅ Test the component in browser
3. ✅ Use Chrome DevTools Memory Profiler:
   - Navigate to component
   - Take heap snapshot
   - Navigate away
   - Force garbage collection (trash icon)
   - Take another snapshot
   - Compare - should see cleanup

---

## Quick Wins for Other Files

### `src/app/AWW/details/details.component.ts`
- Line 41: Add cleanup for resize listener
- Line 38: Add takeUntil to subscription

### `src/app/AWW/student-management/students-list/students-list.component.ts`
- Line 65: Add cleanup for resize listener

### Admin Components
Similar pattern - all lists that use `window.addEventListener('resize')` need cleanup

---

## Code Pattern Template

For future components, use this pattern:

```typescript
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private bound ResizeHandler = this.onResize.bind(this);

  ngOnInit() {
    window.addEventListener('resize', this.boundResizeHandler);
    
    this.myService.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => { /* ... */ });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', this.boundResizeHandler);
  }

  private onResize() {
    // Handle resize
  }
}
```

---

## Next Steps After Memory Leak Fixes

1. Implement lazy loading (separate task)
2. Add global loading indicator (separate task)
3. Reduce component sizes (dashboard & assessments)
4. Add OnPush change detection 
5. Optimize API calls

---

## Estimated Time

- Priority 1 (Dashboard): 30 minutes
- Priority 2 (Custom Dropdown): 5 minutes
- Priority 3 (Assessments): 20 minutes
- Priority 4 (Student Service): 10 minutes
- Testing: 15 minutes

**Total: ~80 minutes for critical fixes**

