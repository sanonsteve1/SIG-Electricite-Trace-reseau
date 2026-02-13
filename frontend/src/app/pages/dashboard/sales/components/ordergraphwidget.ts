import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { LayoutService } from '@/layout/service/layout.service';
import { debounceTime, Subscription } from 'rxjs';

@Component({
    selector: 'order-graph-widget',
    standalone: true,
    imports: [ButtonModule, RippleModule, ChartModule, MenuModule],
    template: `<div class="card h-full">
        <div class="flex items-center justify-between mb-4">
            <span class="font-semibold text-xl m-0">Order Graph</span>
            <div>
                <button pButton pRipple icon="pi pi-ellipsis-h" rounded text (click)="menu.toggle($event)"></button>
                <p-menu #menu popup [model]="items"> </p-menu>
            </div>
        </div>
        <p-chart type="line" [data]="ordersChart" [options]="ordersOptions" height="375" width="300"></p-chart>
    </div>`
})
export class OrderGraphWidget implements OnInit, OnDestroy {
    layoutService = inject(LayoutService);

    items = [
        { label: 'Update', icon: 'pi pi-fw pi-refresh' },
        { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
    ];

    ordersOptions: any;

    ordersChart: any;

    subscription!: Subscription;

    constructor() {
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(50)).subscribe(() => {
            this.initChart();
        });
    }

    ngOnInit() {
        this.initChart();
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    initChart() {
        this.ordersChart = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
            datasets: [
                {
                    label: 'New Orders',
                    data: [31, 23, 69, 29, 62, 25, 59, 26, 46],
                    borderColor: ['#4DD0E1'],
                    backgroundColor: ['rgba(77, 208, 225, 0.2)'],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Completed Orders',
                    data: [57, 48, 27, 88, 38, 3, 22, 60, 56],
                    borderColor: ['#3F51B5'],
                    backgroundColor: ['rgba(63, 81, 181, 0.4)'],
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                }
            ]
        };
        this.ordersOptions = this.getOrdersOptions();
    }

    getOrdersOptions() {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color') || 'rgba(0, 0, 0, 0.87)';
        const gridLinesColor = getComputedStyle(document.body).getPropertyValue('--surface-border') || 'rgba(160, 167, 181, .3)';
        const fontFamily = getComputedStyle(document.body).getPropertyValue('--font-family');

        return {
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            family: fontFamily
                        },
                        color: textColor
                    }
                }
            },
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                y: {
                    ticks: {
                        font: {
                            family: fontFamily
                        },
                        color: textColor
                    },
                    grid: {
                        color: gridLinesColor
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: fontFamily
                        },
                        color: textColor
                    },
                    grid: {
                        color: gridLinesColor
                    }
                }
            }
        };
    }
}
