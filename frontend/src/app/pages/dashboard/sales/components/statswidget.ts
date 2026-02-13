import { Component, inject, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RippleModule } from 'primeng/ripple';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { LayoutService } from '@/layout/service/layout.service';
import { debounceTime, Subscription } from 'rxjs';

@Component({
    selector: 'stats-widget',
    standalone: true,
    imports: [CommonModule, ButtonModule, MenuModule, ChartModule, RippleModule],
    template: `<ng-container *ngFor="let stat of stats; let i = index">
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
            <div class="card flex flex-col">
                <div class="flex items-center text-gray-700">
                    <i [ngClass]="stat.icon" class="text-color"></i>
                    <span class="font-semibold m-0 text-color pl-2">{{ stat.title }}</span>
                    <div class="ml-auto">
                        <button pButton pRipple icon="pi pi-ellipsis-h" rounded text (click)="toggleMenu($event, i)"></button>
                        <p-menu #menu popup [model]="items"></p-menu>
                    </div>
                </div>
                <div class="flex justify-between mt-4 flex-wrap">
                    <div class="flex flex-col" style="width: 80px">
                        <span class="mb-1 text-4xl">{{ stat.value }}</span>
                        <span class="font-medium rounded-sm p-1 text-sm" [ngClass]="stat.colorClass">{{ stat.subValue }}</span>
                    </div>
                    <div class="flex items-end">
                        <p-chart type="line" [data]="i === 0 ? overviewChartData1 : i === 1 ? overviewChartData2 : i === 2 ? overviewChartData3 : overviewChartData4" [options]="chartOptions" height="60" width="160"> </p-chart>
                    </div>
                </div>
            </div>
        </div>
    </ng-container>`,
    host: {
        class: 'col-span-12 grid grid-cols-12 gap-4'
    }
})
export class StatsWidget implements OnInit, OnDestroy {
    @ViewChildren('menu') menu!: QueryList<Menu>;

    layoutService = inject(LayoutService);

    items = [
        { label: 'Update', icon: 'pi pi-fw pi-refresh' },
        { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
    ];

    stats = [
        {
            icon: 'pi pi-shopping-cart',
            title: 'Orders',
            value: '640',
            subValue: '1420 Completed',
            colorClass: 'text-teal-600 dark:text-teal-200'
        },
        {
            icon: 'pi pi-dollar',
            title: 'Revenue',
            value: '$57K',
            subValue: '$9,640 Income',
            colorClass: 'text-teal-600 dark:text-teal-200'
        },
        {
            icon: 'pi pi-users',
            title: 'Customers',
            value: '8572',
            subValue: '25402 Registered',
            colorClass: 'text-pink-600 dark:text-pink-200'
        },
        {
            icon: 'pi pi-comments',
            title: 'Comments',
            value: '805',
            subValue: '85 Responded',
            colorClass: 'text-teal-600 dark:text-teal-200'
        }
    ];

    chartDatasets = [
        [50, 64, 32, 24, 18, 27, 20, 36, 30],
        [11, 30, 52, 35, 39, 20, 14, 18, 29],
        [20, 29, 39, 36, 45, 24, 28, 20, 15],
        [30, 39, 50, 21, 33, 18, 10, 24, 20]
    ];

    chartOptions = {
        plugins: {
            legend: {
                display: false
            }
        },
        responsive: true,
        scales: {
            y: {
                display: false
            },
            x: {
                display: false
            }
        },
        tooltips: {
            enabled: false
        },
        elements: {
            point: {
                radius: 0
            }
        }
    };

    overviewChartData1: any;

    overviewChartData2: any;

    overviewChartData3: any;

    overviewChartData4: any;

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

    toggleMenu(event: any, index: number) {
        const menu = this.menu.toArray()[index];
        menu.toggle(event);
    }

    initChart() {
        this.overviewChartData1 = this.createChartData(this.chartDatasets[0]);
        this.overviewChartData2 = this.createChartData(this.chartDatasets[1]);
        this.overviewChartData3 = this.createChartData(this.chartDatasets[2]);
        this.overviewChartData4 = this.createChartData(this.chartDatasets[3]);

        this.setOverviewColors();
    }

    setOverviewColors() {
        const colors = this.getOverviewColors();
        const chartData = [this.overviewChartData1, this.overviewChartData2, this.overviewChartData3, this.overviewChartData4];

        chartData.forEach((chart, index) => {
            const isPink = index === 2;
            chart.datasets[0].borderColor[0] = isPink ? colors.pinkBorderColor : colors.tealBorderColor;
            chart.datasets[0].backgroundColor[0] = isPink ? colors.pinkBgColor : colors.tealBgColor;
        });
    }

    getOverviewColors() {
        return {
            pinkBorderColor: !this.layoutService.isDarkTheme() ? '#E91E63' : '#EC407A',
            pinkBgColor: !this.layoutService.isDarkTheme() ? '#F48FB1' : '#F8BBD0',
            tealBorderColor: !this.layoutService.isDarkTheme() ? '#009688' : '#26A69A',
            tealBgColor: !this.layoutService.isDarkTheme() ? '#80CBC4' : '#B2DFDB'
        };
    }

    createChartData(data: any) {
        return {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
            datasets: [
                {
                    data,
                    borderColor: ['#4DD0E1'],
                    backgroundColor: ['rgba(77, 208, 225, 0.8)'],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        };
    }
}
