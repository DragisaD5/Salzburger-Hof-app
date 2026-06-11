import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  form = { username: '', password: '' };
  showPassword = false;
  loading = signal(false);
  error = signal('');

  readonly hints = [
    { role: 'Admin',        icon: '⬡', username: 'admin',          password: 'Admin1234!' },
    { role: 'Receptionist', icon: '🛎', username: 'lukas.weber',    password: 'Staff1234!' },
    { role: 'Housekeeping', icon: '🧹', username: 'maria.steiner',  password: 'Staff1234!' },
    { role: 'Maintenance',  icon: '🔧', username: 'thomas.huber',   password: 'Staff1234!' },
    { role: 'Guest',        icon: '🏨', username: 'guest.room201',  password: 'Guest1234!' },
  ];

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn()) {
      this.auth.redirectToDashboard();
    }
  }

  fillCredentials(username: string, password: string): void {
    this.form.username = username;
    this.form.password = password;
    this.error.set('');
  }

  onLogin(): void {
    if (!this.form.username || !this.form.password) {
      this.error.set('Please enter your username and password.');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.form.username, this.form.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.auth.redirectToDashboard();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Invalid credentials. Please try again.');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
