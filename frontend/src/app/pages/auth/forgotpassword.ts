import {Component} from '@angular/core';
import {InputText} from 'primeng/inputtext';
import {ButtonModule} from 'primeng/button';
import {RouterModule} from '@angular/router';
import {RippleModule} from 'primeng/ripple';
import {InputGroup} from 'primeng/inputgroup';
import {InputGroupAddon} from 'primeng/inputgroupaddon';
import {AppConfigurator} from '@/layout/components/app.configurator';

@Component({
    standalone: true,
    selector: 'app-forgot-password',
    imports: [InputText, ButtonModule, RippleModule, RouterModule, InputGroup, InputGroupAddon, AppConfigurator],
    template: `<div class="h-screen flex w-full bg-surface-50 dark:bg-surface-950">
            <div class="flex flex-1 flex-col bg-surface-50 dark:bg-surface-950 items-center justify-center">
                <div class="w-11/12 sm:w-[30rem]">
                    <div class="flex flex-col">
                        <div style="height: 56px; width: 56px" class="bg-primary rounded-full flex items-center justify-center">
                            <i class="pi pi-question text-surface-0 dark:text-surface-900 !text-4xl"></i>
                        </div>
                        <div class="mt-6">
                            <h1 class="m-0 text-primary font-semibold text-4xl">Forgot password?</h1>
                            <span class="block text-surface-700 dark:text-surface-100 mt-2">Please enter your email address</span>
                        </div>
                    </div>
                    <div class="flex flex-col gap-4 mt-12">
                        <p-input-group>
                            <p-inputgroup-addon>
                                <i class="pi pi-at"></i>
                            </p-inputgroup-addon>
                            <input pInputText placeholder="Email" />
                        </p-input-group>
                        <p-input-group>
                            <button pButton class="w-full" label="SUBMIT EMAIL"></button>
                        </p-input-group>
                        <p-input-group>
                            <button pButton class="w-full text-primary-500" text label="BACK TO LOGIN"></button>
                        </p-input-group>
                    </div>
                </div>
            </div>
            <div [style]="{ backgroundImage: 'url(/images/pages/accessDenied-bg.jpg)' }" class="hidden lg:flex flex-1 items-center justify-center bg-cover">
                <img src="/layout/images/logo/vector_logo.png" alt="logo" />
            </div>
        </div>
        <app-configurator simple />`
})
export class ForgotPassword {}
