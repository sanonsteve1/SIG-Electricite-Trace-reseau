import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule, UIChart } from 'primeng/chart';
import { LayoutService } from '@/layout/service/layout.service';
import { debounceTime, Subscription } from 'rxjs';

@Component({
    selector: 'stores-widget',
    standalone: true,
    imports: [CommonModule, ChartModule],
    template: `<div class="card grid grid-cols-12 gap-4 grid-nogutter flex-wrap">
        <div class="lg:col-span-3 md:col-span-6 sm:col-span-12 col-span-12 p-0">
            <div class="flex flex-col p-6">
                <div class="text-muted-color mb-2">Store A Sales</div>
                <div class="flex items-center mb-3">
                    <i *ngIf="storeADiff !== 0" class="font-bold !text-2xl pi pr-1" [ngClass]="{ 'pi-arrow-up text-green-500': storeADiff > 0, 'pi-arrow-down text-red-500': storeADiff < 0 }"></i>
                    <div class="text-2xl">{{ storeATotalValue }}</div>
                    <span *ngIf="storeADiff !== 0" class="font-medium text-base ml-2" [ngClass]="{ 'text-green-500': storeADiff > 0, 'text-red-500': storeADiff < 0 }"> {{ storeADiff > 0 ? '+' : '' }}{{ storeADiff }} </span>
                </div>
            </div>
            <p-chart #storeA type="line" [data]="storeAData" [options]="storeAOptions" [responsive]="true"></p-chart>
        </div>

        <div class="lg:col-span-3 md:col-span-6 sm:col-span-12 col-span-12 p-0">
            <div class="flex flex-col p-6">
                <span class="text-muted-color mb-2">Store B Sales</span>
                <span class="flex items-center mb-3">
                    <i *ngIf="storeBDiff !== 0" class="font-bold !text-2xl pi pr-1" [ngClass]="{ 'pi-arrow-up text-green-500': storeBDiff > 0, 'pi-arrow-down text-red-500': storeBDiff < 0 }"></i>
                    <div class="text-2xl">{{ storeBTotalValue }}</div>
                    <span *ngIf="storeBDiff !== 0" class="font-medium text-base ml-2" [ngClass]="{ 'text-green-500': storeBDiff > 0, 'text-red-500': storeBDiff < 0 }"> {{ storeBDiff > 0 ? '+' : '' }}{{ storeBDiff }} </span>
                </span>
            </div>
            <p-chart #storeB type="line" [data]="storeBData" [options]="storeBOptions" [responsive]="true"></p-chart>
        </div>
        <div class="lg:col-span-3 md:col-span-6 sm:col-span-12 col-span-12 p-0">
            <div class="flex flex-col p-6">
                <span class="text-muted-color mb-2">Store C Sales</span>
                <span class="flex items-center mb-3">
                    <i *ngIf="storeCDiff !== 0" class="font-bold !text-2xl pi pr-1" [ngClass]="{ 'pi-arrow-up text-green-500': storeCDiff > 0, 'pi-arrow-down text-red-500': storeCDiff < 0 }"></i>
                    <div class="text-2xl">{{ storeCTotalValue }}</div>
                    <span *ngIf="storeCDiff !== 0" class="font-medium text-base ml-2" [ngClass]="{ 'text-green-500': storeCDiff > 0, 'text-red-500': storeCDiff < 0 }"> {{ storeCDiff > 0 ? '+' : '' }}{{ storeCDiff }} </span>
                </span>
            </div>
            <p-chart #storeC type="line" [data]="storeCData" [options]="storeCOptions" [responsive]="true"></p-chart>
        </div>
        <div class="lg:col-span-3 md:col-span-6 sm:col-span-12 col-span-12 p-0">
            <div class="flex flex-col p-6">
                <span class="text-muted-color mb-2">Store D Sales</span>
                <span class="flex items-center mb-3">
                    <i *ngIf="storeDDiff !== 0" class="font-bold !text-2xl pi pr-1" [ngClass]="{ 'pi-arrow-up text-green-500': storeDDiff > 0, 'pi-arrow-down text-red-500': storeDDiff < 0 }"></i>
                    <div class="text-2xl">{{ storeDTotalValue }}</div>

                    <span *ngIf="storeDDiff !== 0" class="font-medium text-base ml-2" [ngClass]="{ 'text-green-500': storeDDiff > 0, 'text-red-500': storeDDiff < 0 }"> {{ storeDDiff > 0 ? '+' : '' }}{{ storeDDiff }} </span>
                </span>
            </div>
            <p-chart #storeD type="line" [data]="storeDData" [options]="storeDOptions" [responsive]="true"></p-chart>
        </div>
    </div> `
})
export class StoresWidget implements OnInit, OnDestroy {
    layoutService = inject(LayoutService);

    @ViewChild('storeA') storeAViewChild!: UIChart;

