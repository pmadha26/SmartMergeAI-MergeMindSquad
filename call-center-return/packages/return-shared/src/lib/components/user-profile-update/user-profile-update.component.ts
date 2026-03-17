import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserProfileService } from '../../data-service/user-profile.service';
import { validateAndSanitizeProfile } from '../../utils/validation.utils';

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

@Component({
  selector: 'app-user-profile-update',
  templateUrl: './user-profile-update.component.html',
  styleUrls: ['./user-profile-update.component.scss']
})
export class UserProfileUpdateComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  validationErrors: string[] = [];
  isLoading = false;
  isSaving = false;
  successMessage = '';
  userId = 'user123'; // In real app, this would come from auth service
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private userProfileService: UserProfileService
  ) {
    this.profileForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadUserProfile();
    this.setupFormValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      phone: ['', [Validators.required]],
      dateOfBirth: ['', [Validators.required]],
      address: this.fb.group({
        street: ['', [Validators.maxLength(100)]],
        city: ['', [Validators.required, Validators.maxLength(50)]],
        state: ['', [Validators.maxLength(50)]],
        zipCode: ['', [Validators.required]],
        country: ['US', [Validators.required]]
      })
    });
  }

  private setupFormValidation(): void {
    this.profileForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.validateForm();
      });
  }

  private loadUserProfile(): void {
    this.isLoading = true;
    this.userProfileService.getUserProfile(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          this.profileForm.patchValue(profile);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading profile:', error);
          this.validationErrors = ['Failed to load user profile'];
          this.isLoading = false;
        }
      });
  }

  private validateForm(): void {
    this.validationErrors = [];
    
    if (this.profileForm.invalid) {
      return;
    }

    const formValue = this.profileForm.value;
    const result = validateAndSanitizeProfile(formValue);
    
    if (!result.isValid) {
      this.validationErrors = result.errors;
    }
  }

  onSubmit(): void {
    this.successMessage = '';
    this.validationErrors = [];

    this.markFormGroupTouched(this.profileForm);

    if (this.profileForm.invalid) {
      this.validationErrors = ['Please fix the form errors before submitting'];
      return;
    }

    const formValue = this.profileForm.value;
    const validationResult = validateAndSanitizeProfile(formValue);

    if (!validationResult.isValid) {
      this.validationErrors = validationResult.errors;
      return;
    }

    this.isSaving = true;
    this.userProfileService.updateUserProfile(this.userId, validationResult.sanitizedProfile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.successMessage = 'Profile updated successfully!';
          this.isSaving = false;
          
          setTimeout(() => {
            this.successMessage = '';
          }, 5000);
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.validationErrors = error.error?.errors || ['Failed to update profile'];
          this.isSaving = false;
        }
      });
  }

  onValidateOnly(): void {
    this.successMessage = '';
    this.validationErrors = [];

    this.markFormGroupTouched(this.profileForm);

    const formValue = this.profileForm.value;
    const validationResult = validateAndSanitizeProfile(formValue);

    if (validationResult.isValid) {
      this.successMessage = 'All fields are valid!';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } else {
      this.validationErrors = validationResult.errors;
    }
  }

  onReset(): void {
    this.profileForm.reset();
    this.validationErrors = [];
    this.successMessage = '';
    this.loadUserProfile();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} is too short`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
      if (field.errors['email']) return 'Invalid email format';
    }
    return '';
  }
}

// Made with Bob
