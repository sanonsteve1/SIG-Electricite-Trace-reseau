import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { MenuModule } from 'primeng/menu';
import { ChartModule, UIChart } from 'primeng/chart';
import { LayoutService } from '@/layout/service/layout.service';
import { debounceTime, Subscription } from 'rxjs';

@Component({
    selector: 'insights-widget',
    standalone: true,
    imports: [ButtonModule, ChartModule, MenuModule, Ripple],
    template: `<div class="card h-full">
        <div class="flex items-center justify-between mb-2">
            <span class="text-xl font-semibold m-0">Insights</span>
            <div>
                <button pButton pRipple icon="pi pi-ellipsis-h" rounded text (click)="menu.toggle($event)"></button>
                <p-menu #menu popup [model]="items" />
            </div>
        </div>
        <div class="border-b border-surface text-sm text-muted-color mb-2 flex items-center">
            <span>November 22 - November 29</span>
            <button pButton pRipple label="Semi/Full Data" class="ml-auto" text (click)="changeDoughnutDataView()"></button>
        </div>
        <p-chart #doughnutChart type="doughnut" [data]="doughnutData" [options]="doughnutOptions" height="200" />
        <div class="flex flex-col justify-center">
            <div class="flex flex-row items-center mt-6 px-4">
                <i class="pi pi-thumbs-up p-4 rounded-full bg-green-500 text-white"></i>
                <div class="flex flex-col ml-4">
                    <span>Best Day of the Week</span>
                    <small>Friday</small>
                </div>
                <span class="text-indigo-500 ml-auto">95</span>
            </div>
            <div class="flex flex-row items-center my-6 px-4">
                <i class="pi pi-thumbs-down rounded-full p-4 bg-orange-500 text-white"></i>
                <div class="flex flex-col ml-4">
                    <span>Worst Day of the Week</span>
                    <small>Saturday</small>
                </div>
                <span class="text-indigo-500 ml-auto">6</span>
            </div>
        </div>
    </div>`
})
export class InsightsWidget implements OnInit, OnDestroy {
    layoutService = inject(LayoutService);

    @ViewChild('doughnutChart') doughnutViewChild!: UIChart;

    colorKeys = ['indigo', 'blue', 'cyan', 'green', 'emerald', 'orange', 'yellow'];

    items = [
        { label: 'Update', icon: 'pi pi-fw pi-refresh' },
        { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
    ];

    doughnutData!: any;

    doughnutOptions!: any;

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

    getDoughnutOptions() {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color') || 'rgba(0, 0, 0, 0.87)';
        const fontFamily = getComputedStyle(document.body).getPropertyValue('--font-family');

        return {
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: fontFamily
                        },
                        color: textColor
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            circumference: 180,
            rotation: -90,
            animation: {
                animateScale: true,
                animateRotate: true
            }
        };
    }

    getDoughnutData() {
        const documentStyle = getComputedStyle(document.documentElement);
        const borderColor = getComputedStyle(document.body).getPropertyValue('--surface-border') || 'rgba(160, 167, 181, .3)';
        const suffix = this.layoutService.isDarkTheme() ? '400' : '500';
        const backgroundColor = this.colorKeys.map((color: string) => documentStyle.getPropertyValue(`--p-${color}-${suffix}`));

        return {
            labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            datasets: [
                {
                    data: [11, 29, 71, 33, 28, 95, 6],
                    backgroundColor,
                    borderColor
                }
            ]
        };
    }

    changeDoughnutDataView() {
        if (this.doughnutViewChild.chart.options.circumference === 180) {
            this.doughnutViewChild.chart.options.circumference = 360;
            this.doughnutViewChild.chart.options.rotation = -45;
        } else {
            this.doughnutViewChild.chart.options.circumference = 180;
            this.doughnutViewChild.chart.options.rotation = -90;
        }

        this.doughnutViewChild.chart.update();
    }

    initChart() {
        this.doughnutData = this.getDoughnutData();
        this.doughnutOptions = this.getDoughnutOptions();
    }
}
