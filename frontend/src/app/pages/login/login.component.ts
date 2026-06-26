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
  successMsg = signal('');

  isRegisterMode = signal(false);
  registerForm = { username: '', password: '', displayName: '', email: '', phone: '' };

  readonly hints = [
    { role: 'Admin',        icon: '◆', username: 'admin',          password: 'Admin1234!' },
    { role: 'Receptionist', icon: '⚜', username: 'lukas.weber',    password: 'Staff1234!' },
    { role: 'Housekeeping', icon: '✿', username: 'maria.steiner',  password: 'Staff1234!' },
    { role: 'Maintenance',  icon: '⚙', username: 'thomas.huber',   password: 'Staff1234!' },
    { role: 'Guest',        icon: '♨', username: 'guest.room201',  password: 'Guest1234!' },
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
    this.successMsg.set('');

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

  onRegister(): void {
    if (!this.registerForm.username || !this.registerForm.password || !this.registerForm.displayName || !this.registerForm.email || !this.registerForm.phone) {
      this.error.set('Please fill out all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.registerForm.email)) {
      this.error.set('Please enter a valid email address.');
      return;
    }

    const phoneRegex = /^\d+$/;
    if (!phoneRegex.test(this.registerForm.phone)) {
      this.error.set('Phone number must contain numbers only.');
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(this.registerForm.password)) {
      this.error.set('Password must be at least 8 characters long, contain at least one uppercase letter and one number.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.successMsg.set('');

    this.auth.register(this.registerForm).subscribe({
      next: () => {
        this.loading.set(false);
        this.isRegisterMode.set(false);
        this.error.set('');
        this.successMsg.set('Registration successful. You can now log in to proceed with booking your room.');
        this.registerForm = { username: '', password: '', displayName: '', email: '', phone: '' };
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to register. Please try again.');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
