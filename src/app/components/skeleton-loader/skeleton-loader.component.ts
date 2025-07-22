import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton-loader.component.html',
  styleUrls: ['./skeleton-loader.component.scss']
})
export class SkeletonLoaderComponent {
  /**
   * Type of skeleton: 'rect', 'circle', 'text', or custom
   */
  @Input() type: 'rect' | 'circle' | 'text' = 'rect';
  /**
   * Width of the skeleton (e.g., '100%', '40px')
   */
  @Input() width: string = '100%';
  /**
   * Height of the skeleton (e.g., '20px', '2rem')
   */
  @Input() height: string = '20px';
  /**
   * Border radius for rectangles
   */
  @Input() borderRadius: string = 'var(--border-radius-sm)';
  /**
   * Number of skeleton lines (for text type)
   */
  @Input() lines: number = 1;
  /**
   * Animation speed in seconds
   */
  @Input() shimmerSpeed: number = 1.2;
  /**
   * Skeleton variant for special layouts: 'table-row', 'button', or undefined
   */
  @Input() variant?: 'table-row' | 'button';
} 