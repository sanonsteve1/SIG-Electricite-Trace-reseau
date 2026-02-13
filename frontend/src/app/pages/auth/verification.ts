import {Component} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {Ripple} from 'primeng/ripple';
import {RouterModule} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {InputNumber} from 'primeng/inputnumber';
import {Fluid} from 'primeng/fluid';
import {AppConfigurator} from '@/layout/components/app.configurator';

@Component({
    selector: 'app-verification',
    standalone: true,
    imports: [ButtonModule, Ripple, RouterModule, FormsModule, InputNumber, Fluid, AppConfigurator],
    template: `<div class="h-screen flex w-full bg-surface-50 dark:bg-surface-950">
            <div class="flex flex-1 flex-col bg-surface-50 dark:bg-surface-950 items-center justify-center">
                <div class="w-11/12 sm:w-[30rem]">
                    <div class="flex flex-col">
                        <div style="height: 56px; width: 56px" class="bg-primary rounded-full flex items-center justify-center">
                            <i class="pi pi-check-circle text-surface-0 dark:text-surface-900 !text-4xl"></i>
                        </div>
                        <div class="mt-6">
                            <h1 class="m-0 text-primary font-semibold text-4xl">Authentication?</h1>
                            <span class="block text-surface-700 dark:text-surface-100 mt-2">Verify your code</span>
                        </div>
                    </div>
                    <p-fluid class="flex gap-4 items-center mt-12">
                        <p-inputNumber inputStyleClass="w-full text-center" [maxlength]="1" (onInput)="focusOnNext(input2)"></p-inputNumber>
                        <p-inputNumber #input2 inputStyleClass="w-full text-center" [maxlength]="1" (onInput)="focusOnNext(input3)"></p-inputNumber>
                        <p-inputNumber #input3 inputStyleClass="w-full text-center" [maxlength]="1" (onInput)="focusOnNext(input4)"></p-inputNumber>
                        <p-inputNumber #input4 inputStyleClass="w-full text-center" [maxlength]="1"></p-inputNumber>
                    </p-fluid>
                    <div class="mt-4">
                        <button pButton pRipple class="w-full" label="VERIFY NOW"></button>
                    </div>
                    <div class="mt-4">
                        <button pButton pRipple class="w-full text-primary-500" text label="SEND AGAIN"></button>
                    </div>
                </div>
            </div>
            <div [style]="{ backgroundImage: 'url(/images/pages/accessDenied-bg.jpg)' }" class="hidden lg:flex flex-1 items-center justify-center bg-cover">
                <img src="/layout/images/logo/vector_logo.png" alt="" />
            </div>
        </div>
        <app-configurator simple />`
})
export class Verification {
    value: string = '';

    focusOnNext(inputEl: InputNumber) {
        inputEl.input.nativeElement.focus();
    }
}
