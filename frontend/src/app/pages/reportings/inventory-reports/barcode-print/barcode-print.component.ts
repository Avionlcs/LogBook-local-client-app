import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-barcode-print',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './barcode-print.component.html',
  styleUrl: './barcode-print.component.scss'
})
export class BarcodePrintComponent {
  @Input() data: any = [];
  @Input() lengthData: any;
  search: string = '';
  min_stock: any;
  maxStock: string = '';
  buy_price: string = '';
  sale_price: string = '';
  last_updated: string = '';
  barcodeCount: string = '';
  barcodeWidth: string = '';
  pageWidth: string = '';
  pageHeight: string = '';
  pageCount: string = '';
  selectAllBarcodes: boolean = false;
  barcodeType: string = 'code128';
  out_data: any;
  @Output() outData = new EventEmitter<any>();

  onDataChange() {
    let dt = this.out_data;
    this.outData.emit(dt);
    console.log('...... ... ');

  }


  handleBarcodeTypeChange() {

  }

  getDataByKeyValue(key: string, partialValue: string) {
    if (!Array.isArray(this.data) || !key || !partialValue) return [];
    const lowerPartial = partialValue.toLowerCase();
    this.out_data = this.data.filter(item =>
      typeof item[key] === 'string' && item[key].toLowerCase().includes(lowerPartial)
    );
    this.onDataChange();
    return
  }


  onSearchKeywords() {
    // Your search logic here
  }

  handleSearchChange() {
    // handle search input change logic here
  }

  handlemin_stockChange() {
    console.log('///////// ');

    this.out_data = this.data.filter((item: any) =>
      typeof item['min_stock'] == 'number' && item['min_stock'] >= this.min_stock
    );
    this.onDataChange();
    return
    // handle min_stock input change logic here
  }

  handleMaxStockChange() {
    // handle maxStock input change logic here
  }

  handlebuy_priceChange() {
    // handle buy_price input change logic here
  }

  handlesale_priceChange() {
    // handle sale_price input change logic here
  }

  handlelast_updatedChange() {
    // handle last_updated input change logic here
  }

  handleBarcodeCountChange() {
    // handle barcodeCount input change logic here
  }

  handleBarcodeWidthChange() {
    // handle barcodeWidth input change logic here
  }

  handlePageWidthChange() {
    // handle pageWidth input change logic here
  }

  handlePageHeightChange() {
    // handle pageHeight input change logic here
  }

  handlePageCountChange() {
    // handle pageCount input change logic here
  }

  applyFilters() {
    // Your apply filters logic here
  }
  resetFilters() {
    this.search = '';
    this.min_stock = '';
    this.maxStock = '';
    this.buy_price = '';
    this.sale_price = '';
    this.last_updated = '';
    this.barcodeCount = '';
    this.barcodeWidth = '';
    this.pageWidth = '';
    this.pageHeight = '';
    this.pageCount = '';
  }
  async printBarcode() {
    // Import jsPDF and bwip-js dynamically to avoid issues with SSR or Angular build
    const { jsPDF } = await import('jspdf');
    const bwipjs = await import('bwip-js');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const marginLeft = 10;
    const marginTop = 10;
    const barcodeWidth = 50;
    const barcodeHeight = 20;
    const gapY = 10;
    const gapX = 10;
    let x = marginLeft;
    let y = marginTop;
    let count = 0;

    // Use filtered data if available, else use all data
    const barcodes = Array.isArray(this.out_data) && this.out_data.length > 0 ? this.out_data : this.data;

    for (let i = 0; i < barcodes.length; i++) {
      const item = barcodes[i];
      const barcodeValue = item?.barcode || item?.code || item?.id || '';
      if (!barcodeValue) continue;

      // Generate barcode as PNG using bwip-js
      const pngData = await new Promise<string>((resolve, reject) => {
        bwipjs.toBuffer({
          bcid: this.barcodeType, // Barcode type
          text: barcodeValue,
          scale: 2,
          height: barcodeHeight,
          includetext: true,
          textxalign: 'center'
        }, (err: any, png: Buffer) => {
          if (err) reject(err);
          else resolve('data:image/png;base64,' + png.toString('base64'));
        });
      });

      // Add barcode image to PDF
      doc.addImage(pngData, 'PNG', x, y, barcodeWidth, barcodeHeight);

      // Optionally add label below barcode
      doc.text(barcodeValue, x + barcodeWidth / 2, y + barcodeHeight + 5, { align: 'center' });

      // Layout: 3 barcodes per row
      count++;
      if (count % 3 === 0) {
        x = marginLeft;
        y += barcodeHeight + gapY + 10;
        // New page if out of space
        if (y + barcodeHeight + 20 > 297 - marginTop) {
          doc.addPage();
          y = marginTop;
        }
      } else {
        x += barcodeWidth + gapX;
      }
    }

    // Print the PDF
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }
  downloadBarcode() {
    // Your download barcode logic here
  }
  printBarcodePreview() {
    // Your print barcode preview logic here
  }
  printBarcodePreviewPage() {
    // Your print barcode preview page logic here
  }
  printBarcodePreviewPageCount() {
    // Your print barcode preview page count logic here
  }
  printBarcodePreviewPageWidth() {
    // Your print barcode preview page width logic here
  }

  printBarcodePreviewPageHeight() {
    // Your print barcode preview page height logic here
  }
  openModal() {
    // Your open modal logic here
  }
  handleSelectAllBarcodesChange() {
    // handle select all barcodes change logic here
  }
}
