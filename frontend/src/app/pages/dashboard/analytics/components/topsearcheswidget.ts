import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

@Component({
    selector: 'top-searches-widget',
    standalone: true,
    imports: [CommonModule, MenuModule, ButtonModule, RippleModule],
    template: `<div class="card h-full">
        <div class="flex items-center justify-between mb-4">
            <span class="text-xl font-semibold m-0">Top Searches</span>
            <div>
                <button pButton pRipple icon="pi pi-ellipsis-h" rounded text (click)="menu.toggle($event)"></button>
                <p-menu #menu popup [model]="items" />
            </div>
        </div>
        <ng-container *ngFor="let search of searches; let i = index">
            <div [ngClass]="{ 'flex justify-between p-4': true, 'bg-surface-50 dark:bg-surface-800': i % 2 === 0 }">
                <span>{{ search.name }}</span>
                <span [ngClass]="{ 'font-medium': true, 'text-green-500': search.rate >= 60, 'text-orange-500': search.rate >= 40, 'text-pink-500': search.rate < 40 }">{{ search.rate }}% CONV RATE</span>
            </div>
        </ng-container>
    </div>`
})
export class TopSearchesWidget {
    items = [
        { label: 'View', icon: 'pi pi-eye' },
        { label: 'Export', icon: 'pi pi-upload' }
    ];

    searches = [
        {
            name: 'Mat Orange Case',
            rate: 82
        },
        {
            name: 'Space T-Shirt',
            rate: 78
        },
        {
            name: 'Orange Black Hoodie',
            rate: 61
        },
        {
            name: 'Wonders Notebook',
            rate: 48
        },
        {
            name: 'Robots T-Shirt',
            rate: 34
        },
        {
            name: 'Green Portal Sticker',
            rate: 11
        }
    ];
}
