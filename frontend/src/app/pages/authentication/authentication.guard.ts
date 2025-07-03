import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthenticationService } from './authentication.service';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationGuard implements CanActivate {

  constructor(private authService: AuthenticationService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const isLoggedIn = this.authService.isLoggedIn();
    const currentRoute = state.url;
    const SIGNIN_ROUTE = '/signin';
    const SIGNUP_ROUTE = '/signup';
    const HOME_ROUTE = '/home';
    const UNAUTHORIZED_ROUTE = '/unauthorized';

    const redirectToAvailablePermission = (): Observable<boolean> => {
      return this.authService.getUserPermissions().pipe(
        tap((availablePermissions: string[]) => {


          if (availablePermissions.length > 0 && availablePermissions[0] !== 'signin' && availablePermissions[1] !== 'signup') {
            this.router.navigate([`/${availablePermissions[0]}`]);
          } else {
            this.router.navigate([UNAUTHORIZED_ROUTE]);
          }
        }),
        map(() => false)
      );
    };

    if (isLoggedIn && (currentRoute === SIGNIN_ROUTE || currentRoute === SIGNUP_ROUTE)) {
      return redirectToAvailablePermission();
    }

    if (!isLoggedIn && currentRoute !== SIGNIN_ROUTE && currentRoute !== SIGNUP_ROUTE) {
      this.router.navigate([SIGNIN_ROUTE]);
      return of(false);
    }
    const requiredPermission = currentRoute.replace(/^\//, '');
    return this.authService.hasPermission(requiredPermission).pipe(
      switchMap((hasPerm: boolean) => {
        if (!hasPerm) {
          return redirectToAvailablePermission();
        }
        return of(true);
      }),
      catchError(() => {
        this.router.navigate([UNAUTHORIZED_ROUTE]);
        return of(false);
      })
    );
  }


}
