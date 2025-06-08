import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';


function setPageOpacity(opacity: string) {
  document.body.style.opacity = opacity;
}

window.addEventListener('focus', () => {
  setPageOpacity('1');
});

window.addEventListener('blur', () => {
  setPageOpacity('1');
});

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
