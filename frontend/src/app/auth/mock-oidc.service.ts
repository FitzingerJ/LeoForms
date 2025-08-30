// src/app/auth/mock-oidc.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';

export type UserKey =
  | 'Jakob'
  | 'Direktor'
  | 'Sekretariat'
  | 'AV_IT'              // Abteilungsvorstand Informatik & IT-Medientechnik
  | 'AV_EL'              // Abteilungsvorstand Elektronik & Medizintechnik
  | 'Werkstaettenleiter'
  | 'KV_Beispiel'        // Beispiel-Klassenvorstand
  | 'Lehrer_Beispiel'
  | 'Schueler_Beispiel';

const USERS: Record<UserKey, any> = {
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
  },
  AV_IT: {
    name: 'AV Informatik & IT-Medientechnik',
    preferred_username: 'av_it',
    email: 'av.it@htl-leonding.ac.at',
    given_name: 'AV',
    family_name: 'IT',
    sub: 'av-it-uid'
  },
  AV_EL: {
    name: 'AV Elektronik & Medizintechnik',
    preferred_username: 'av_el',
    email: 'av.el@htl-leonding.ac.at',
    given_name: 'AV',
    family_name: 'EL',
    sub: 'av-el-uid'
  },
  Werkstaettenleiter: {
    name: 'Werkstättenleiter',
    preferred_username: 'werkstaettenleiter',
    email: 'werkstaettenleiter@htl-leonding.ac.at',
    given_name: 'WL',
    family_name: '',
    sub: 'wl-uid'
  },
  KV_Beispiel: {
    // Wenn du später echte Klassenkürzel willst, einfach z.B. "KV_5AHITM" anlegen
    name: 'KV_Beispiel',
    preferred_username: 'kv_beispiel',
    email: 'kv.beispiel@htl-leonding.ac.at',
    given_name: 'KV',
    family_name: 'Beispiel',
    sub: 'kv-bsp-uid'
  },
  Lehrer_Beispiel: {
    name: 'Lehrer_Beispiel',
    preferred_username: 'lehrer_beispiel',
    email: 'lehrer.beispiel@htl-leonding.ac.at',
    given_name: 'L',
    family_name: 'Beispiel',
    sub: 'lehrer-bsp-uid'
  },
  Schueler_Beispiel: {
    name: 'Schueler_Beispiel',
    preferred_username: 'schueler_beispiel',
    email: 'schueler.beispiel@htl-leonding.ac.at',
    given_name: 'S',
    family_name: 'Beispiel',
    sub: 'schueler-bsp-uid'
  }
};

@Injectable({ providedIn: 'root' })
export class MockOidcSecurityService {
  private userDataSubject = new BehaviorSubject<any>(
    USERS[(localStorage.getItem('mockUserKey') as UserKey) || 'Jakob']
  );

  get userData$(): Observable<any> {
    return this.userDataSubject.asObservable();
  }

  checkAuth(): Observable<{ isAuthenticated: boolean; userData: any; accessToken: string; idToken: string }> {
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

  authorizeWithPopUp(): Observable<{ isAuthenticated: boolean; userData: any; accessToken: string; errorMessage: string }> {
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

  // ✅ Neue Version: flexible UserKeys + Persistenz
  switchUser(userKey: UserKey) {
    const user = USERS[userKey];
    if (!user) return;
    localStorage.setItem('mockUserKey', userKey);
    this.userDataSubject.next(user);
  }

  // Für das Menü (dynamische Buttons)
  getKnownUsers(): { key: UserKey; label: string }[] {
    return (Object.keys(USERS) as UserKey[]).map((key) => ({ key, label: USERS[key].name }));
  }
}