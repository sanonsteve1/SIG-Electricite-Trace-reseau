import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

@Component({
    selector: 'upgrade-widget',
    standalone: true,
    imports: [ButtonModule, RippleModule],
    template: `<div class="h-full bg-primary  flex justify-between items-center pl-8 py-4 rounded-md overflow-hidden">
        <div class="flex flex-col justify-center">
            <div><span class="font-bold text-white dark:text-surface-900 text-sm">Carry your team on top</span></div>
            <div>
                <span class="font-bold text-white dark:text-surface-900 mt-1 text-4xl m-0">Upgrade Now</span>
            </div>
            <div>
                <button pButton pRipple icon="pi pi-database" label="See All Plans" class="!bg-white mt-4 dark:!text-surface-900" outlined></button>
            </div>
        </div>
        <div><img class="-mr-4" [attr.draggable]="false" src="/images/dashboard/saas-card.png" alt="" /></div>
    </div>`
})
export class UpgradeWidget {}
