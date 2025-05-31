import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MockOidcSecurityService {
  private userDataSubject = new BehaviorSubject<any>({
    name: 'Jakob F.',
    preferred_username: 'jakob',
    email: 'jakob@example.com',
    given_name: 'Jakob',
    family_name: 'F.',
    sub: '1234567890'
  });

  get userData$(): Observable<any> {
    return this.userDataSubject.asObservable();
  }

  checkAuth(): Observable<{
    isAuthenticated: boolean,
    userData: any,
    accessToken: string,
    idToken: string
  }> {
    return of({
      isAuthenticated: true,
      userData: this.userDataSubject.value,
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
      userData: this.userDataSubject.value,
      accessToken: 'mock-access-token',
      errorMessage: ''
    });
  }

  logoff(): Observable<any> {
    console.log('[MockOidcSecurityService] User logged off');
    return of(null);
  }

  switchUser(name: 'Jakob' | 'Direktor' | 'Sekretariat') {
    const users = {
      Jakob: {
        name: 'Jakob F.',
        preferred_username: 'jakob',
        email: 'jakob@example.com',
        given_name: 'Jakob',
        family_name: 'F.',
        sub: 'jakob-uid'
      },
      Direktor: {
        name: 'Direktor',
        preferred_username: 'direktor',
        email: 'direktor@htl-leonding.ac.at',
        given_name: 'D',
        family_name: '',
        sub: 'direktor-uid'
      },
      Sekretariat: {
        name: 'Sekretariat',
        preferred_username: 'sekretariat',
        email: 'sekretariat@htl-leonding.ac.at',
        given_name: 'S',
        family_name: '',
        sub: 'sekretariat-uid'
      }
    };
    this.userDataSubject.next(users[name]);
  }
}