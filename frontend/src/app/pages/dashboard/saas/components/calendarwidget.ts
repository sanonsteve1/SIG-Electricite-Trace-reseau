import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

@Component({
    selector: 'calendar-widget',
    standalone: true,
    imports: [CommonModule, ButtonModule, RippleModule],
    template: `<div class="flex flex-col gap-4 rounded-md border h-full border-surface py-6">
        <div class="flex justify-between items-center mx-6">
            <div class="flex items-center gap-4">
                <div>
                    <i class="pi pi-calendar text-primary text-3xl"></i>
                </div>
                <div class="flex flex-col justify-between gap-1">
                    <span class="font-bold text-surface-900 dark:text-surface-0">My Calendar</span>
                    <span class="text-muted-color text-sm"><span class="font-bold">19</span> Events on this month</span>
                </div>
            </div>
            <div class="flex items-center gap-1">
                <button pButton pRipple icon="pi pi-filter" outlined></button>
                <button pButton pRipple icon="pi pi-plus" outlined></button>
            </div>
        </div>
        <div class="flex flex-col gap-2 h-[21rem] overflow-auto -mb-6">
            <div *ngFor="let task of dailyTasks" class="flex justify-between px-4 py-2 border-l-2 cursor-pointer mx-6 rounded-md bg-surface-50 dark:bg-surface-800 hover:shadow hover:bg-surface-0 dark:hover:bg-surface-900" [class]="task.borderColor">
                <div class="flex justify-between gap-4">
                    <div class="flex flex-col justify-center gap-2">
                        <span class="font-medium text-base text-color">{{ task.label }}</span>
                        <span class="text-muted-color text-sm">{{ task.description }}</span>
                        <span class="flex items-center font-medium gap-1 text-muted-color text-xs"><i class="pi pi-clock"></i> 10:30 AM</span>
                    </div>
                </div>
                <div class="flex items-center">
                    <i class="pi pi-ellipsis-h text-muted-color"></i>
                </div>
            </div>
        </div>
    </div>`,
    host: {
        class: 'col-span-12 md:col-span-4'
    }
})
export class CalendarWidget {
    @Input() dailyTasks: any[] = [];
}
