// src/app/menu/menu.component.ts
import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { MockOidcSecurityService as OidcSecurityService } from '../auth/mock-oidc.service';
import { UserData } from '../data.service';
import type { UserKey } from '../auth/mock-oidc.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: [ './menu.component.css' ]
})
export class MenuComponent implements OnInit {

  userData: UserData | null = null;
  knownUsers: { key: UserKey; label: string }[] = [];

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(map(r => r.matches), shareReplay());

  constructor(private breakpointObserver: BreakpointObserver,
              public oidcSecurityService: OidcSecurityService) {}

  ngOnInit(): void {
    this.oidcSecurityService.checkAuth().subscribe(({ userData }) => {
      this.userData = userData;
    });

    this.oidcSecurityService.userData$.subscribe(u => this.userData = u);
    this.knownUsers = this.oidcSecurityService.getKnownUsers();
  }

  logout(): void {
    this.oidcSecurityService.logoff().subscribe(() => this.userData = null);
  }

  login(): void {
    this.oidcSecurityService.authorizeWithPopUp().subscribe(({ userData }) => this.userData = userData);
  }

  switchUser(userKey: UserKey): void {
    this.oidcSecurityService.switchUser(userKey);
    // checkAuth sorgt dafür, dass Komponenten, die auf userData$ hören, updaten
    this.oidcSecurityService.checkAuth().subscribe(({ userData }) => {
      this.userData = userData;
    });
  }
}