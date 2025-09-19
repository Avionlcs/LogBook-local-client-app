// src/app/features/inventory-reports/services/bulk-process.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { InventoryReportsComponent } from '../inventory-reports.component';

@Injectable()
export class BulkProcessService {
  constructor(private http: HttpClient) {}

  resumeBulkProcess(component: InventoryReportsComponent) {
    const storedProcessId = localStorage.getItem('bulkProcessId');
    if (!storedProcessId) return;
    component.processingState = 'add_item_bulk_update';

    const baseInterval = 100;
    const maxInterval = 3000;
    const maxRetries = 5;
    const freezeTimeout = 30000;

    let retryCount = 0;
    let currentInterval = baseInterval;
    let timeoutId: any = null;

    let lastStatusString = '';
    let freezeStartTime: number | null = null;

    const uploadStartTime = Date.now();

    component.bulkProcessStatus = {
      processId: storedProcessId,
      status: 'processing',
      percentage: 0,
      _startTime: uploadStartTime,
      _lastPoll: Date.now(),
    };

    const processId = component.bulkProcessStatus.processId;

    const pollStatus = () => {
      this.http.get<any>(`/bulk/status/${processId}`).subscribe({
        next: (status) => {
          const currentStatusString = JSON.stringify({
            status: status.status,
            percentage: status.percentage,
            resultsLength: status.results?.length || 0
          });

          if (currentStatusString === lastStatusString) {
            if (!freezeStartTime) freezeStartTime = Date.now();
            if (Date.now() - freezeStartTime >= freezeTimeout) {
              component.processingState = 'failed';
              component.processingMessage = 'App might be stopped, so remaining data is not added.';
              localStorage.removeItem('bulkProcessId');
              clearTimeout(timeoutId);
              return;
            }
          } else {
            freezeStartTime = null;
            lastStatusString = currentStatusString;
          }

          component.bulkProcessStatus = {
            ...status,
            _lastPoll: Date.now(),
          };

          const elapsedMs = Date.now() - uploadStartTime;
          const percent = status.percentage ?? 0;
          const estimatedTotalMs = percent > 0 ? elapsedMs / (percent / 100) : 0;
          const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);

          component.bulkProcessStatus._elapsed = this.formatDuration(elapsedMs);
          component.bulkProcessStatus._remaining = this.formatDuration(remainingMs);

          if (status.status === 'failed') {
            component.processingState = 'failed';
            component.processingMessage = `Processing failed: ${status.message || 'Unknown error'}`;
            localStorage.removeItem('bulkProcessId');
            clearTimeout(timeoutId);
            return;
          }

          if (status.status === 'completed') {
            component.processingMessage = `Woohoo! ${status.results?.length || 0} items added. Inventory just got fatter!`;
            component.inventoryService.loadTables(component, 0, 10);
            localStorage.removeItem('bulkProcessId');
            clearTimeout(timeoutId);
            setTimeout(() => component.processingState = 'add_item_init', 3000);
            return;
          }

          if (status.status === 'processing') {
            retryCount = 0;
            currentInterval = baseInterval;
            timeoutId = setTimeout(pollStatus, currentInterval);
          }
        },
        error: (err) => {
          retryCount++;
          if (retryCount > maxRetries) {
            component.processingState = 'failed';
            component.processingMessage = 'Polling failed after multiple attempts';
            localStorage.removeItem('bulkProcessId');
            clearTimeout(timeoutId);
            return;
          }

          const jitter = Math.random() * 1000;
          currentInterval = Math.min(
            baseInterval * Math.pow(2, retryCount) + jitter,
            maxInterval
          );

          component.processingState = 'processing';
          component.processingMessage = `Connection issue (retrying ${retryCount}/${maxRetries})...`;
          timeoutId = setTimeout(pollStatus, currentInterval);
        }
      });
    };

    timeoutId = setTimeout(pollStatus, baseInterval);
  }

  processMultipleExcelFiles(component: InventoryReportsComponent, files: FileList) {
    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append('files', file, file.name);
    });

    const validationSchema = {
      name: { type: 'string', min: 2, max: 100, required: true },
      stock: { type: 'number', min: 0, required: true },
      min_stock: { type: 'number', min: 0, required: true },
      buy_price: { type: 'number', min: 0, required: true },
      sale_price: { type: 'number', min: 0, required: true },
      created: { type: 'string', pattern: 'date', required: false },
      last_updated: { type: 'string', pattern: 'date', required: false }
    };

    formData.append('requiredFields', JSON.stringify(validationSchema));

    component.processingMessage = 'Uploading files...';
    const uploadStartTime = Date.now();

    this.http.post<{ processId: string }>(`/api/inventory/add/bulk`, formData).subscribe({
      next: (response) => {
        const processId = response.processId;
        localStorage.setItem('bulkProcessId', processId);
        component.bulkProcessStatus = {
          processId,
          status: 'processing',
          percentage: 0,
          _startTime: uploadStartTime,
          _lastPoll: Date.now()
        };

        const baseInterval = 100;
        let maxInterval = 3000;
        let currentInterval = baseInterval;
        let retryCount = 0;
        const maxRetries = 4;
        let timeoutId: any;

        const pollStatus = () => {
          this.http.get<any>(`/api/inventory/add/bulk/status/${processId}`).subscribe({
            next: (status) => {
              component.bulkProcessStatus = {
                ...status,
                _lastPoll: Date.now(),
              };

              const elapsedMs = Date.now() - uploadStartTime;
              const percent = status.percentage ?? 0;
              const estimatedTotalMs = percent > 0 ? elapsedMs / (percent / 100) : 0;
              const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);

              component.bulkProcessStatus._elapsed = this.formatDuration(elapsedMs);
              component.bulkProcessStatus._remaining = this.formatDuration(remainingMs);

              if (status.status === 'failed') {
                component.processingState = 'failed';
                component.processingMessage = `Processing failed: ${status.message || 'Unknown error'}`;
                localStorage.removeItem('bulkProcessId');
                clearTimeout(timeoutId);
                return;
              }

              if (status.status === 'completed') {
                component.processingMessage = `Woohoo! ${status.results?.length || 0} items added. Inventory just got fatter!`;
                component.inventoryService.loadTables(component, 0, 10);
                localStorage.removeItem('bulkProcessId');
                clearTimeout(timeoutId);
                setTimeout(() => {
                  component.processingState = 'add_item_init';
                }, 3000);
                return;
              }

              if (status.status === 'processing') {
                retryCount = 0;
                currentInterval = baseInterval;
                timeoutId = setTimeout(pollStatus, currentInterval);
              }
            },
            error: (err) => {
              retryCount++;
              if (retryCount > maxRetries) {
                component.processingState = 'failed';
                component.processingMessage = 'Polling failed after multiple attempts';
                localStorage.removeItem('bulkProcessId');
                return;
              }

              const jitter = Math.random() * 1000;
              currentInterval = Math.min(
                baseInterval * Math.pow(2, retryCount) + jitter,
                maxInterval
              );

              component.processingState = 'processing';
              component.processingMessage = `Connection issue (retrying ${retryCount}/${maxRetries})...`;
              timeoutId = setTimeout(pollStatus, currentInterval);
            }
          });
        };

        timeoutId = setTimeout(pollStatus, baseInterval);
      },
      error: (error) => {
        component.processingState = 'failed';
        component.processingMessage = 'Upload failed: ' + (error.error?.message || error.message || 'Unknown error');
        console.error('Upload error', error);
        setTimeout(() => {
          component.processingState = 'add_item_init';
        }, 5000);
      }
    });
  }

  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}