import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputText } from 'primeng/inputtext';

@Component({
    selector: 'newsletter-widget',
    standalone: true,
    imports: [InputText, ButtonModule, RippleModule],
    template: ` <div class="p-8 flex flex-col gap-4 items-start justify-between lg:flex-row lg:items-center rounded-2xl w-full" style="background: linear-gradient(110.43deg, #868cd0 0.04%, #ff5759 100.11%); max-width: 1200px">
        <div class="flex flex-col gap-2">
            <h1 class="m-0 text-white font-bold text-2xl">NEWSLETTER</h1>
            <p class="m-0 text-white">Sign up for our newsletter and stay up-to-date on the latest features and updates for our platform.</p>
        </div>
        <div class="flex items-center gap-2">
            <input pInputText placeholder="Email Address" class="!bg-transparent !border-white !rounded-md placeholder:!text-white" />
            <button pButton pRipple class="!text-white !border !border-white !rounded-md h-full" text label="JOIN"></button>
        </div>
    </div>`,
    host: {
        class: 'py-12 px-6 mt-12 w-full flex justify-center'
    }
})
export class NewsletterWidget {}
