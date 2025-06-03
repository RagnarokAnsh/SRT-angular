import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
  pivot?: {
    model_type: string;
    model_id: number;
    role_id: number;
  };
}

export interface Country {
  id: number;
  name: string;
}

export interface State {
  id: number;
  name: string;
  country_id: number;
}

export interface District {
  id: number;
  name: string;
  state_id: number;
}

export interface Project {
  id: number;
  name: string;
  district_id: number;
}

export interface Sector {
  id: number;
  name: string;
  district_id: number;
  project: string;
}

export interface AnganwadiCenter {
  id: number;
  name: string;
  code: string;
  project: string;
  sector: string;
  country_id: number;
  state_id: number;
  district_id: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  country_id: number | null;
  state_id: number | null;
  district_id: number | null;
  project: string | null;
  sector: string | null;
  anganwadi_id: number | null; 
  created_at: string;
  updated_at: string;
  roles: Role[];
  country: Country | null;
  state: State | null;
  district: District | null;
  anganwadi: AnganwadiCenter | null;
  gender: string | null;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: string;
  country_id?: number | null;
  state_id?: number | null;
  district_id?: number | null;
  project?: string | null;
  sector?: string | null;
  anganwadi_id?: number | null; // 
  gender: string;
}

export interface UpdateUserRequest {
  name: string;
  email: string;
  password?: string;
  role: string;
  country_id?: number | null;
  state_id?: number | null;
  district_id?: number | null;
  project?: string | null;
  sector?: string | null;
  anganwadi_id?: number | null; // 
  gender: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = 'http://3.111.249.111/sribackend/api';

  constructor(private http: HttpClient) {}

  // User CRUD operations
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/${id}`);
  }

  createUser(user: CreateUserRequest): Observable<User> {
    console.log('Creating user with data:', user);
    
    const userData = { ...user };
    
    if (userData.anganwadi_id !== undefined && userData.anganwadi_id !== null) {
      userData.anganwadi_id = Number(userData.anganwadi_id);
    }
    
    return this.http.post<User>(`${this.baseUrl}/users`, userData);
  }

  updateUser(id: number, user: UpdateUserRequest): Observable<User> {
    console.log('Updating user with data:', user);
    
    const userData = { ...user };
    
    if (userData.anganwadi_id !== undefined && userData.anganwadi_id !== null) {
      userData.anganwadi_id = Number(userData.anganwadi_id);
    }
    
    return this.http.put<User>(`${this.baseUrl}/users/${id}`, userData);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${id}`);
  }

  // Location and center APIs
  getCountries(): Observable<Country[]> {
    return this.http.get<Country[]>(`${this.baseUrl}/countries`);
  }

  getStatesByCountry(countryId: number): Observable<State[]> {
    return this.http.get<State[]>(`${this.baseUrl}/states/${countryId}`);
  }

  getDistrictsByState(stateId: number): Observable<District[]> {
    return this.http.get<District[]>(`${this.baseUrl}/districts/${stateId}`);
  }

  getProjectsByDistrict(districtId: number): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/projects/${districtId}`);
  }

  getSectorsByProject(districtId: number, project: string): Observable<Sector[]> {
    return this.http.get<Sector[]>(`${this.baseUrl}/sectors/${districtId}/${project}`);
  }

  getCentersBySector(districtId: number, project: string, sector: string): Observable<AnganwadiCenter[]> {
    return this.http.get<AnganwadiCenter[]>(`${this.baseUrl}/centers/${districtId}/${project}/${sector}`);
  }

  getAnganwadiCenters(): Observable<AnganwadiCenter[]> {
    return this.http.get<AnganwadiCenter[]>(`${this.baseUrl}/anganwadi-centers`);
  }

  // Available roles
  getAvailableRoles(): string[] {
    return ['admin', 'aww', 'supervisor', 'cdpo', 'dpo', 'stateofficial'];
  }

  // Role-based field requirements
  getRoleRequiredFields(role: string): string[] {
    const roleFieldMap: { [key: string]: string[] } = {
      'admin': [],
      'aww': ['country_id', 'state_id', 'district_id', 'project', 'sector', 'anganwadi_id'],
      'supervisor': ['country_id', 'state_id', 'district_id', 'project', 'sector'],
      'cdpo': ['country_id', 'state_id', 'district_id', 'project'],
      'dpo': ['country_id', 'state_id', 'district_id'],
      'stateofficial': ['country_id', 'state_id']
    };
    return roleFieldMap[role] || [];
  }
}