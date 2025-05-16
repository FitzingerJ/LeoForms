import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MockOidcSecurityService {
  private mockUserData = {
    name: 'Jakob F.',
    preferred_username: 'jakob',
    email: 'jakob@example.com',
    given_name: 'Jakob',
    family_name: 'F.',
    sub: '1234567890'
  };

  checkAuth(): Observable<{
    isAuthenticated: boolean,
    userData: any,
    accessToken: string,
    idToken: string
  }> {
    return of({
      isAuthenticated: true,
      userData: this.mockUserData,
      accessToken: 'mock-access-token',
      idToken: 'mock-id-token'
    });
  }

  isAuthenticated(): Observable<boolean> {
    return of(true);
  }

  authorizeWithPopUp(): Observable<{
    isAuthenticated: boolean,
    userData: any,
    accessToken: string,
    errorMessage: string
  }> {
    return of({
      isAuthenticated: true,
      userData: this.mockUserData,
      accessToken: 'mock-access-token',
      errorMessage: ''
    });
  }

  logoff(): Observable<any> {
    console.log('[MockOidcSecurityService] User logged off');
    return of(null);
  }
}
