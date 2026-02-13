import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { InputIcon } from 'primeng/inputicon';
import { IconField } from 'primeng/iconfield';
import { AppConfigurator } from '@/layout/components/app.configurator';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule, InputIcon, IconField, AppConfigurator],
    template: `<div class="min-h-screen flex flex-col bg-cover" [style]="{ backgroundImage: 'url(/images/pages/login-bg.jpg)' }">
            <div class="self-center mt-auto mb-auto">
                <div class="text-center z-50 flex flex-col border rounded-md border-surface bg-surface-0 dark:bg-surface-900 p-12">
                    <span class="text-2xl font-semibold">Welcome</span>
                    <div class="text-muted-color mb-12 px-12">Please use the form to sign-in Ultima network</div>

                    <div class="w-full flex flex-col gap-4 px-4">
                        <p-icon-field>
                            <p-inputicon class="pi pi-envelope" />
                            <input pInputText class="w-full" placeholder="E-mail" />
                        </p-icon-field>

                        <p-icon-field>
                            <p-inputicon class="pi pi-key" />
                            <input pInputText type="password" class="w-full" placeholder="Password" />
                        </p-icon-field>
                        <button pButton pRipple [routerLink]="['/']" class="w-full mt-4 px-4" label="LOGIN"></button>
                    </div>
                </div>
            </div>
        </div>
        <app-configurator simple />`
})
export class Login {}
