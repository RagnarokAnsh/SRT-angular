import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const isAuthenticated = this.userService.isAuthenticated();
    
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }
    
    // Check for role-based access
    const requiredRoles = route.data?.['roles'] as string[];
    
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles = this.userService.getUserRoles();
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        // Redirect to appropriate dashboard based on user's highest priority role
        this.redirectToUserDashboard();
        return false;
      }
    }
    
    return true;
  }

  private redirectToUserDashboard(): void {
    if (this.userService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else if (this.userService.isStateOfficial()) {
      this.router.navigate(['/state/dashboard']);
    } else if (this.userService.isDPO()) {
      this.router.navigate(['/dpo/dashboard']);
    } else if (this.userService.isCDPO()) {
      this.router.navigate(['/cdpo/dashboard']);
    } else if (this.userService.isSupervisor()) {
      this.router.navigate(['/supervisor/dashboard']);
    } else if (this.userService.isAWW()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const isAuthenticated = this.userService.isAuthenticated();
    
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (!this.userService.isAdmin()) {
      this.redirectToUserDashboard();
      return false;
    }
    
    return true;
  }

  private redirectToUserDashboard(): void {
    if (this.userService.isStateOfficial()) {
      this.router.navigate(['/state/dashboard']);
    } else if (this.userService.isDPO()) {
      this.router.navigate(['/dpo/dashboard']);
    } else if (this.userService.isCDPO()) {
      this.router.navigate(['/cdpo/dashboard']);
    } else if (this.userService.isSupervisor()) {
      this.router.navigate(['/supervisor/dashboard']);
    } else if (this.userService.isAWW()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class StateOfficialGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const isAuthenticated = this.userService.isAuthenticated();
    
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (!this.userService.isStateOfficial()) {
      this.redirectToUserDashboard();
      return false;
    }
    
    return true;
  }

  private redirectToUserDashboard(): void {
    if (this.userService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else if (this.userService.isDPO()) {
      this.router.navigate(['/dpo/dashboard']);
    } else if (this.userService.isCDPO()) {
      this.router.navigate(['/cdpo/dashboard']);
    } else if (this.userService.isSupervisor()) {
      this.router.navigate(['/supervisor/dashboard']);
    } else if (this.userService.isAWW()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class DPOGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const isAuthenticated = this.userService.isAuthenticated();
    
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (!this.userService.isDPO()) {
      this.redirectToUserDashboard();
      return false;
    }
    
    return true;
  }

  private redirectToUserDashboard(): void {
    if (this.userService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else if (this.userService.isStateOfficial()) {
      this.router.navigate(['/state/dashboard']);
    } else if (this.userService.isCDPO()) {
      this.router.navigate(['/cdpo/dashboard']);
    } else if (this.userService.isSupervisor()) {
      this.router.navigate(['/supervisor/dashboard']);
    } else if (this.userService.isAWW()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class CDPOGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const isAuthenticated = this.userService.isAuthenticated();
    
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (!this.userService.isCDPO()) {
      this.redirectToUserDashboard();
      return false;
    }
    
    return true;
  }

  private redirectToUserDashboard(): void {
    if (this.userService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else if (this.userService.isStateOfficial()) {
      this.router.navigate(['/state/dashboard']);
    } else if (this.userService.isDPO()) {
      this.router.navigate(['/dpo/dashboard']);
    } else if (this.userService.isSupervisor()) {
      this.router.navigate(['/supervisor/dashboard']);
    } else if (this.userService.isAWW()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class SupervisorGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const isAuthenticated = this.userService.isAuthenticated();
    
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (!this.userService.isSupervisor()) {
      this.redirectToUserDashboard();
      return false;
    }
    
    return true;
  }

  private redirectToUserDashboard(): void {
    if (this.userService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else if (this.userService.isStateOfficial()) {
      this.router.navigate(['/state/dashboard']);
    } else if (this.userService.isDPO()) {
      this.router.navigate(['/dpo/dashboard']);
    } else if (this.userService.isCDPO()) {
      this.router.navigate(['/cdpo/dashboard']);
    } else if (this.userService.isAWW()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class AWWGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const isAuthenticated = this.userService.isAuthenticated();
    
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (!this.userService.isAWW()) {
      this.redirectToUserDashboard();
      return false;
    }
    
    return true;
  }

  private redirectToUserDashboard(): void {
    if (this.userService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else if (this.userService.isStateOfficial()) {
      this.router.navigate(['/state/dashboard']);
    } else if (this.userService.isDPO()) {
      this.router.navigate(['/dpo/dashboard']);
    } else if (this.userService.isCDPO()) {
      this.router.navigate(['/cdpo/dashboard']);
    } else if (this.userService.isSupervisor()) {
      this.router.navigate(['/supervisor/dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}

// guards foraccess
@Injectable({
  providedIn: 'root'
})
export class AdminAccessGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const isAuthenticated = this.userService.isAuthenticated();
    
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (!this.userService.hasAdminAccess()) {
      this.redirectToUserDashboard();
      return false;
    }
    
    return true;
  }

  private redirectToUserDashboard(): void {
    if (this.userService.isSupervisor()) {
      this.router.navigate(['/supervisor/dashboard']);
    } else if (this.userService.isAWW()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class SupervisorAccessGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const isAuthenticated = this.userService.isAuthenticated();
    
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (!this.userService.hasSupervisorAccess()) {
      this.redirectToUserDashboard();
      return false;
    }
    
    return true;
  }

  private redirectToUserDashboard(): void {
    if (this.userService.isAWW()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class FieldAccessGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const isAuthenticated = this.userService.isAuthenticated();
    
    if (!isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (!this.userService.hasFieldAccess()) {
      this.router.navigate(['/home']);
      return false;
    }
    
    return true;
  }
}