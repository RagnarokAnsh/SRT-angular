import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserService } from '../services/user.service';

// Generic Role Guard - handles all role-based access control
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
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
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    // Check for role-based access
    const requiredRoles = route.data?.['roles'] as string[];
    const requiredPermissions = route.data?.['permissions'] as string[];
    
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles = this.userService.getUserRoles();
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        this.router.navigate(['/unauthorized']);
        return false;
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.some(permission => 
        this.userService.hasPermission(permission)
      );
      
      if (!hasPermission) {
        this.router.navigate(['/unauthorized']);
        return false;
      }
    }
    
    return true;
  }
}

// Authentication Guard - only checks if user is logged in
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
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    return true;
  }
}

// Specific Role Guards for type safety and explicit permissions
@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (!this.userService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    if (!this.userService.isAdmin()) {
      this.userService.redirectToUserDashboard();
      return false;
    }
    
    return true;
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

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (!this.userService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    if (!this.userService.isStateOfficial()) {
      this.userService.redirectToUserDashboard();
      return false;
    }
    
    return true;
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

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (!this.userService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    if (!this.userService.isDPO()) {
      this.userService.redirectToUserDashboard();
      return false;
    }
    
    return true;
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

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (!this.userService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    if (!this.userService.isCDPO()) {
      this.userService.redirectToUserDashboard();
      return false;
    }
    
    return true;
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

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (!this.userService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    if (!this.userService.isSupervisor()) {
      this.userService.redirectToUserDashboard();
      return false;
    }
    
    return true;
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

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (!this.userService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    if (!this.userService.isAWW()) {
      this.userService.redirectToUserDashboard();
      return false;
    }
    
    return true;
  }
}

// Access Level Guards
@Injectable({
  providedIn: 'root'
})
export class AdminAccessGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (!this.userService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    if (!this.userService.hasAdminAccess()) {
      this.userService.redirectToUserDashboard();
      return false;
    }
    
    return true;
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

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (!this.userService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    if (!this.userService.hasSupervisorAccess()) {
      this.userService.redirectToUserDashboard();
      return false;
    }
    
    return true;
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

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (!this.userService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    if (!this.userService.hasFieldAccess()) {
      this.userService.redirectToUserDashboard();
      return false;
    }
    
    return true;
  }
}