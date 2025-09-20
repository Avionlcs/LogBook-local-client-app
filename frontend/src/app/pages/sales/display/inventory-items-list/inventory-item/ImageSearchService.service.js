@Injectable({ providedIn: 'root' })
export class ImageSearchService {
  private accessKey = 'YOUR_UNSPLASH_ACCESS_KEY';

  constructor(private http: HttpClient) {}

  searchImage(query: string): Observable<string> {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=${this.accessKey}`;
    return this.http.get<any>(url).pipe(
      map(res => res.results[0]?.urls?.small || 'assets/placeholder.png')
    );
  }
}
