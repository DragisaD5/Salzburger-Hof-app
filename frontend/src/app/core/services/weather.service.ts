import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WeatherData {
  current_weather: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    is_day: number;
    weathercode: number;
    time: string;
  };
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly url = 'https://api.open-meteo.com/v1/forecast?latitude=47.3235&longitude=12.7969&current_weather=true';

  constructor(private http: HttpClient) {}

  getWeather(): Observable<WeatherData> {
    return this.http.get<WeatherData>(this.url);
  }

  getWeatherDescription(code: number): { text: string; icon: string } {
    const descriptions: Record<number, { text: string; icon: string }> = {
      0: { text: 'Clear Sky', icon: '☀️' },
      1: { text: 'Mainly Clear', icon: '☀️' },
      2: { text: 'Partly Cloudy', icon: '⛅' },
      3: { text: 'Overcast', icon: '☁️' },
      45: { text: 'Fog', icon: '🌫️' },
      48: { text: 'Depositing Rime Fog', icon: '🌫️' },
      51: { text: 'Light Drizzle', icon: '🌧️' },
      53: { text: 'Moderate Drizzle', icon: '🌧️' },
      55: { text: 'Dense Drizzle', icon: '🌧️' },
      61: { text: 'Slight Rain', icon: '🌧️' },
      63: { text: 'Moderate Rain', icon: '🌧️' },
      65: { text: 'Heavy Rain', icon: '🌧️' },
      71: { text: 'Slight Snow', icon: '❄️' },
      73: { text: 'Moderate Snow', icon: '❄️' },
      75: { text: 'Heavy Snow', icon: '❄️' },
      77: { text: 'Snow Grains', icon: '❄️' },
      80: { text: 'Slight Rain Showers', icon: '🌦️' },
      81: { text: 'Moderate Rain Showers', icon: '🌦️' },
      82: { text: 'Violent Rain Showers', icon: '🌦️' },
      85: { text: 'Slight Snow Showers', icon: '❄️' },
      86: { text: 'Heavy Snow Showers', icon: '❄️' },
      95: { text: 'Thunderstorm', icon: '⚡' },
      96: { text: 'Thunderstorm with Hail', icon: '⚡' },
      99: { text: 'Thunderstorm with Heavy Hail', icon: '⚡' }
    };
    return descriptions[code] || { text: 'Unknown Weather', icon: '🌡️' };
  }
}