    @ViewChild('storeB') storeBViewChild!: UIChart;

    @ViewChild('storeC') storeCViewChild!: UIChart;

    @ViewChild('storeD') storeDViewChild!: UIChart;

    storeATotalValue = 100;

    storeADiff = 0;

    storeAStatus = 0;

    storeAData: any;

    storeAOptions: any;

    storeBTotalValue = 120;

    storeBDiff = 0;

    storeBStatus = 0;

    storeBData: any;

    storeBOptions: any;

    storeCTotalValue = 150;

    storeCDiff = 0;

    storeCStatus = 0;

    storeCData: any;

    storeCOptions: any;

    storeDTotalValue = 80;

    storeDDiff = 0;

    storeDStatus = 0;

    storeDData: any;

    storeDOptions: any;

    storeInterval: any;

    subscription!: Subscription;

    constructor() {
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(50)).subscribe((config) => {
            this.initCharts();
        });
    }

    ngOnInit() {
        this.initCharts();
        const calculateStore = (storeData: any, totalValue: number) => {
            let randomNumber = +(Math.random() * 500).toFixed(2);
            let data = [...storeData.datasets[0].data];
            let length = data.length;
            data.push(randomNumber);
            data.shift();
            storeData.datasets[0].data = data;

            let diff = +(data[length - 1] - data[length - 2]).toFixed(2);
            let status = diff === 0 ? 0 : diff > 0 ? 1 : -1;
            totalValue = +(totalValue + diff).toFixed(2);

            return { diff, totalValue, status };
        };
        this.storeInterval = setInterval(() => {
            requestAnimationFrame(() => {
                const { diff: storeADiff, totalValue: storeATotalValue, status: storeAStatus } = calculateStore(this.storeAData, this.storeATotalValue);
                this.storeADiff = storeADiff;
                this.storeATotalValue = storeATotalValue;
                this.storeAStatus = storeAStatus;
                this.storeAViewChild.refresh();

                const { diff: storeBDiff, totalValue: storeBTotalValue, status: storeBStatus } = calculateStore(this.storeBData, this.storeBTotalValue);
                this.storeBDiff = storeBDiff;
                this.storeBTotalValue = storeBTotalValue;
                this.storeBStatus = storeBStatus;
                this.storeBViewChild.refresh();

                const { diff: storeCDiff, totalValue: storeCTotalValue, status: storeCStatus } = calculateStore(this.storeCData, this.storeCTotalValue);
                this.storeCDiff = storeCDiff;
                this.storeCTotalValue = storeCTotalValue;
                this.storeCStatus = storeCStatus;
                this.storeCViewChild.refresh();

                const { diff: storeDDiff, totalValue: storeDTotalValue, status: storeDStatus } = calculateStore(this.storeDData, this.storeDTotalValue);
                this.storeDDiff = storeDDiff;
                this.storeDTotalValue = storeDTotalValue;
                this.storeDStatus = storeDStatus;
                this.storeDViewChild.refresh();
            });
        }, 2000);
    }

    ngOnDestroy() {
        clearInterval(this.storeInterval);
        this.subscription.unsubscribe();
    }

    initCharts() {
        this.storeAData = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
            datasets: [
                {
                    data: [55, 3, 45, 6, 44, 58, 84, 68, 64],
                    borderColor: ['#4DD0E1'],
                    backgroundColor: ['rgba(77, 208, 225, 0.8)'],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        this.storeBData = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
            datasets: [
                {
                    data: [81, 75, 63, 100, 69, 79, 38, 37, 76],
                    borderColor: ['#4DD0E1'],
                    backgroundColor: ['rgba(77, 208, 225, 0.8)'],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        this.storeCData = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
            datasets: [
                {
                    data: [99, 55, 22, 72, 24, 79, 35, 91, 48],
                    borderColor: ['#4DD0E1'],
                    backgroundColor: ['rgba(77, 208, 225, 0.8)'],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        this.storeDData = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
            datasets: [
                {
                    data: [5, 51, 68, 82, 28, 21, 29, 45, 44],
                    borderColor: ['#4DD0E1'],
                    backgroundColor: ['rgba(77, 208, 225, 0.8)'],
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        this.storeAOptions = {
            plugins: {
                legend: {
                    display: false
                }
            },
            maintainAspectRatio: false,
            responsive: true,
            aspectRatio: 4,
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

        this.storeBOptions = {
            plugins: {
                legend: {
                    display: false
                }
            },
            maintainAspectRatio: false,
            responsive: true,
            aspectRatio: 4,
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

        this.storeCOptions = {
            plugins: {
                legend: {
                    display: false
                }
            },
            maintainAspectRatio: false,
            responsive: true,
            aspectRatio: 4,
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

        this.storeDOptions = {
            plugins: {
                legend: {
                    display: false
                }
            },
            maintainAspectRatio: false,
            responsive: true,
            aspectRatio: 4,
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
    }
}
