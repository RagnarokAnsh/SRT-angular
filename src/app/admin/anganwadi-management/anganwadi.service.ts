import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

export interface AnganwadiCenter {
  id: number;
  name: string;
  code: string;
  project: string;
  sector: string;
  country_id: number;
  state_id: number;
  district_id: number;
  created_at?: string;
  updated_at?: string;
  // For display purposes
  country_name?: string;
  state_name?: string;
  district_name?: string;
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

@Injectable({
  providedIn: 'root'
})
export class AnganwadiService {
  private baseUrl = 'http://3.111.249.111/sribackend/api';

  constructor(private http: HttpClient) {}

  // Anganwadi CRUD operations
  getAnganwadiCenters(): Observable<AnganwadiCenter[]> {
    return this.http.get<AnganwadiCenter[]>(`${this.baseUrl}/anganwadi-centers`).pipe(
      map(centers => {
        // Enhance centers with location names
        return centers.map(center => ({
          ...center,
          country_name: '',
          state_name: '',
          district_name: ''
        }));
      })
    );
  }

  getAnganwadiCentersWithNames(): Observable<AnganwadiCenter[]> {
    return this.getAnganwadiCenters().pipe(
      map(centers => {
        // For now, just return centers with empty names - we'll load them individually
        return centers.map(center => ({
          ...center,
          country_name: 'Loading...',
          state_name: 'Loading...',
          district_name: 'Loading...'
        }));
      })
    );
  }

  // Enhanced method that loads names for each center individually
  getAnganwadiCentersWithNamesDetailed(): Observable<AnganwadiCenter[]> {
    return this.getAnganwadiCenters().pipe(
      map(centers => {
        const centersWithNames$ = centers.map(center => {
          return forkJoin({
            countries: this.getCountries(),
            states: center.country_id ? this.getStates(center.country_id) : [],
            districts: center.state_id ? this.getDistricts(center.state_id) : []
          }).pipe(
            map(({ countries, states, districts }) => {
              const country = countries.find(c => c.id === center.country_id);
              const state = states.find(s => s.id === center.state_id);
              const district = districts.find(d => d.id === center.district_id);
              
              return {
                ...center,
                country_name: country?.name || `ID: ${center.country_id}`,
                state_name: state?.name || `ID: ${center.state_id}`,
                district_name: district?.name || `ID: ${center.district_id}`
              };
            })
          );
        });
        
        return forkJoin(centersWithNames$);
      }),
      switchMap(centersWithNames$ => centersWithNames$)
    );
  }

  getAnganwadiCenter(id: number): Observable<AnganwadiCenter> {
    return this.http.get<AnganwadiCenter>(`${this.baseUrl}/anganwadi-centers/${id}`);
  }

  createAnganwadiCenter(center: Omit<AnganwadiCenter, 'id' | 'created_at' | 'updated_at'>): Observable<AnganwadiCenter> {
    return this.http.post<AnganwadiCenter>(`${this.baseUrl}/anganwadi-centers`, center);
  }

  updateAnganwadiCenter(id: number, center: Omit<AnganwadiCenter, 'id' | 'created_at' | 'updated_at'>): Observable<AnganwadiCenter> {
    return this.http.put<AnganwadiCenter>(`${this.baseUrl}/anganwadi-centers/${id}`, center);
  }

  deleteAnganwadiCenter(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/anganwadi-centers/${id}`);
  }

  // Dropdown data operations
  getCountries(): Observable<Country[]> {
    return this.http.get<Country[]>(`${this.baseUrl}/countries`);
  }

  getStates(countryId: number): Observable<State[]> {
    return this.http.get<State[]>(`${this.baseUrl}/states/${countryId}`);
  }

  getDistricts(stateId: number): Observable<District[]> {
    return this.http.get<District[]>(`${this.baseUrl}/districts/${stateId}`);
  }

  // Helper methods to get all states and districts for name mapping
  private getAllStates(): Observable<State[]> {
    return this.http.get<State[]>(`${this.baseUrl}/states`);
  }

  private getAllDistricts(): Observable<District[]> {
    return this.http.get<District[]>(`${this.baseUrl}/districts`);
  }
}