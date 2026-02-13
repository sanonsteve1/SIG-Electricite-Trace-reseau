import {Component} from '@angular/core';
import {TimelineModule} from 'primeng/timeline';
import {RippleModule} from 'primeng/ripple';
import {MenuModule} from 'primeng/menu';
import {CommonModule} from '@angular/common';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';

@Component({
    selector: 'custom-timeline-widget',
    standalone: true,
    imports: [CommonModule, TimelineModule, ButtonModule, CardModule, MenuModule, RippleModule],
    template: `<div class="card h-full">
        <div class="flex items-center justify-between mb-4">
            <span class="font-semibold text-xl m-0">Timeline</span>
            <div>
                <button pButton pRipple icon="pi pi-ellipsis-h" rounded text (click)="menu.toggle($event)"></button>
                <p-menu #menu popup [model]="items"></p-menu>
            </div>
        </div>

        <p-timeline [value]="timelineEvents" align="left">
            <ng-template #marker let-event>
                <span class="shadow w-8 h-8 rounded-full flex justify-center items-center" [style.backgroundColor]="event.color">
                    <i class="text-white" [ngClass]="event.icon"></i>
                </span>
            </ng-template>
            <ng-template #content let-event>
                <p-card styleClass="mb-4 !shadow-none border border-surface !rounded-xl" [header]="event.status" [subheader]="event.date">
                    <img *ngIf="event.image" [src]="'/images/product/' + event.image" [alt]="event.name" width="200" class="shadow-2" />
                    <p>{{ event.description }}</p>
                </p-card>
            </ng-template>
        </p-timeline>
    </div>`,
    styles: `
        :host ::ng-deep {
            .p-timeline-event-opposite {
                flex: 0;
                padding: 0 !important;
            }
            .p-card {
                box-shadow: none;
            }
        }
    `
})
export class CustomTimelineWidget {
    items = [
        { label: 'Update', icon: 'pi pi-fw pi-refresh' },
        { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
    ];

    timelineEvents = [
        { status: 'Ordered', date: '15/10/2024 10:30', icon: 'pi pi-shopping-cart', color: '#E91E63', description: 'Richard Jones (C8012) has ordered a blue t-shirt for $79.' },
        { status: 'Processing', date: '15/10/2024 14:00', icon: 'pi pi-cog', color: '#FB8C00', description: 'Order #99207 has processed succesfully.' },
        { status: 'Shipped', date: '15/10/2024 16:15', icon: 'pi pi-compass', color: '#673AB7', description: 'Order #99207 has shipped with shipping code 2222302090.' },
        { status: 'Delivered', date: '16/10/2024 10:00', icon: 'pi pi-check-square', color: '#0097A7', description: 'Richard Jones (C8012) has recieved his blue t-shirt.' }
    ];
}
