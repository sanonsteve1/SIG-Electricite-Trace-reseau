import { Component } from '@angular/core';

@Component({
    selector: 'who-uses-widget',
    standalone: true,
    template: `
        <div class="col-span-6 lg:col-span-3 flex items-center justify-center gap-4">
            <img [draggable]="false" src="/images/landing/landing-logo1.png" alt="" />
        </div>
        <div class="col-span-6 lg:col-span-3 flex items-center justify-center gap-4">
            <img [draggable]="false" src="/images/landing/landing-logo2.png" alt="" />
        </div>
        <div class="col-span-6 lg:col-span-3 flex items-center justify-center gap-4">
            <img [draggable]="false" src="/images/landing/landing-logo3.png" alt="" />
        </div>
        <div class="col-span-6 lg:col-span-3 flex items-center justify-center gap-4">
            <img [draggable]="false" src="/images/landing/landing-logo4.png" alt="" />
        </div>
    `,
    host: {
        class: 'grid grid-cols-12 gap-4 grid-nogutter p-2 lg:p-8',
        style: 'background-color: #000'
    }
})
export class WhoUsesWidget {}
