import { Overlay, ComponentType } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, Injector } from '@angular/core';
import { take, of } from 'rxjs';
import { DialogRef } from './dialog-ref';
import { DIALOG_DATA } from './dialog-tokens';

export interface DialogConfig {
  data?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  openDialogs = <DialogRef<any>[]>[];
  scrollPosition = 0;
  constructor(private overlay: Overlay, private injector: Injector) {}

  open<T, R = any>(component: ComponentType<T>,  config?: DialogConfig): DialogRef<T, R> {
    // Globally centered position strategy
    this.scrollPosition = window.scrollY;
    const positionStrategy = this.overlay
      .position()
      .global()
      .centerHorizontally()
      .centerVertically();

    // Create the overlay with customizable options
    const overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'overlay-backdrop',
      panelClass: 'overlay-panel'
    });

    // Create dialogRef to return
    const dialogRef = new DialogRef<T, R>(overlayRef);
    dialogRef.setComponent(component);

    // Create injector to be able to reference the DialogRef from within the component
    const injector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: DialogRef, useValue: dialogRef },
        { provide: DIALOG_DATA, useValue: config?.data || {} }
      ]
    });

    // Attach component portal to the overlay
    const portal = new ComponentPortal(component, null, injector);
    overlayRef.attach(portal);
    this.openDialogs.push(dialogRef);

    dialogRef.afterClosed().pipe(take(1)).subscribe(() => {
      const index = this.openDialogs.findIndex((dialog) => dialog.component.name === dialogRef.component.name);
      this.openDialogs.splice(index, 1);
      setTimeout(() => {
        window.scrollTo(0, this.scrollPosition);
      });
    });

    return dialogRef;
  }

  closeAll () {
    while (this.openDialogs.length) {
      this.openDialogs.forEach((d) => {
        d.close();
      });
    }
  }

  getOpenDialogs () {
    return of(this.openDialogs.length);
  }
}

