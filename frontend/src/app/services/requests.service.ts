import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RequestsService {

  constructor(private http: HttpClient) { }

  async get<T>(endpoint: string, params?: HttpParams | { [param: string]: string | string[] }): Promise<any> {
    return await this.http.get(`${endpoint}`, { params }).toPromise();
  }

  async post<T>(endpoint: string, body: any, options?: object): Promise<any> {
    return await this.http.post(`${endpoint}`, body, options).toPromise();
  }

  async put<T>(endpoint: string, body: any, options?: object): Promise<any> {
    return await this.http.put(`${endpoint}`, body, options).toPromise();
  }

  async delete<T>(endpoint: string, options?: object): Promise<any> {
    return await this.http.delete(`${endpoint}`, options).toPromise();
  }

  async patch<T>(endpoint: string, body: any, options?: object): Promise<any> {
    return await this.http.patch(`${endpoint}`, body, options).toPromise();
  }
}
