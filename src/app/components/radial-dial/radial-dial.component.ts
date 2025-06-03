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
      baseSize = 1200;
    } else if (window.innerWidth >= 1200) {
      baseSize = 1000;
    } else if (window.innerWidth >= 992) {
      baseSize = 800;
    } else {
      baseSize = Math.min(minDim * 0.8, 800);
    }
    
    this.center = Math.max(150, Math.floor(baseSize / 2));
    this.radius = Math.max(75, Math.floor(baseSize / 4));
    this.ringWidth = Math.max(30, Math.floor(baseSize / 8));
    
    if (window.innerWidth <= 480) {
      this.center = Math.max(100, Math.floor(baseSize / 2));
      this.radius = Math.max(50, Math.floor(baseSize / 4));
      this.ringWidth = Math.max(20, Math.floor(baseSize / 8));
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
    return Math.min(22, Math.max(arcLength / 6, 32));
  }

  // Truncate label if it overflows the arc
  getTruncatedLabel(sector: any): string {
    const arcAngle = sector.endAngle - sector.startAngle;
    const arcLength = ((arcAngle / 360) * 2 * Math.PI * ((sector.innerRadius + sector.outerRadius) / 2));
    const maxChars = Math.floor(arcLength / 12);
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
    return Math.floor(arcLength / 12);
  }

  getMaxCharsPerLineVertical(sector: any): number {
    const arcAngle = sector.endAngle - sector.startAngle;
    const arcLength = ((arcAngle / 360) * 2 * Math.PI * ((sector.innerRadius + sector.outerRadius) / 2));
    return Math.max(3, Math.floor(arcLength / 10));
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
    return Math.min(22, Math.max(20, arcLength / 20));
  }
}