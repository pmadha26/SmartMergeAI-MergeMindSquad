import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface UserProfile {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

interface ApiResponse {
  success: boolean;
  data?: UserProfile;
  message?: string;
  errors?: string[];
}

/**
 * Service for User Profile API operations
 * Connects to Java/Spring Boot backend
 */
@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private apiUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) {}

  /**
   * Get user profile by ID
   */
  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/${userId}`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to load user profile');
        })
      );
  }

  /**
   * Update user profile
   */
  updateUserProfile(userId: string, profile: Partial<UserProfile>): Observable<ApiResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.put<ApiResponse>(
      `${this.apiUrl}/${userId}`,
      profile,
      { headers }
    );
  }

  /**
   * Validate user profile without saving
   */
  validateUserProfile(userId: string, profile: Partial<UserProfile>): Observable<{
    success: boolean;
    isValid: boolean;
    errors: string[];
  }> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<{
      success: boolean;
      isValid: boolean;
      errors: string[];
    }>(
      `${this.apiUrl}/${userId}/validate`,
      profile,
      { headers }
    );
  }
}


