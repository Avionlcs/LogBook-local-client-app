import { CommonModule } from '@angular/common';
import { Component,Input, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-pie-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pie-chart.component.html',
  styleUrl: './pie-chart.component.scss'
})
export class PieChartComponent implements OnChanges {
  @Input() chartData: { label: string; amount: number; color?: string }[] = [];
  @ViewChild('pieChartCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Default color palette for slices without a valid color
  private defaultColors: string[] = [
    '#FF6384', // Red
    '#36A2EB', // Blue
    '#FFCE56', // Yellow
    '#4BC0C0', // Cyan
    '#9966FF', // Purple
    '#FF9F40', // Orange
    '#E7E9ED', // Light Gray
    '#C3E6CB'  // Light Green
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartData'] && this.canvasRef) {
      this.drawPieChart();
    }
  }

  ngAfterViewInit(): void {
    this.drawPieChart();
  }

  private isValidColor(color: string | undefined): boolean {
    if (!color) return false;
    // Simple check for valid CSS color (hex, rgb, or named colors)
    const testElement = document.createElement('div');
    testElement.style.backgroundColor = color;
    return testElement.style.backgroundColor !== '';
  }

  private getColor(index: number, providedColor: any | undefined): string {
    // Return provided color if valid, else pick from defaultColors
    return this.isValidColor(providedColor)
      ? providedColor
      : this.defaultColors[index % this.defaultColors?.length];
  }

  private drawPieChart(): void {
    if (!this.canvasRef || !this.chartData || this.chartData?.length === 0) return;

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate total amount
    const totalAmount = this.chartData.reduce((sum, item) => sum + Math.max(0, item.amount), 0);
    if (totalAmount === 0) return;

    // Calculate angles and draw slices
    let startAngle = 0;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;

    this.chartData.forEach((item, index) => {
      const sliceAngle = (Math.max(0, item.amount) / totalAmount) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.fillStyle = this.getColor(index, item.color);
      ctx.fill();
      startAngle += sliceAngle;
    });
  }
}