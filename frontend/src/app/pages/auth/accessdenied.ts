import {Component, inject} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {RippleModule} from 'primeng/ripple';
import {LayoutService} from '@/layout/service/layout.service';
import {AppConfigurator} from "@/layout/components/app.configurator";

@Component({
    selector: 'app-access',
    standalone: true,
    imports: [ButtonModule, RouterModule, RippleModule, AppConfigurator],
    template: `<div class="min-h-screen flex flex-col bg-cover" [style]="{ backgroundImage: 'url(/images/pages/accessDenied-bg.jpg)' }">
        <div class="self-center mt-auto mb-auto">
            <div class="text-center z-40 rounded-lg border border-surface bg-white p-4 shadow-md flex flex-col">
                <div class="rounded-md mx-auto border border-surface bg-orange-500 -mt-12 px-4 py-1">
                    <span class="m-0 text-3xl font-semibold text-surface-0 dark:text-surface-900">ACCESS DENIED</span>
                </div>
                <div class="bg-surface-200 dark:bg-surface-600 p-4 mb-8 shadow rounded-md mt-4 px-12">
                    <img src="/images/pages/accessDenied.png" alt="access" />
                </div>
                <div class="text-muted-color pb-12">You do not have the permissions.</div>
                <button pButton pRipple type="button" label="GO BACK TO DASHBOARD" text [routerLink]="['/']"></button>
            </div>
        </div>
    </div>
    <app-configurator simple/>`
})
export class AccessDenied {
    layoutService = inject(LayoutService);
}
