import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor() {}

  login(email: string, password: string): Observable<any> {
    
    return of({ email, name: 'Test User' });
  }
} 