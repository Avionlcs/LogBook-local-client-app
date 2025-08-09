import { Component } from '@angular/core';
import { DisplayComponent } from './display/display.component';
import { CounterComponent } from './counter/counter.component';

@Component({
  selector: 'app-sales-v2',
  standalone: true,
  imports: [DisplayComponent, CounterComponent],
  templateUrl: './sales-v2.component.html',
  styleUrl: './sales-v2.component.scss'
})
export class SalesV2Component {

}
