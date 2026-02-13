import {Component} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {RippleModule} from 'primeng/ripple';
import {AppConfigurator} from "@/layout/components/app.configurator";

@Component({
    selector: 'app-error-2',
    imports: [ButtonModule, RippleModule, RouterModule, AppConfigurator],
    standalone: true,
    template: `<div class="h-screen bg-surface-50 dark:bg-surface-950 flex w-full">
        <div class="flex flex-1 flex-col bg-surface-50 dark:bg-surface-950 justify-center">
            <div class="flex justify-center mb-6">
                <img src="/images/pages/error2.png" alt="error" />
            </div>
            <div class="flex flex-col gap-2 items-center">
                <span class="m-0 text-pink-500 font-semibold text-4xl">ERROR!</span>
                <span class="text-surface-700 dark:text-surface-100">Something went wrong.</span>
            </div>
            <div class="flex justify-center mt-12">
                <button pButton pRipple label="BACK TO DASHBOARD" [routerLink]="['/']" class="!bg-indigo-500 !text-white" text></button>
            </div>
        </div>
        <div [style]="{ backgroundImage: 'url(/images/pages/error-bg.jpg)' }" class="hidden lg:flex flex-1 items-center justify-center bg-cover">
            <img src="/layout/images/logo/vector_logo.png" alt="logo" />
        </div>
    </div>
    <app-configurator simple/>`
})
export class Error2 {}
