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

placeholderColors: string[] = [
  // Pinks & Roses
  '#FFD1DC','#FFB7C5','#FFCCE5','#FEC8D8','#FAD2E1',
  '#F9C6CF','#F7A8B8','#FBB1BD','#FFACC5','#FFB3BA',
  // Purples & Lavenders
  '#E0BBE4','#D5AAFF','#CDB4DB','#DEC9E9','#E6CCFF',
  '#D0B3FF','#C8A2C8','#BFA2DB','#E5B9FF','#E3CFFF',
  // Blues & Aquas
  '#BAE1FF','#A0E7E5','#B5DEFF','#B2F2FF','#C7CEEA',
  '#9ADCFF','#AEE2FF','#A7D8F0','#B3E5FC','#C4FAF8',
  // Greens & Mint
  '#BAFFC9','#B5EAD7','#C8E6C9','#D0F4DE','#C1FBA4',
  '#C8FFD4','#B9FBC0','#CBF3F0','#D2FFDC','#C5FAD5',
  // Yellows & Creams
  '#FFFFBA','#FFF5BA','#FFFACD','#FAF3B6','#FFF4BD',
  '#FFFAC2','#FEF9C3','#FDFD96','#FFFDD0','#FFFDC1',
  // Oranges & Corals
  '#FFDAB9','#FFD1BA','#FFD8B1','#FFE0B2','#FEC89A',
  '#FFE4B5','#FFDFBA','#FFCCB6','#FFD6A5','#FEEBC8',
  // Neutrals & Soft Grays
  '#F5F5F5','#F0F0F0','#EDE7F6','#ECEFF1','#E0E0E0',
  '#F8F9FA','#FAF9F6','#ECE2E1','#EEE5E9','#E8EAF6',
  // Mixed Pastel Tones
  '#FFCCE7','#FBCFE8','#E0F2FE','#DBEAFE','#C7D2FE',
  '#FDE2E4','#FDE7E7','#FDF2F8','#F1F5F9','#F9FAFB',
  '#DCFCE7','#ECFDF5','#E0F7FA','#E3F2FD','#E8F5E9',
  '#FFF0F5','#FFE4E1','#FFF8E7','#FAEBD7','#F5FFFA',
  '#FFFAF0','#FFF8F0','#F0FFF4','#F0F8FF','#F8F4FF'
];



getPlaceholderColor(name: string): string {
  if (!name) return '#d1d5db';
  const index = name.charCodeAt(0) % this.placeholderColors.length;
  return this.placeholderColors[index];
}

}
