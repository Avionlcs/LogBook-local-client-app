import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: 'app-date-time-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './date-time-picker.component.html',
  styleUrls: ['./date-time-picker.component.scss']
})
export class DateTimePickerComponent implements OnInit {
  currentYear = new Date().getFullYear();
  years = Array.from(
    { length: Math.max(0, this.currentYear - 2025 + 1) },
    (_, i) => 2025 + i
  );
  months = Array.from({ length: 12 }, (_, i) => i + 1);
  hours = Array.from({ length: 24 }, (_, i) => i);
  minutes = Array.from({ length: 60 }, (_, i) => i);
  seconds = Array.from({ length: 60 }, (_, i) => i);
  milliseconds = Array.from({ length: 10 }, (_, i) => i * 100);

  selectedYear: number | null = null;
  selectedMonth: number | null = null;
  selectedDay: number | null = null;
  selectedHour: number | null = null;
  selectedMinute: number | null = null;
  selectedSecond: number | null = null;
  selectedMillisecond: number | null = null;

  days: number[] = [];

  @Input() elementKey: string = 'created';
  @Input() set initialValue(value: string | null) {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        this.selectedYear = date.getFullYear();
        this.selectedMonth = date.getMonth() + 1;
        this.selectedDay = date.getDate();
        this.selectedHour = date.getHours();
        this.selectedMinute = date.getMinutes();
        this.selectedSecond = date.getSeconds();
        this.selectedMillisecond = Math.floor(date.getMilliseconds() / 100) * 100;
        this.updateDays();
      }
    }
  }

  @Output() valueChange = new EventEmitter<any>();

  ngOnInit() {
    // Default date = today (only date, no time)
    if (this.selectedYear === null && this.selectedMonth === null && this.selectedDay === null) {
      const today = new Date();
      this.selectedYear = today.getFullYear();
      this.selectedMonth = today.getMonth() + 1;
      this.updateDays();
      this.selectedDay = today.getDate();

      // Keep time fields empty
      this.selectedHour = null;
      this.selectedMinute = null;
      this.selectedSecond = null;
      this.selectedMillisecond = null;
    }
  }

  onChange(field: string) {
    if (field === 'year' || field === 'month') {
      this.updateDays();
    }
    this.emitValue();
  }

  updateDays() {
    if (this.selectedYear && this.selectedMonth) {
      const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
      this.days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    } else {
      this.days = [];
    }
  }

  emitValue() {
    const parts: string[] = [];

    // Build only for selected fields
    if (this.selectedYear !== null)
      parts.push(`${this.elementKey}y${this.selectedYear}`);

    if (this.selectedMonth !== null)
      parts.push(`${this.elementKey}m${String(this.selectedMonth).padStart(2, '0')}`);

    if (this.selectedDay !== null) {
      const weekOfMonth = Math.ceil(this.selectedDay / 7);
      parts.push(`${this.elementKey}w${weekOfMonth}`);
      parts.push(`${this.elementKey}d${String(this.selectedDay).padStart(2, '0')}`);
    }

    if (this.selectedHour !== null)
      parts.push(`${this.elementKey}h${String(this.selectedHour).padStart(2, '0')}`);

    if (this.selectedMinute !== null)
      parts.push(`${this.elementKey}mm${String(this.selectedMinute).padStart(2, '0')}`);

    if (this.selectedSecond !== null)
      parts.push(`${this.elementKey}ss${String(this.selectedSecond).padStart(2, '0')}`);

    if (this.selectedMillisecond !== null)
      parts.push(`${this.elementKey}ms${String(this.selectedMillisecond).padStart(3, '0')}`);

    // If all null, emit empty string
    this.valueChange.emit(parts.length > 0 ? parts.join(' ') : '');
  }
}
