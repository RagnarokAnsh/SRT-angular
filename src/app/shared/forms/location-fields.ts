import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';

import type { LocationCascade, LocationControls } from './location-cascade';
import { ValidationMessagePipe } from './validation-message-pipe';

/** The location selects, down to `levels` deep (1 = country … 5 = sector). */
@Component({
  selector: 'app-location-fields',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    TranslocoPipe,
    ValidationMessagePipe,
  ],
  template: `
    @if (cascade().error(); as error) {
      <div class="error" role="alert">
        <span>{{ 'location.loadFailed' | transloco }} {{ error.messageKey | transloco }}</span>
        <button mat-button type="button" (click)="cascade().reload()">
          <mat-icon svgIcon="refresh" aria-hidden="true" />
          {{ 'common.retry' | transloco }}
        </button>
      </div>
    }
    <div class="form-grid">
      <mat-form-field>
        <mat-label>{{ 'location.country' | transloco }}</mat-label>
        <mat-select [formControl]="controls().country_id">
          @for (item of cascade().countries(); track item.id) {
            <mat-option [value]="item.id">{{ item.name }}</mat-option>
          }
        </mat-select>
        @if (cascade().isLoading('countries')) {
          <mat-hint>{{ 'common.loading' | transloco }}</mat-hint>
        }
        <mat-error>{{ controls().country_id.errors | validationMessage }}</mat-error>
      </mat-form-field>

      @if (levels() >= 2) {
        <mat-form-field>
          <mat-label>{{ 'location.state' | transloco }}</mat-label>
          <mat-select [formControl]="controls().state_id">
            @for (item of cascade().states(); track item.id) {
              <mat-option [value]="item.id">{{ item.name }}</mat-option>
            }
          </mat-select>
          @if (cascade().isLoading('states')) {
            <mat-hint>{{ 'common.loading' | transloco }}</mat-hint>
          } @else if (!controls().country_id.value) {
            <mat-hint>{{ 'location.chooseCountryFirst' | transloco }}</mat-hint>
          }
          <mat-error>{{ controls().state_id.errors | validationMessage }}</mat-error>
        </mat-form-field>
      }

      @if (levels() >= 3) {
        <mat-form-field>
          <mat-label>{{ 'location.district' | transloco }}</mat-label>
          <mat-select [formControl]="controls().district_id">
            @for (item of cascade().districts(); track item.id) {
              <mat-option [value]="item.id">{{ item.name }}</mat-option>
            }
          </mat-select>
          @if (cascade().isLoading('districts')) {
            <mat-hint>{{ 'common.loading' | transloco }}</mat-hint>
          } @else if (!controls().state_id.value) {
            <mat-hint>{{ 'location.chooseStateFirst' | transloco }}</mat-hint>
          }
          <mat-error>{{ controls().district_id.errors | validationMessage }}</mat-error>
        </mat-form-field>
      }

      @if (levels() >= 4) {
        <mat-form-field>
          <mat-label>{{ 'location.project' | transloco }}</mat-label>
          <mat-select [formControl]="controls().project">
            @for (item of cascade().projects(); track item) {
              <mat-option [value]="item">{{ item }}</mat-option>
            }
          </mat-select>
          @if (cascade().isLoading('projects')) {
            <mat-hint>{{ 'common.loading' | transloco }}</mat-hint>
          } @else if (!controls().district_id.value) {
            <mat-hint>{{ 'location.chooseDistrictFirst' | transloco }}</mat-hint>
          }
          <mat-error>{{ controls().project.errors | validationMessage }}</mat-error>
        </mat-form-field>
      }

      @if (levels() >= 5) {
        <mat-form-field>
          <mat-label>{{ 'location.sector' | transloco }}</mat-label>
          <mat-select [formControl]="controls().sector">
            @for (item of cascade().sectors(); track item) {
              <mat-option [value]="item">{{ item }}</mat-option>
            }
          </mat-select>
          @if (cascade().isLoading('sectors')) {
            <mat-hint>{{ 'common.loading' | transloco }}</mat-hint>
          } @else if (!controls().project.value) {
            <mat-hint>{{ 'location.chooseProjectFirst' | transloco }}</mat-hint>
          }
          <mat-error>{{ controls().sector.errors | validationMessage }}</mat-error>
        </mat-form-field>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .error {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      background: var(--color-danger-soft);
      color: #7f1d1d;
      font-size: var(--text-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationFields {
  readonly controls = input.required<LocationControls>();
  readonly cascade = input.required<LocationCascade>();
  readonly levels = input(5);
}
