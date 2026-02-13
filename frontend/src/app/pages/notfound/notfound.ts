import {Component} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ButtonModule} from 'primeng/button';
import {RippleModule} from 'primeng/ripple';
import {AppConfigurator} from "@/layout/components/app.configurator";

@Component({
    selector: 'app-notfound',
    standalone: true,
    imports: [RouterModule, ButtonModule, RippleModule, AppConfigurator],
    template: `<div class="min-h-screen flex flex-col bg-cover" [style]="{ backgroundImage: 'url(/images/pages/404-bg.jpg)' }">
        <div class="self-center mt-auto mb-auto">
            <div class="text-center z-40 rounded-lg border border-surface bg-white p-4 shadow-md flex flex-col">
                <div class="rounded-md mx-auto border border-surface bg-slate-700 px-4 py-1">
                    <h2 class="m-0 text-white">NOT FOUND</h2>
                </div>
                <div class="bg-surface-200 dark:bg-surface-600 p-4 mb-8 shadow rounded-md mt-4 px-12">
                    <img src="/images/pages/404.png" class="w-full" alt="" />
                </div>
                <div class="text-muted-color pb-12">Requested resource is not available.</div>
                <button pButton pRipple text label="GO BACK TO DASHBOARD" [routerLink]="['/']"></button>
            </div>
        </div>
    </div>
    <app-configurator simple/>`
})
export class Notfound {}
