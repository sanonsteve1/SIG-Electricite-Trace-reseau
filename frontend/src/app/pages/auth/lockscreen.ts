import {Component} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {Ripple} from 'primeng/ripple';
import {RouterModule} from '@angular/router';
import {AppConfigurator} from '@/layout/components/app.configurator';
import {Avatar} from 'primeng/avatar';
import {InputGroup} from 'primeng/inputgroup';
import {InputGroupAddon} from 'primeng/inputgroupaddon';
import {InputText} from 'primeng/inputtext';

@Component({
    standalone: true,
    selector: 'app-lockscreen',
    imports: [ButtonModule, Ripple, RouterModule, AppConfigurator, Avatar, InputGroup, InputGroupAddon, InputText],
    template: `<div class="h-screen flex w-full bg-surface-50 dark:bg-surface-950">
            <div class="flex flex-1 flex-col bg-surface-50 dark:bg-surface-950 items-center justify-center">
                <div class="w-11/12 sm:w-[30rem]">
                    <div class="flex flex-col">
                        <div style="height: 56px; width: 56px" class="bg-primary rounded-full flex items-center justify-center">
                            <i class="pi pi-lock text-surface-0 dark:text-surface-900 !text-4xl"></i>
                        </div>
                        <div class="mt-6">
                            <span class="m-0 text-primary font-semibold text-4xl">Lock Screen</span>
                            <span class="block text-surface-700 dark:text-surface-100 mt-2">Enter your password</span>
                        </div>
                    </div>
                    <div class="flex flex-col gap-4 mt-12">
                        <div class="flex justify-between items-center">
                            <div class="flex gap-4 items-center">
                                <p-avatar image="/images/avatar/annafali.png" shape="circle" size="large"> </p-avatar>
                                <div class="flex flex-col gap-1">
                                    <span class="text-color font-semibold text-lg">Amy Elsner</span>
                                    <span class="text-muted-color text-sm">UX Designer</span>
                                </div>
                            </div>
                            <button pButton pRipple class="text-primary-500" text icon="pi pi-sign-out" label="Log out"></button>
                        </div>
                        <p-input-group>
                            <p-inputgroup-addon>
                                <i class="pi pi-key"></i>
                            </p-inputgroup-addon>
                            <input pInputText id="password2" type="password" placeholder="Password" />
                        </p-input-group>
                        <p-input-group>
                            <button pButton pRipple class="w-full" label="UNLOCK"></button>
                        </p-input-group>
                        <p-input-group>
                            <button pButton pRipple class="w-full text-primary-500" text label="SWITCH ACCOUNT"></button>
                        </p-input-group>
                    </div>
                </div>
            </div>
            <div [style]="{ backgroundImage: 'url(/images/pages/accessDenied-bg.jpg)' }" class="hidden lg:flex flex-1 items-center justify-center bg-cover">
                <img src="/layout/images/logo/vector_logo.png" alt="" />
            </div>
        </div>

        <app-configurator simple /> `
})
export class LockScreen {}
