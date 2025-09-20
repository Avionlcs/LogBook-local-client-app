import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InitialLoadService {
  constructor(private http: HttpClient) {}

  getInitialItems(limit: number = 10): Observable<any[]> {
    return this.http.get<any[]>(`/api/inventory/get/initial-inventory?limit=${limit}`);
  }
}
