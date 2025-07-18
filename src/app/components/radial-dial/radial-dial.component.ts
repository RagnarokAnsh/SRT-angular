import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Competency {
  name: string;
}

interface SubDomain {
  name: string;
  competencies: Competency[];
}

interface Domain {
  name: string;
  subDomains: SubDomain[];
}

interface SunburstSector {
  label: string;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  level: number;
  color: string;
  textAnchor: string;
  textRotation: number;
  cx: number;
  cy: number;
  domainIdx?: number;
  subDomainIdx?: number;
  compIdx?: number;
}

@Component({
  selector: 'app-radial-dial',
  templateUrl: './radial-dial.component.html',
  styleUrls: ['./radial-dial.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class RadialDialComponent implements OnInit {
  // Compact and responsive
  center = 400;
  radius = 200;
  ringWidth = 80;
  colors = [
    '#e74c3c', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#16a085', '#d35400', '#2c3e50'
  ];

  // Interactive state
  expandedLevel: 'domain' | 'competency' = 'domain';
  hoveredDomainIdx: number | null = null;
  isTouchDevice: boolean = false;

  domains: {
    name: string;
    competencies: string[];
  }[] = [
    {
      name: 'Cognitive Development',
      competencies: ['Classification', 'Patterns', 'Number concept', 'Seriation']
    },
    {
      name: 'Language and Literacy Development',
      competencies: ['Vocabulary and exp.', 'Listening comprehension', 'Emergent reading', 'Emergent writing']
    },
    {
      name: 'Physical and Motor Development',
      competencies: ['Gross motor', 'Fine motor']
    },
    {
      name: 'Socio-Emotional Development',
      competencies: ['Interaction', 'Sharing with others', 'Emotional expression ']
    },
    {
      name: 'Approaches towards Learning',
      competencies: ['Initiative', 'Task persistence']
    },
    {
      name: 'Creativity Development',
      competencies: ['Creative expression', 'Imagination']
    }
  ];

  ngOnInit(): void {
    this.updateDialSize();
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.updateDialSize();
  }

  updateDialSize() {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const minDim = Math.min(containerWidth, containerHeight);
    
    let baseSize;
    if (window.innerWidth >= 1600) {
      baseSize = 1000;
    } else if (window.innerWidth >= 1200) {
      baseSize = 800;
    } else if (window.innerWidth >= 992) {
      baseSize = 800;
    } else if (window.innerWidth >= 768) {
      baseSize = 800;
    } else if (window.innerWidth >= 426) {
      baseSize = Math.min(minDim * 0.8, 500);
    } else {
      // Mobile screens below 426px
      baseSize = Math.min(minDim * 0.9, 400);
    }
    
    this.center = Math.max(150, Math.floor(baseSize / 2));
    this.radius = Math.max(75, Math.floor(baseSize / 4));
    this.ringWidth = Math.max(30, Math.floor(baseSize / 8));
    
    // Special handling for very small screens
    if (window.innerWidth <= 425) {
      this.center = Math.max(175, Math.floor(baseSize / 2));
      this.radius = Math.max(85, Math.floor(baseSize / 4));
      this.ringWidth = Math.max(35, Math.floor(baseSize / 8));
    }
    
    // Extra small mobile screens
    if (window.innerWidth <= 375) {
      this.center = Math.max(150, Math.floor(baseSize / 2));
      this.radius = Math.max(70, Math.floor(baseSize / 4));
      this.ringWidth = Math.max(30, Math.floor(baseSize / 8));
    }
    
    // Very small mobile screens
    if (window.innerWidth <= 320) {
      this.center = Math.max(140, Math.floor(baseSize / 2));
      this.radius = Math.max(65, Math.floor(baseSize / 4));
      this.ringWidth = Math.max(25, Math.floor(baseSize / 8));
    }
  }

  // Geometry helpers
  polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle - 90) * Math.PI / 180.0;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  describeArc(cx: number, cy: number, r1: number, r2: number, startAngle: number, endAngle: number) {
    const startOuter = this.polarToCartesian(cx, cy, r2, endAngle);
    const endOuter = this.polarToCartesian(cx, cy, r2, startAngle);
    const startInner = this.polarToCartesian(cx, cy, r1, endAngle);
    const endInner = this.polarToCartesian(cx, cy, r1, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', startOuter.x, startOuter.y,
      'A', r2, r2, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
      'L', endInner.x, endInner.y,
      'A', r1, r1, 0, largeArcFlag, 1, startInner.x, startInner.y,
      'Z'
    ].join(' ');
  }

  getDomainSectors(): any[] {
    const cx = this.center;
    const cy = this.center;
    const domainCount = this.domains.length;
    let angle = 0;
    const sectors: any[] = [];
    this.domains.forEach((domain, dIdx) => {
      const domainAngle = 360 / domainCount;
      const domainStart = angle;
      const domainEnd = angle + domainAngle;
      sectors.push({
        label: domain.name,
        startAngle: domainStart,
        endAngle: domainEnd,
        innerRadius: this.ringWidth,
        outerRadius: this.ringWidth * 2,
        color: this.colors[dIdx % this.colors.length],
        cx, cy,
        domainIdx: dIdx
      });
      angle += domainAngle;
    });
    return sectors;
  }

  getCompetencySectors(domainIdx: number): any[] {
    const cx = this.center;
    const cy = this.center;
    const domain = this.domains[domainIdx];
    const domainCount = this.domains.length;
    
    const domainAngle = 360 / domainCount;
    const domainStartAngle = domainIdx * domainAngle;
    const domainEndAngle = domainStartAngle + domainAngle;
    
    const competencyCount = domain.competencies.length;
    const competencyAngle = domainAngle / competencyCount;
    
    const sectors: any[] = [];
    domain.competencies.forEach((comp, cIdx) => {
      const startAngle = domainStartAngle + (cIdx * competencyAngle);
      const endAngle = startAngle + competencyAngle;
      
      sectors.push({
        label: comp,
        startAngle: startAngle,
        endAngle: endAngle,
        innerRadius: this.ringWidth * 2,
        outerRadius: this.ringWidth * 4,
        color: this.colors[(domainIdx + 2) % this.colors.length],
        cx, cy,
        domainIdx,
        compIdx: cIdx
      });
    });
    return sectors;
  }

  getArcPath(sector: any) {
    return this.describeArc(
      sector.cx,
      sector.cy,
      sector.innerRadius,
      sector.outerRadius,
      sector.startAngle,
      sector.endAngle
    );
  }

  getTextPosition(sector: any) {
    const angle = (sector.startAngle + sector.endAngle) / 2;
    const r = (sector.innerRadius + sector.outerRadius) / 2;
    const pos = this.polarToCartesian(sector.cx, sector.cy, r, angle);
    return { x: pos.x, y: pos.y, rotation: angle };
  }

  onDomainHover(idx: number) {
    if (this.isTouchDevice) {
      if (this.hoveredDomainIdx === idx) {
        this.onDomainLeave();
      } else {
        this.expandedLevel = 'competency';
        this.hoveredDomainIdx = idx;
      }
    } else {
      this.expandedLevel = 'competency';
      this.hoveredDomainIdx = idx;
    }
  }

  onDomainLeave() {
    if (!this.isTouchDevice) {
      this.expandedLevel = 'domain';
      this.hoveredDomainIdx = null;
    }
  }

  onDomainClick(idx: number) {
    if (this.isTouchDevice) {
      this.onDomainHover(idx);
    }
  }

  // Responsive font size for SVG text
  getResponsiveFontSize(sector: any): number {
    const arcAngle = sector.endAngle - sector.startAngle;
    const arcLength = ((arcAngle / 360) * 2 * Math.PI * ((sector.innerRadius + sector.outerRadius) / 2));
    
    // Better responsive font sizing for mobile
    if (window.innerWidth <= 320) {
      return Math.min(10, Math.max(8, arcLength / 15));
    } else if (window.innerWidth <= 375) {
      return Math.min(12, Math.max(9, arcLength / 12));
    } else if (window.innerWidth <= 425) {
      return Math.min(14, Math.max(10, arcLength / 10));
    } else if (window.innerWidth <= 768) {
      return Math.min(16, Math.max(12, arcLength / 8));
    } else {
      return Math.min(20, Math.max(14, arcLength / 6));
    }
  }

  // Truncate domain label after 2 words for mobile screens
  getTruncatedDomainLabel(sector: any): string {
    const words = sector.label.split(' ');
    
    // For mobile screens, truncate after 2 words
    if (window.innerWidth <= 768) {
      if (words.length > 2) {
        return words.slice(0, 2).join(' ') + '...';
      }
    }
    
    return sector.label;
  }

  // Truncate label if it overflows the arc
  getTruncatedLabel(sector: any): string {
    const arcAngle = sector.endAngle - sector.startAngle;
    const arcLength = ((arcAngle / 360) * 2 * Math.PI * ((sector.innerRadius + sector.outerRadius) / 2));
    
    let maxChars;
    if (window.innerWidth <= 425) {
      maxChars = Math.floor(arcLength / 12);
    } else if (window.innerWidth <= 768) {
      maxChars = Math.floor(arcLength / 14);
    } else {
      maxChars = Math.floor(arcLength / 16);
    }
    
    if (sector.label.length > maxChars) {
      return sector.label.slice(0, Math.max(0, maxChars - 1)) + '…';
    }
    return sector.label;
  }

  // Generate an arc path for text along the arc
  getArcTextPath(sector: any, id: string): string {
    const r = (sector.innerRadius + sector.outerRadius) / 2;
    const start = this.polarToCartesian(sector.cx, sector.cy, r, sector.startAngle);
    const end = this.polarToCartesian(sector.cx, sector.cy, r, sector.endAngle);
    const largeArcFlag = sector.endAngle - sector.startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Split label into lines based on max characters per line
  splitLabelToLines(label: string, maxCharsPerLine: number): string[] {
    const words = label.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += ' ' + word;
      }
    }
    if (currentLine) lines.push(currentLine.trim());
    return lines;
  }

  getMaxCharsPerLine(sector: any): number {
    const arcAngle = sector.endAngle - sector.startAngle;
    const arcLength = ((arcAngle / 360) * 2 * Math.PI * ((sector.innerRadius + sector.outerRadius) / 2));
    
    if (window.innerWidth <= 425) {
      return Math.max(3, Math.floor(arcLength / 12));
    } else if (window.innerWidth <= 768) {
      return Math.max(5, Math.floor(arcLength / 14));
    } else {
      return Math.floor(arcLength / 16);
    }
  }

  getMaxCharsPerLineVertical(sector: any): number {
    const arcAngle = sector.endAngle - sector.startAngle;
    const arcLength = ((arcAngle / 360) * 2 * Math.PI * ((sector.innerRadius + sector.outerRadius) / 2));
    
    if (window.innerWidth <= 425) {
      return Math.max(2, Math.floor(arcLength / 10));
    } else if (window.innerWidth <= 768) {
      return Math.max(3, Math.floor(arcLength / 12));
    } else {
      return Math.max(3, Math.floor(arcLength / 12));
    }
  }

  splitLabelToLinesVertical(label: string): string[] {
    const maxCharsPerLine = 12; 
    const words = label.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (word.length > maxCharsPerLine) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
        for (let i = 0; i < word.length; i += maxCharsPerLine) {
          lines.push(word.slice(i, i + maxCharsPerLine));
        }
      } else if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += (currentLine ? ' ' : '') + word;
      }
    }
    if (currentLine) lines.push(currentLine.trim());
    return lines;
  }

  getCompetencyFontSize(sector: any): number {
    const arcAngle = sector.endAngle - sector.startAngle;
    const arcLength = ((arcAngle / 360) * 2 * Math.PI * ((sector.innerRadius + sector.outerRadius) / 2));
    
    if (window.innerWidth <= 320) {
      return Math.min(10, Math.max(7, arcLength / 35));
    } else if (window.innerWidth <= 375) {
      return Math.min(11, Math.max(8, arcLength / 32));
    } else if (window.innerWidth <= 425) {
      return Math.min(12, Math.max(8, arcLength / 30));
    } else if (window.innerWidth <= 768) {
      return Math.min(14, Math.max(10, arcLength / 25));
    } else {
      return Math.min(18, Math.max(12, arcLength / 20));
    }
  }
}