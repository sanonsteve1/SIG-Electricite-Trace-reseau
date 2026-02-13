import { Component } from '@angular/core';
import { ProgressBar } from 'primeng/progressbar';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'stats-widget',
    standalone: true,
    imports: [CommonModule, ProgressBar],
    template: `<div *ngFor="let stat of stats" class="col-span-12 md:col-span-4">
        <div class="card">
            <div class="flex justify-between items-center p-4">
                <div>
                    <i [ngClass]="[stat.icon, stat.iconClass, '!text-6xl']"></i>
                </div>
                <div class="text-right flex flex-col">
                    <span class="text-4xl">{{ stat.count }}</span>
                    <span class="text-muted-color mt-2">{{ stat.label }}</span>
                </div>
            </div>
            <div class="border-t border-surface flex justify-between mt-4">
                <div class="w-6/12 text-center p-4 flex flex-col border-r border-surface">
                    <span class="font-medium">Target</span>
                    <span class="text-muted-color mb-2">{{ stat.target.value }}</span>
                    <p-progress-bar [value]="stat.target.progress" [showValue]="false"></p-progress-bar>
                </div>
                <div class="w-6/12 text-center p-4 flex flex-col">
                    <span class="font-medium">All Time Record</span>
                    <span class="text-muted-color mb-2">{{ stat.record.value }}</span>
                    <p-progress-bar [value]="stat.record.progress" [showValue]="false"></p-progress-bar>
                </div>
            </div>
        </div>
    </div>`,
    host: {
        class: 'col-span-12 grid grid-cols-12 gap-4'
    }
})
export class StatsWidget {
    stats = [
        {
            icon: 'pi pi-twitter',
            iconClass: 'text-muted-color',
            count: '44.995',
            label: 'Retweets',
            target: {
                value: '10.000',
                progress: 50
            },
            record: {
                value: '50.702',
                progress: 24
            }
        },
        {
            icon: 'pi pi-facebook',
            iconClass: 'text-muted-color',
            count: '63.573',
            label: 'Facebook Interactions',
            target: {
                value: '10.000',
                progress: 23
            },
            record: {
                value: '99.028',
                progress: 38
            }
        },
        {
            icon: 'pi pi-github',
            iconClass: 'text-muted-color',
            count: '81.002',
            label: 'Stars',
            target: {
                value: '10.000',
                progress: 62
            },
            record: {
                value: '162.550',
                progress: 14
            }
        }
    ];
}
