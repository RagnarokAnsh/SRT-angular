// src/app/competency.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators'; // Added catchError

// Interface for the nested domain object in the API response
export interface ApiDomain {
  id: number;
  domain_name: string;
  created_at: string;
  updated_at: string;
}

// Interface for a competency from the API
export interface ApiCompetency {
  id: number;
  name: string;
  description: string;
  domain_id: number;
  created_at: string;
  updated_at: string;
  domain: ApiDomain;
  // Optional fields that we expect to add or map
  imageUrl?: string;
  detailsImageUrl?: string;
  videos?: string[];
}

// Interface for the overall API response structure
export interface ApiResponse {
  status: boolean;
  data: ApiCompetency[];
}

// Interface for how we might structure Domains with their competencies in the app
export interface AppDomain {
  id: number;
  name: string;
  competencies: AppCompetency[];
}

// Interface for how we might structure Competencies in the app (could be similar to ApiCompetency)
export interface AppCompetency {
  id: number;
  name: string;
  description: string;
  domainId: number; // Renamed for consistency
  domainName: string;
  imageUrl: string; 
  detailsImageUrl: string; 
  videos: string[]; 
}

@Injectable({
  providedIn: 'root'
})
export class CompetencyService {
  private apiUrl = 'http://3.111.249.111/sribackend/api/competencies';
  private competenciesCache: ApiCompetency[] | null = null; // Cache for all competencies

  constructor(private http: HttpClient) {}

  // Placeholder image and video data - REPLACE or INTEGRATE with API data
  private getPlaceholderMedia(competencyId: number, competencyName: string): { imageUrl: string, detailsImageUrl: string, videos: string[] } {
    const placeholderBaseUrl = 'assets/images/competencies/'; 
    const videoBaseUrl = 'assets/videos/';
    // Sanitize competencyName for URL: lowercase, replace spaces with hyphens, remove special chars
    const safeName = competencyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return {
      imageUrl: `${placeholderBaseUrl}${safeName}.png`, 
      detailsImageUrl: `assets/images/details/${safeName}.png`, // Assuming a different folder for details images as per original hardcoded data
      videos: [ 
        `${videoBaseUrl}option1.mp4`, // Using generic video names as per original hardcoded data
        `${videoBaseUrl}option1.mp4`,
        `${videoBaseUrl}option1.mp4`
      ]
    };
  }

  private mapApiCompetencyToAppCompetency(apiCompetency: ApiCompetency): AppCompetency {
    const media = this.getPlaceholderMedia(apiCompetency.id, apiCompetency.name); 
    return {
      id: apiCompetency.id,
      name: apiCompetency.name,
      description: apiCompetency.description,
      domainId: apiCompetency.domain_id,
      domainName: apiCompetency.domain.domain_name,
      imageUrl: media.imageUrl, 
      detailsImageUrl: media.detailsImageUrl, 
      videos: media.videos 
    };
  }

  getDomainsWithCompetencies(): Observable<AppDomain[]> {
    return this.http.get<ApiResponse>(this.apiUrl).pipe(
      map(response => {
        if (!response.status || !response.data) {
          console.error('API error or no data:', response);
          this.competenciesCache = []; // Initialize cache as empty array on error
          return [];
        }
        this.competenciesCache = response.data; 

        const domainsMap = new Map<number, AppDomain>();
        response.data.forEach(apiCompetency => {
          const appCompetency = this.mapApiCompetencyToAppCompetency(apiCompetency);
          
          if (!domainsMap.has(appCompetency.domainId)) {
            domainsMap.set(appCompetency.domainId, {
              id: appCompetency.domainId,
              name: appCompetency.domainName,
              competencies: []
            });
          }
          domainsMap.get(appCompetency.domainId)!.competencies.push(appCompetency);
        });
        return Array.from(domainsMap.values());
      }),
      tap(appDomains => console.log('Processed Domains with Competencies:', appDomains)), 
      catchError(error => {
        console.error('Error fetching or processing competencies:', error);
        this.competenciesCache = []; // Initialize cache as empty array on error
        return of([]); 
      })
    );
  }

  getCompetencyById(id: number): Observable<AppCompetency | undefined> {
    if (this.competenciesCache && this.competenciesCache.length > 0) {
      const foundApiCompetency = this.competenciesCache.find(c => c.id === id);
      return of(foundApiCompetency ? this.mapApiCompetencyToAppCompetency(foundApiCompetency) : undefined);
    } else {
      // If cache is empty or not populated, fetch all.
      return this.getDomainsWithCompetencies().pipe(
        map(appDomains => {
          // After fetching, the cache should be populated. Try finding from cache again.
          const foundApiCompetencyFromCache = this.competenciesCache?.find(c => c.id === id);
          if (foundApiCompetencyFromCache) {
            return this.mapApiCompetencyToAppCompetency(foundApiCompetencyFromCache);
          }
          // Fallback: iterate through processed appDomains (should not be necessary if cache logic is correct)
          for (const domain of appDomains) {
            const foundAppCompetency = domain.competencies.find(c => c.id === id);
            if (foundAppCompetency) {
              return foundAppCompetency;
            }
          }
          return undefined;
        })
      );
    }
  }
}
