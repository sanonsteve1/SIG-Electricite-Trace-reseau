import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AppConfigurator } from '@/layout/components/app.configurator';

@Component({
    selector: 'app-error',
    imports: [ButtonModule, RippleModule, RouterModule, AppConfigurator],
    standalone: true,
    template: `<div class="min-h-screen flex flex-col bg-cover" [style]="{ backgroundImage: 'url(/images/pages/error-bg.jpg)' }">
            <div class="self-center mt-auto mb-auto">
                <div class="text-center z-40 rounded-lg border border-surface bg-surface-0 dark:bg-surface-900 p-4 shadow-md flex flex-col">
                    <div class="rounded-md mx-auto text-white bg-pink-500 -mt-12 px-4 py-1">
                        <span class="text-4xl m-0" style="color: #212121">ERROR</span>
                    </div>
                    <div class="bg-surface-200 dark:bg-surface-600 p-4 mb-8 shadow rounded-md mt-4 px-12">
                        <img src="/images/pages/error.png" class="w-full" alt="" />
                    </div>
                    <div class="text-muted-color pb-12">Something went wrong.</div>
                    <button pButton pRipple label="GO BACK TO DASHBOARD" [routerLink]="['/']" text></button>
                </div>
            </div>
        </div>
        <app-configurator simple />`
})
export class Error {}
