import { CommonModule, UpperCasePipe } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-thumb',
  standalone: true,
  imports: [CommonModule, UpperCasePipe],
  templateUrl: './thumb.component.html',
  styleUrl: './thumb.component.scss'
})
export class ThumbComponent {
  @Input() item: any = {};

  getPlaceholderColor(): string {
    if (!this.item?.item_name) return '#F5F5F5';

    // Hash id string into a number
    const hash: any = Array.from(this.item.item_name).reduce(
      (acc: any, c: any) => acc + c.charCodeAt(0),
      0
    );

    const hue: number =  hash % 360;

    const saturations: number[] = [50, 55, 60];
    const lightnesses: number[] = [78, 82, 86];

    const sat: number = saturations[hash % saturations.length];
    const light: number = lightnesses[hash % lightnesses.length];

    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }
}
