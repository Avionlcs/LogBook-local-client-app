import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ImageSearchService {
  private readonly baseUrl = 'https://api.unsplash.com/search/photos';
  private readonly clientId = 'YOUR_UNSPLASH_ACCESS_KEY'; // 🔑 from https://unsplash.com/developers

  constructor(private http: HttpClient) {}

  searchImage(query: string): Observable<string> {
    const url = `${this.baseUrl}?query=${encodeURIComponent(query)}&per_page=1&orientation=squarish&client_id=${this.clientId}`;
    return this.http.get<any>(url).pipe(
      map(res => res.results[0]?.urls?.small || 'assets/placeholder.png')
    );
  }
}
