import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { LayoutService } from '@/layout/service/layout.service';
import { debounceTime, Subscription } from 'rxjs';

@Component({
    selector: 'performance-widget',
    standalone: true,
    imports: [ChartModule],
    template: `<div class="flex flex-col gap-4 rounded-md border h-full border-surface p-6">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-4">
                <div>
                    <i class="pi pi-chart-bar text-primary text-3xl"></i>
                </div>
                <div class="flex flex-col justify-between gap-1">
                    <span class="font-bold text-surface-900 dark:text-surface-0">My Performance</span>
                </div>
            </div>
            <div class="flex items-center gap-1">
                <div class="flex items-center justify-center gap-1 rounded-md p-2 bg-red-100 text-red-400">
                    <i class="pi pi-arrow-down-right"></i>
                    <span>-13%</span>
                </div>
            </div>
        </div>
        <div class="flex flex-col gap-2 h-[21rem] -mb-6 relative">
            <p-chart height="300" type="line" [data]="basicData" [options]="basicOptions"></p-chart>
        </div>
    </div>`,
    host: {
        class: 'col-span-12 md:col-span-4'
    }
})
export class PerformanceWidget implements OnInit, OnDestroy {
    layoutService = inject(LayoutService);

    basicData: any;

    basicOptions: any;

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
        this.basicData = this.setChartData();
        this.basicOptions = this.setChartOptions();
    }

    setChartOptions() {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color');
        const surfaceBorder = getComputedStyle(document.body).getPropertyValue('--surface-border');

        return {
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        boxWidth: 12,
                        boxHeight: 4
                    },
                    position: 'bottom'
                }
            },
            maintainAspectRatio: false,
            elements: { point: { radius: 0 } },
            scales: {
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: surfaceBorder
                    }
                },
                y: {
                    ticks: {
                        color: textColor,
                        stepSize: 10
                    },
                    grid: {
                        color: surfaceBorder
                    }
                }
            }
        };
    }

    setChartData() {
        return {
            labels: ['January', 'February', 'March', 'April', 'May'],
            datasets: [
                {
                    label: 'Previous Month',
                    borderColor: '#E0E0E0',
                    tension: 0.5,
                    data: [22, 36, 11, 33, 2]
                },
                {
                    label: 'Current Month',
                    borderColor: '#6366F1',
                    tension: 0.5,
                    data: [22, 16, 31, 11, 38]
                }
            ]
        };
    }
}
