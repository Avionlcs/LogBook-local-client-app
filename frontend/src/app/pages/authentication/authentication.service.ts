import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { RequestsService } from '../../services/requests.service';
import * as CryptoJS from 'crypto-js';


@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  public storedTheme: any;

  constructor(private http: HttpClient, private requests: RequestsService) { }

  isLoggedIn(): any {

    const token = localStorage.getItem('authToken');

    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        return decodedToken;
      } catch (error) {
        console.error('Error decoding token', error);
        return false;
      }
    } else {
      return false;
    }
  }

  getUserDetails(entity: string): Observable<any> {
    const decodedToken = this.isLoggedIn();

    if (decodedToken && decodedToken.id) {
      const url = `/profile`;
      return this.http.get(url).pipe(
        catchError((error) => {
          console.error('Error fetching user details:', error);

          console.log('2');

          return of(null);
        })
      );
    } else {
      console.log('1');

      this.signOut();
      return of(null);
    }
  }

  signOut(): void {
    localStorage.removeItem('authToken');
  }

  hasPermission(permission: string): Observable<boolean> {
    return this.getUserPermissions().pipe(
      map((permissions: string[]) => {
        return permissions.includes(permission);
      }),
      catchError((error) => {
        console.error('Error checking permission:', error);
        return of(false);
      })
    );
  }

  reverseProfileToken(encryptedToken: string): any {
    try {

      const timeWindow = Math.floor(Date.now() / (3 * 10000));
      const encryptionKey = `${timeWindow} + 1lqTmlabVF5TVdNNSIsImE1Mz`;

      let decrypted: string;
      try {
        decrypted = CryptoJS.AES.decrypt(encryptedToken, encryptionKey).toString(CryptoJS.enc.Utf8);
      } catch {
        decrypted = '';
      }


      if (!decrypted) {
        const prevTimeWindow = timeWindow - 1;
        const prevEncryptionKey = `${prevTimeWindow} + 1lqTmlabVF5TVdNNSIsImE1Mz`;
        try {
          decrypted = (window as any).CryptoJS.AES.decrypt(encryptedToken, prevEncryptionKey).toString((window as any).CryptoJS.enc.Utf8);
        } catch {
          decrypted = '';
        }
      }

      if (!decrypted) {
        throw new Error('Failed to decrypt token');
      }

      const decoded = jwtDecode(decrypted);
      return decoded;
    } catch (error) {
      console.error('Error reversing profile token:', error);
      return null;
    }
  }

  getUserPermissions(): Observable<string[]> {
    return this.getUserDetails('user').pipe(
      switchMap((userData: any) => {
        console.log(userData, '---------------------------------------');

        userData = this.reverseProfileToken(userData.data);
        console.log(userData, '55555555555555555555555555555');


        if (userData && userData.roles) {
          const roleRequests: Observable<string[]>[] = userData.roles.map((role: any) =>
            this.http.get<{ permissions: string[] }>(`/read/roles/${role.id}`).pipe(
              map((roleData) => roleData.permissions || ['signin', 'signup', 'signout']),
              catchError((error) => {
                console.error(`Error fetching permissions for role ${role.id}:`, error);
                return of(['signin', 'signup', 'signout']);
              })
            )
          );

          return forkJoin(roleRequests).pipe(
            map((permissionsArrays: string[][]) => permissionsArrays.flat())
          );
        }

        return of(['signin', 'signup', 'signout']);
      }),
      catchError((error) => {
        console.error('Error fetching user permissions:', error);
        return of(['signin', 'signup', 'signout']);
      })
    );
  }


  storeTheme(theme: any): void {
    this.storedTheme = theme;
    localStorage.setItem('theme', JSON.stringify(theme));
  }

  getStoredTheme(): any {
    if (this.storedTheme) {
      return this.storedTheme;
    }
    const themeFromStorage = localStorage.getItem('theme');
    this.storedTheme = themeFromStorage ? JSON.parse(themeFromStorage) : null;

    return this.storedTheme;
  }

}
