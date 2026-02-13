import {Component, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {RippleModule} from 'primeng/ripple';
import {ButtonModule} from 'primeng/button';
import {ChartModule, UIChart} from 'primeng/chart';
import {LayoutService} from '@/layout/service/layout.service';
import {debounceTime, Subscription} from 'rxjs';

@Component({
    standalone: true,
    selector: 'monthly-comparison-widget',
    imports: [ButtonModule, ChartModule, RippleModule],
    template: `<div class="card h-full">
        <div class="flex items-center justify-between mb-4">
            <span class="text-xl font-semibold m-0">Monthly Comparison</span>
            <button pButton pRipple label="Vertical/Stacked Data" class="ml-auto" text (click)="changeMonthlyDataView()"></button>
        </div>

        <p-chart #monthlyChart type="bar" [data]="chartMonthlyData" [options]="chartMonthlyOptions" height="400" />
    </div>`
})
export class MonthlyComparisonWidget implements OnInit, OnDestroy {
    layoutService = inject(LayoutService);

    @ViewChild('monthlyChart') chartViewChild!: UIChart;

    chartMonthlyData!: any;

    chartMonthlyOptions!: any;

    colorKeys = ['indigo', 'blue', 'cyan', 'teal', 'green', 'emerald', 'lime', 'amber', 'yellow'];

    yearsData = [
        { year: '2016', data: [6, 25, 47, 12, 7, 70, 42] },
        { year: '2017', data: [81, 3, 5, 11, 59, 47, 99] },
        { year: '2018', data: [68, 47, 46, 46, 61, 70, 94] },
        { year: '2019', data: [31, 9, 18, 76, 6, 11, 79] },
        { year: '2020', data: [85, 37, 47, 29, 2, 10, 54] },
        { year: '2021', data: [28, 48, 40, 19, 86, 27, 90] },
        { year: '2022', data: [89, 18, 75, 18, 97, 61, 54] },
        { year: '2023', data: [18, 36, 39, 58, 41, 50, 72] },
        { year: '2024', data: [31, 4, 35, 74, 47, 35, 46] }
    ];

    months = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];

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

    getChartMonthlyData() {
        const documentStyle = getComputedStyle(document.documentElement);
        const suffix = this.layoutService.isDarkTheme() ? '400' : '500';
        const colors = this.colorKeys.map((color: string) => documentStyle.getPropertyValue(`--p-${color}-${suffix}`));

        return {
            labels: this.months,
            datasets: this.yearsData.map(({ year, data }, index) => ({
                label: year,
                data,
                borderColor: colors[index],
                backgroundColor: colors[index],
                borderWidth: 2,
                fill: true
            }))
        };
    }

    getMonthlyChartOptions() {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color') || 'rgba(0, 0, 0, 0.87)';
        const gridLinesColor = getComputedStyle(document.body).getPropertyValue('--surface-border') || 'rgba(160, 167, 181, .3)';
        const fontFamily = getComputedStyle(document.body).getPropertyValue('--font-family');

        const fontConfig = {
            font: { family: fontFamily },
            color: textColor
        };

        return {
            plugins: {
                legend: {
                    display: true,
                    labels: fontConfig
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'x' },
            scales: {
                y: {
                    ticks: fontConfig,
                    grid: { color: gridLinesColor }
                },
                x: {
                    categoryPercentage: 0.9,
                    barPercentage: 0.8,
                    ticks: fontConfig,
                    grid: { color: gridLinesColor }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        };
    }

    initChart() {
        this.chartMonthlyData = this.getChartMonthlyData();
        this.chartMonthlyOptions = this.getMonthlyChartOptions();
    }

    changeMonthlyDataView() {
        if (this.chartViewChild.chart.options.scales.x.stacked) {
            this.chartViewChild.chart.options.scales.x.stacked = false;
            this.chartViewChild.chart.options.scales.y.stacked = false;
        } else {
            this.chartViewChild.chart.options.scales.x.stacked = true;
            this.chartViewChild.chart.options.scales.y.stacked = true;
        }

        this.chartViewChild.chart.update();
    }
}
