// src/app/features/inventory-reports/services/export/export.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { InventoryReportsComponent } from '../inventory-reports.component';


@Injectable()
export class ExportService {
  constructor(private http: HttpClient) {}

  exportToExcel(component: InventoryReportsComponent) {
    const url = `/read-multiple/range/inventory_items/0/999999999999999`;
    this.http.get<any[]>(url).toPromise()
      .then(response => {
        const data_to_export: any = response;
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data_to_export);
        const workbook: XLSX.WorkBook = {
          Sheets: { 'Inventory Report': worksheet },
          SheetNames: ['Inventory Report']
        };
        const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsFile(excelBuffer, 'Inventory_Report', 'xlsx');
      })
      .catch(error => {
        console.error('Error fetching inventory items', error);
      });
  }

  exportToPDF(component: InventoryReportsComponent) {
    const doc = new jsPDF();
    doc.text('Inventory Report', 14, 20);

    if (component.display_table?.length > 0) {
      const tableColumnHeaders = Object.keys(component.display_table[0]);
      const tableRows = component.display_table.map((item: any) => {
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
    } else {
      console.log('No data available to export.');
    }
  }

  private saveAsFile(buffer: any, fileName: string, fileType: string): void {
    const data: Blob = new Blob([buffer], { type: fileType });
    const link: HTMLAnchorElement = document.createElement('a');
    const url = URL.createObjectURL(data);

    link.href = url;
    link.download = `${fileName}.${fileType}`;
    link.click();
    URL.revokeObjectURL(url);
  }
}