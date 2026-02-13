import {Component} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {RippleModule} from 'primeng/ripple';
import {AppConfigurator} from "@/layout/components/app.configurator";

@Component({
    selector: 'app-access-2',
    standalone: true,
    imports: [ButtonModule, RouterModule, RippleModule, AppConfigurator],
    template: `<div class="h-screen flex w-full">
        <div class="flex flex-1 flex-col bg-surface-50 dark:bg-surface-950 justify-center">
            <div class="flex justify-center">
                <img src="/images/pages/accessDenied.png" alt="access" />
            </div>
            <div class="flex flex-col gap-2 items-center">
                <span class="text-4xl m-0 text-orange-600 font-semibold">ACCESS DENIED!</span>
                <span class="text-surface-700 dark:text-surface-100">You do not have the permissions.</span>
            </div>
            <div class="flex justify-center mt-12">
                <button pButton pRipple type="button" label="BACK TO DASHBOARD" [routerLink]="['/']" class="!bg-indigo-500 !text-white" text></button>
            </div>
        </div>
        <div [style]="{ backgroundImage: 'url(/images/pages/accessDenied-bg.jpg)' }" class="hidden lg:flex flex-1 items-center justify-center bg-cover">
            <img src="/layout/images/logo/vector_logo.png" alt="" />
        </div>
    </div>
    <app-configurator simple/>`
})
export class AccessDenied2 {}
