import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }



  const requiredRoles: string[] = route.data?.['roles'];
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = auth.getRole();
    if (!requiredRoles.includes(userRole || '')) {
      router.navigate(['/login']);
      return false;
    }
  }

  return true;
};
