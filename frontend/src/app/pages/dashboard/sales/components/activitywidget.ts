import { Component } from '@angular/core';
import { MenuModule } from 'primeng/menu';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

@Component({
    selector: 'activity-widget',
    standalone: true,
    imports: [CommonModule, ButtonModule, RippleModule, MenuModule],
    template: `<div class="card h-full">
        <div class="flex items-center justify-between mb-4">
            <span class="font-semibold text-xl m-0">Activity</span>
            <div>
                <button pButton pRipple icon="pi pi-ellipsis-h" rounded text (click)="menu.toggle($event)"></button>
                <p-menu #menu popup [model]="items"> </p-menu>
            </div>
        </div>

        <div *ngFor="let activity of activities" class="widget-activity p-0 list-none">
            <li class="py-4 px-0 border-b border-surface">
                <div class="activity-item flex flex-col">
                    <div class="font-medium mb-1">{{ activity.title }}</div>
                    <div class="text-sm text-muted-color mb-2">{{ activity.description }}</div>
                    <div class="bg-surface-50 dark:bg-surface-800" style="height: 6px">
                        <div [ngClass]="[activity.progressColor, 'w-6/12 h-full rounded-lg']"></div>
                    </div>
                </div>
            </li>
        </div>
    </div>`
})
export class ActivityWidget {
    items = [
        { label: 'Update', icon: 'pi pi-fw pi-refresh' },
        { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
    ];

    activities = [
        {
            title: 'Income',
            description: '30 November, 16.20',
            progressColor: 'bg-yellow-500'
        },
        {
            title: 'Tax',
            description: '1 December, 15.27',
            progressColor: 'bg-pink-500'
        },
        {
            title: 'Invoices',
            description: '1 December, 15.28',
            progressColor: 'bg-cyan-600'
        },
        {
            title: 'Expanses',
            description: '3 December, 09.15',
            progressColor: 'bg-cyan-600'
        },
        {
            title: 'Bonus',
            description: '1 December, 23.55',
            progressColor: 'bg-cyan-600'
        },
        {
            title: 'Revenue',
            description: '30 November, 16.20',
            progressColor: 'bg-pink-500'
        }
    ];
}
