import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { MenuModule } from 'primeng/menu';

@Component({
    selector: 'expenses-widget',
    standalone: true,
    imports: [CommonModule, ButtonModule, RippleModule, MenuModule],
    template: `<div class="card h-full">
        <div class="flex items-center justify-between mb-4">
            <span class="text-xl font-semibold m-0">Expenses</span>
            <div>
                <button pButton pRipple icon="pi pi-ellipsis-h" rounded text (click)="menu.toggle($event)"></button>
                <p-menu #menu popup [model]="items" />
            </div>
        </div>
        <div class="border-b border-surface text-sm text-muted-color mb-2 pb-4">November 22 - November 29</div>
        <ng-container *ngFor="let expense of expenses; let i = index">
            <div [ngClass]="{ 'flex justify-between items-center my-2 p-2': true, 'border-b border-surface': i !== expenses.length - 1 }">
                <div class="flex flex-col">
                    <i class="text-cyan-700 text-2xl mb-2" [ngClass]="expense.icon"></i>
                    <span class="font-medium mb-1">{{ expense.amount }}</span>
                    <span class="text-muted-color">{{ expense.category }}</span>
                </div>
                <span>
                    <a href="#" class="text-muted-color">
                        <i class="pi pi-chevron-right"></i>
                    </a>
                </span>
            </div>
        </ng-container>
    </div>`
})
export class ExpensesWidget {
    expenses = [
        {
            icon: 'pi pi-cloud',
            amount: '30.247',
            category: 'Cloud Infrastructure'
        },
        {
            icon: 'pi pi-tag',
            amount: '29.550',
            category: 'General Goods'
        },
        {
            icon: 'pi pi-desktop',
            amount: '16.660',
            category: 'Consumer Electronics'
        },
        {
            icon: 'pi pi-compass',
            amount: '5.801',
            category: 'Incalculables'
        }
    ];

    items = [
        { label: 'View', icon: 'pi pi-eye' },
        { label: 'Export', icon: 'pi pi-upload' }
    ];
}
