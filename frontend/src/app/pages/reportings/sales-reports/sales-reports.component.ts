import { Component } from '@angular/core';
import { HeaderComponent } from '../../../components/header/header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


@Component({
  selector: 'app-sales-reports',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, CommonModule, FormsModule],
  templateUrl: './sales-reports.component.html',
  styleUrl: './sales-reports.component.scss'
})
export class SalesReportsComponent {
  searchValue: string = '';
  selectedCategory: string = 'current inventory';
  tables: any = {};
  display_table: any = [];

  isDropdownVisible: boolean = false;

  toggleDropdown() {
    this.isDropdownVisible = !this.isDropdownVisible;
  }

  exportOption(format: string) {
    if (format === 'Excel') {
      this.exportToExcel();
    } else if (format === 'PDF') {
      this.exportToPDF();
    }
  }

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.loadTables();
  }

  searchItems() {
    this.searchInventory();
  }

  onSelectCategory(nm: string) {
    this.selectedCategory = nm;
  }

  loadTables() {
    const url = '/api/proxy/read/inventory_items';

    this.http.get<any[]>(url).subscribe({
      next: (response) => {
        this.tables.current_inventory = response;
        this.display_table = response;
      },
      error: (error) => { }
    });
  }

  searchInventory() {
    const searchTerm = this.searchValue.toLowerCase();

    this.display_table = this.tables.current_inventory.filter((item: any) => {
      return Object.keys(item).some((key) => {
        const value = item[key];
        return (
          (typeof value === 'string' && value.toLowerCase().includes(searchTerm)) ||
          (typeof value === 'number' && value.toString().includes(searchTerm))
        );
      });
    });
  }

  exportToExcel() {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.display_table);

    const workbook: XLSX.WorkBook = {
      Sheets: { 'Inventory Report': worksheet },
      SheetNames: ['Inventory Report']
    };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    this.saveAsFile(excelBuffer, 'Inventory_Report', 'xlsx');
  }

  exportToPDF() {
    const doc = new jsPDF();

    doc.text('Inventory Report', 14, 20);

    if (this.display_table.length > 0) {
      const tableColumnHeaders = Object.keys(this.display_table[0]);
      const tableRows = this.display_table.map((item: any) => {
        return tableColumnHeaders.map(header => item[header]);
      });

      const columnStyles = tableColumnHeaders.reduce((acc: any, header, index) => {
        acc[index] = { cellWidth: 30 };
        return acc;
      }, {});

      (doc as any).autoTable({
        head: [tableColumnHeaders],
        body: tableRows,
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133] },
        columnStyles: columnStyles,
        styles: {
          cellPadding: 3,
          fontSize: 10,
        },
      });

      doc.save('Inventory_Report.pdf');
    }
  }

  saveAsFile(buffer: any, fileName: string, fileType: string): void {
    const data: Blob = new Blob([buffer], { type: fileType });
    const link: HTMLAnchorElement = document.createElement('a');
    const url = URL.createObjectURL(data);

    link.href = url;
    link.download = `${fileName}.${fileType}`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
