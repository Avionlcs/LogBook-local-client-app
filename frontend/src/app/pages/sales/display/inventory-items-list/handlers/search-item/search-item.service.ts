import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchItemService {
  constructor(private http: HttpClient) {}

  getSearchItems(keyword: string, limit: number = 10): Observable<any[]> {
    return this.http.get<any[]>(`/api/inventory/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);
  }
}
