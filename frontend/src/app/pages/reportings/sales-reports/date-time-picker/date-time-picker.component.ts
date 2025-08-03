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
  years: number[] = Array.from(
    { length: Math.max(0, this.currentYear - 2025 + 5) },
    (_, i) => 2025 + i
  );
  months: number[] = Array.from({ length: 12 }, (_, i) => i + 1);
  hours: number[] = Array.from({ length: 24 }, (_, i) => i);
  minutes: number[] = Array.from({ length: 60 }, (_, i) => i);
  seconds: number[] = Array.from({ length: 60 }, (_, i) => i);
  milliseconds: number[] = Array.from({ length: 10 }, (_, i) => i * 100);
  days: number[] = [];
  weeks: number[] = [];

  selectedYear: number | null = null;
  selectedMonth: number | null = null;
  selectedWeek: number | null = null;
  selectedDay: number | null = null;
  selectedHour: number | null = null;
  selectedMinute: number | null = null;
  selectedSecond: number | null = null;
  selectedMillisecond: number | null = null;

  @Input() elementKey: string = 'created';
  @Input() set initialValue(value: string | null) {
    if (value && this.isValidDateString(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        this.selectedYear = date.getFullYear();
        this.selectedMonth = date.getMonth() + 1;
        this.selectedDay = date.getDate();
        this.selectedWeek = this.calculateWeek(date);
        this.selectedHour = date.getHours();
        this.selectedMinute = date.getMinutes();
        this.selectedSecond = date.getSeconds();
        this.selectedMillisecond = Math.floor(date.getMilliseconds() / 100) * 100;
        this.updateDays();
        console.log(`Parsed input ${value} to local date: ${date.toString()}`);
      }
    }
  }

  @Output() valueChange = new EventEmitter<string>();

  ngOnInit() {
    if (!this.selectedYear && !this.selectedMonth && !this.selectedDay) {
      const today = new Date();
      this.selectedYear = today.getFullYear();
      this.selectedMonth = today.getMonth() + 1;
      this.updateDays();
      this.selectedDay = today.getDate();
      this.selectedWeek = this.calculateWeek(today);
    }
  }

  private isValidDateString(value: string): boolean {
    return !isNaN(Date.parse(value));
  }

  private calculateWeek(date: Date): number {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    return Math.ceil((dayOfMonth + firstDayOfMonth.getDay()) / 7);
  }

  onChange(field: string) {
    if (field === 'year' || field === 'month') {
      this.updateDays();
      if (this.selectedDay && this.days.length && this.selectedDay > this.days.length) {
        this.selectedDay = this.days.length;
      }
    }

    if (field === 'day' && this.selectedDay !== null) {
      const tempDate = new Date(this.selectedYear ?? this.currentYear,
        (this.selectedMonth ?? 1) - 1,
        this.selectedDay);
      this.selectedWeek = this.calculateWeek(tempDate);
    } else if (field === 'week' && this.selectedWeek !== null) {
      const firstDayOfWeek = (this.selectedWeek - 1) * 7 + 1;
      this.selectedDay = Math.min(firstDayOfWeek, this.days.length);
    }

    this.emitValue();
  }

  updateDays() {
    if (this.selectedYear && this.selectedMonth) {
      const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
      this.days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      this.weeks = Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, i) => i + 1);

      if (this.selectedWeek && this.selectedWeek > this.weeks.length) {
        this.selectedWeek = this.weeks.length;
      }
    } else {
      this.days = [];
      this.weeks = [];
      this.selectedWeek = null;
      this.selectedDay = null;
    }
  }

  emitValue() {
    if (!this.selectedYear || !this.selectedMonth || !this.selectedDay) {
      this.valueChange.emit('');
      return;
    }

    // Create a local date using the selected values (interpreted as local time)
    const localDate = new Date(
      this.selectedYear,
      (this.selectedMonth - 1),
      this.selectedDay,
      this.selectedHour ?? 0,
      this.selectedMinute ?? 0,
      this.selectedSecond ?? 0,
      this.selectedMillisecond ?? 0
    );

    // Debug log to verify local date and timezone offset
    console.log(`Local date before conversion: ${localDate.toString()}`);
    console.log(`Timezone offset: ${localDate.getTimezoneOffset()} minutes`);

    // Convert to UTC by adding the timezone offset (in milliseconds)
    // getTimezoneOffset() returns negative minutes for timezones ahead of UTC (e.g., -330 for IST)
    const utcDate = new Date(localDate.getTime() + (localDate.getTimezoneOffset() * 60000));

    // Debug log to verify UTC conversion
    console.log(`Converted to UTC: ${utcDate.toUTCString()}`);

    // Format the output string using UTC values
    const parts: string[] = [
      `${this.elementKey}y${utcDate.getUTCFullYear()}`,
      `${this.elementKey}m${String(utcDate.getUTCMonth() + 1).padStart(2, '0')}`,
      `${this.elementKey}d${String(utcDate.getUTCDate()).padStart(2, '0')}`
    ];

    if (this.selectedWeek !== null) {
      parts.splice(2, 0, `${this.elementKey}w${this.selectedWeek}`);
    }

    if (this.selectedHour !== null || this.selectedMinute !== null) {
      parts.push(`${this.elementKey}h${String(utcDate.getUTCHours()).padStart(2, '0')}`);
      // Always include minutes, even if 0
      parts.push(`${this.elementKey}mm${String(utcDate.getUTCMinutes()).padStart(2, '0')}`);
    }

    if (this.selectedSecond !== null) {
      parts.push(`${this.elementKey}ss${String(utcDate.getUTCSeconds()).padStart(2, '0')}`);
    }
    if (this.selectedMillisecond !== null) {
      parts.push(`${this.elementKey}ms${String(utcDate.getUTCMilliseconds()).padStart(3, '0')}`);
    }

    const emittedValue = parts.join(' ');
    console.log(`Emitted value: ${emittedValue}`);
    this.valueChange.emit(emittedValue);
  }
}