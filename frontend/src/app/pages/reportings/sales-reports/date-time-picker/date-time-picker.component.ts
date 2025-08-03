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
    if (value) {
      // Parse local date format manually (YYYY-MM-DDTHH:mm:ss.sss or shorter)
      const parts = value.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{3}))?)?$/
      );
      if (parts) {
        const [, y, m, d, hh, mm, ss, ms] = parts;
        const date = new Date(
          Number(y),
          Number(m) - 1,
          Number(d),
          Number(hh || 0),
          Number(mm || 0),
          Number(ss || 0),
          Number(ms || 0)
        );

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

    // Build local date directly
    const localDate = new Date(
      this.selectedYear,
      (this.selectedMonth - 1),
      this.selectedDay,
      this.selectedHour ?? 0,
      this.selectedMinute ?? 0,
      this.selectedSecond ?? 0,
      this.selectedMillisecond ?? 0
    );

    console.log(`Local date: ${localDate.toString()}`);

    // Emit local parts
    const parts: string[] = [
      `${this.elementKey}y${localDate.getFullYear()}`,
      `${this.elementKey}m${String(localDate.getMonth() + 1).padStart(2, '0')}`,
      `${this.elementKey}d${String(localDate.getDate()).padStart(2, '0')}`
    ];

    // if (this.selectedWeek !== null) {
    //   parts.splice(2, 0, `${this.elementKey}w${this.selectedWeek}`);
    // }

    if (this.selectedHour !== null || this.selectedMinute !== null) {
      parts.push(`${this.elementKey}h${String(localDate.getHours()).padStart(2, '0')}`);
      parts.push(`${this.elementKey}mm${String(localDate.getMinutes()).padStart(2, '0')}`);
    }

    if (this.selectedSecond !== null) {
      parts.push(`${this.elementKey}ss${String(localDate.getSeconds()).padStart(2, '0')}`);
    }

    if (this.selectedMillisecond !== null) {
      parts.push(`${this.elementKey}ms${String(localDate.getMilliseconds()).padStart(3, '0')}`);
    }

    const emittedValue = parts.join(' ');
    console.log(`Emitted value (local): ${emittedValue}`);
    this.valueChange.emit(emittedValue);
  }
}
