import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OrientationService {

  isMobileDevice(): boolean {
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.matchMedia('(max-width: 767px)').matches;
    this.logDeviceResolution();
    console.debug(`isMobileUserAgent: ${isMobileUserAgent}, isSmallScreen: ${isSmallScreen}`);
    return isMobileUserAgent || isSmallScreen;
  }


  orientationChanged = {
    subscribe: (callback: (isMobile: boolean) => void) => {
      const handler = () => {
        const isMobile = this.isMobileDevice();
        callback(isMobile);
        console.debug(`Orientation changed. isMobile: ${isMobile}`);
      };
      window.addEventListener('orientationchange', handler);

      handler();
      return {
        unsubscribe: () => window.removeEventListener('orientationchange', handler)
      };
    }
  };

  logDeviceResolution(): void {
    const { width, height } = window.screen;
    console.debug(`Device Resolution: ${width}x${height} pixels`);
  }

  async lockToLandscape(): Promise<void> {
    console.info('Attempting to lock orientation to landscape...');
    if (!this.isMobileDevice()) {
      console.info('Device is not mobile.');
      return;
    }


    if ('orientation' in screen && typeof (screen.orientation as any).lock === 'function') {
      if (document.fullscreenEnabled && !document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
          var elem: any = document.documentElement;
          if (elem.requestFullscreen) {
            elem.requestFullscreen();
          } else if (elem.webkitRequestFullscreen) { /* Safari */
            elem.webkitRequestFullscreen();
          } else if (elem.msRequestFullscreen) { /* IE11 */
            elem.msRequestFullscreen();
          }
          console.info('Entered fullscreen mode.');
        } catch (fsError: any) {
          alert('Failed to enter fullscreen mode: ' + (fsError?.message || fsError));
        }
      }
      try {
        await (screen.orientation as any).lock('landscape');
        console.info('Orientation locked to landscape.');
      } catch (error: any) {
        alert('Failed to lock orientation: ' + (error?.message || error));
      }
    } else {
      console.warn('Screen Orientation API is not supported in this browser.');
    }
  }


  unlockOrientation(): void {
    if (!this.isMobileDevice()) {
      console.info('Device is not mobile.');
      return;
    }
    if ('orientation' in screen && typeof (screen.orientation as any).unlock === 'function') {
      (screen.orientation as any).unlock();
      console.info('Orientation unlocked.');
    } else {
      console.warn('ScreenOrientation.unlock is not supported in this browser.');
    }
  }
}
