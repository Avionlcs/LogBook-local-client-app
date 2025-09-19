// src/app/features/inventory-reports/services/barcode.service.ts
import { Injectable } from '@angular/core';
import JsBarcode from 'jsbarcode';
import { InventoryReportsComponent } from '../inventory-reports.component';

@Injectable()
export class BarcodeService {
  printBarcode(component: InventoryReportsComponent, operation: any) {
    const { count, width, barcodeType } = component.barcodePrintInfo;
    const barcodes = component.display_table
      .slice(0, count)
      .map((item: any) => String(item.barcode || item.id || ''))
      .filter((barcode: string) => barcode && typeof barcode === 'string');

    const docHtml = this.generateDocHtml(barcodes, width, barcodeType);

    if (operation === 'preview') {
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(docHtml);
        win.document.close();
      }
      return;
    }

    if (operation === 'print') {
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
      if (frameDoc && 'document' in frameDoc) {
        (frameDoc as any).document.open();
        (frameDoc as any).document.write(docHtml);
        (frameDoc as any).document.close();

        (frameDoc as any).focus();
        (frameDoc as any).onload = () => {
          setTimeout(() => {
            (frameDoc as any).print();
            document.body.removeChild(printFrame);
          }, 500);
        };
      } else {
        document.body.removeChild(printFrame);
      }
      return;
    }
  }

  private generateDocHtml(barcodes: string[], width: number, barcodeType: string) {
    return `
    <html>
      <head>
        <style>
            body { margin: 0; padding: 0; }
            .barcode-container { display: flex; flex-wrap: wrap; }
            .barcode-item { display: flex; flex-direction: column; margin: ${width / 20}mm; text-align: center; justify-content: center; }
            .barcode-item img { width: ${width}mm; height: auto; }
            .barcode-item span { display: block; font-size: ${width / 10}mm; }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          ${barcodes.map((barcode: string) => `
            <div class="barcode-item">
              <img src="${this.generateBarcodeURI(barcodeType, barcode)?.img || 'https://barcodeapi.org/api/' + barcodeType + '/' + barcode}" alt="${barcode}" />
              <span>${this.generateBarcodeURI(barcodeType, barcode)?.value || barcode}</span>
            </div>
          `).join('')}
        </div>
      </body>
    </html>
    `;
  }

  generateBarcodeURI(barcodeType: string, value: any) {
    const width = 30;
    const canvas = document.createElement('canvas');
    const dpi = 1000;
    const canvasWidthPx = Math.ceil((width / 25.4) * dpi);
    const minBarWidthMm = 0.19;
    const barWidthPx = Math.ceil((minBarWidthMm / width) * canvasWidthPx);
    const barHeightPx = Math.ceil(canvasWidthPx * 0.3);
    canvas.width = canvasWidthPx;
    canvas.height = barHeightPx + 40;

    const barcodeFormatMapping: any = {
      '128': 'CODE128',
      '13': 'EAN13',
      '8': 'EAN8',
      'a': 'UPC',
      'e': 'UPCE',
      '39': 'CODE39',
      '14': 'ITF14',
      'codabar': 'codabar',
      'msi': 'MSI',
      'pharmacode': 'pharmacode',
      'code128a': 'CODE128A',
      'code128b': 'CODE128B',
      'code128c': 'CODE128C'
    };

    try {
      if (!value || !barcodeFormatMapping[barcodeType]) {
        return null;
      }

      value = this.fixBarcode(value, barcodeType);

      if (barcodeFormatMapping[barcodeType] === undefined) {
        return null;
      }
      JsBarcode(canvas, value, {
        format: barcodeFormatMapping[barcodeType] || 'CODE128',
        width: barWidthPx,
        height: barHeightPx,
        displayValue: false,
        fontSize: 12,
        margin: 10
      });

      return { img: canvas.toDataURL('image/png'), value: value };
    } catch (error) {
      return null;
    } finally {
      canvas.remove();
    }
  }

  private fixBarcode(barcodeValue: string | number, barcodeType: string): string {
    let cleanedValue: string = String(barcodeValue).replace(/\s/g, '');
    barcodeType = barcodeType.toLowerCase();

    const calculateEAN13CheckDigit = (digits: string): number => {
      let sum: number = 0;
      for (let i: number = 0; i < 12; i++) {
        sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
      }
      return (10 - (sum % 10)) % 10;
    };

    const calculateUPCACheckDigit = (digits: string): number => {
      let sum: number = 0;
      for (let i: number = 0; i < 11; i++) {
        sum += parseInt(digits[i]) * (i % 2 === 0 ? 3 : 1);
      }
      return (10 - (sum % 10)) % 10;
    };

    switch (barcodeType) {
      case '13':
      case 'ean-13':
        if (/^\d{13}$/.test(cleanedValue)) {
          const providedCheckDigit: number = parseInt(cleanedValue[12]);
          const calculatedCheckDigit: number = calculateEAN13CheckDigit(cleanedValue.slice(0, 12));
          if (providedCheckDigit !== calculatedCheckDigit) {
            return cleanedValue.slice(0, 12) + calculatedCheckDigit;
          }
          return cleanedValue;
        } else if (/^\d{12}$/.test(cleanedValue)) {
          return cleanedValue + calculateEAN13CheckDigit(cleanedValue);
        }
        return cleanedValue;

      case 'a':
      case 'upc-a':
        if (/^\d{12}$/.test(cleanedValue)) {
          const providedCheckDigit: number = parseInt(cleanedValue[11]);
          const calculatedCheckDigit: number = calculateUPCACheckDigit(cleanedValue.slice(0, 11));
          if (providedCheckDigit !== calculatedCheckDigit) {
            return cleanedValue.slice(0, 11) + calculatedCheckDigit;
          }
          return cleanedValue;
        } else if (/^\d{11}$/.test(cleanedValue)) {
          return cleanedValue + calculateUPCACheckDigit(cleanedValue);
        }
        return cleanedValue;

      case '8':
      case 'ean-8':
        if (/^\d{8}$/.test(cleanedValue)) {
          return cleanedValue;
        } else if (/^\d{7}$/.test(cleanedValue)) {
          let sum: number = 0;
          for (let i: number = 0; i < 7; i++) {
            sum += parseInt(cleanedValue[i]) * (i % 2 === 0 ? 3 : 1);
          }
          const checkDigit: number = (10 - (sum % 10)) % 10;
          return cleanedValue + checkDigit;
        }
        return cleanedValue;

      case '128':
        if (/^[A-Za-z0-9\s\-\/]+$/.test(cleanedValue)) {
          return cleanedValue;
        }
        return cleanedValue;

      case '39':
        if (/^[A-Z0-9\-.\s\/+$%*]+$/.test(cleanedValue)) {
          return cleanedValue;
        }
        return cleanedValue;
    }

    return cleanedValue;
  }
}