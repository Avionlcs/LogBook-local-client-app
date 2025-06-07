import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Function to set page opacity
function setPageOpacity(opacity: string) {
  document.body.style.opacity = opacity;
}

// Add event listeners for focus and blur
window.addEventListener('focus', () => {
  setPageOpacity('1'); // Full opacity when focused
});

window.addEventListener('blur', () => {
  setPageOpacity('1'); // Reduced opacity when not focused
});

// Bootstrap the Angular application
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
