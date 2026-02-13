import {Component} from '@angular/core';
import {MenuModule} from 'primeng/menu';
import {CommonModule} from '@angular/common';
import {ButtonModule} from 'primeng/button';
import {RippleModule} from 'primeng/ripple';

@Component({
    selector: 'best-sellers-widget',
    standalone: true,
    imports: [CommonModule, ButtonModule, RippleModule, MenuModule],
    template: `<div class="card h-full">
        <div class="flex items-center justify-between mb-4">
            <span class="font-semibold text-xl m-0">Best Sellers</span>
            <div>
                <button pButton pRipple icon="pi pi-ellipsis-h" rounded text (click)="menu.toggle($event)"></button>
                <p-menu #menu popup [model]="items"></p-menu>
            </div>
        </div>

        <ul class="m-0 p-0 border-0 outline-0 list-none">
            <li class="py-4 px-0">
                <div *ngFor="let seller of sellers" class="h-16 border rounded-xl flex items-center p-4 mb-2 cursor-pointer hover:bg-emphasis transition-colors duration-150">
                    <img width="32px" height="32px" class="rounded-full mr-4" [src]="seller.image" [alt]="seller.name" />
                    <span>{{ seller.name }}</span>
                    <span class="ml-auto">
                        <a href="#"><i class="pi pi-chevron-right text-muted-color"></i></a>
                    </span>
                </div>
            </li>
        </ul>
    </div>`
})
export class BestSellersWidget {
    items = [
        { label: 'Update', icon: 'pi pi-fw pi-refresh' },
        { label: 'Edit', icon: 'pi pi-fw pi-pencil' }
    ];

    sellers = [
        {
            name: 'Blue Band',
            image: '/images/product/blue-band.jpg'
        },
        {
            name: 'Bracelet',
            image: '/images/product/bracelet.jpg'
        },
        {
            name: 'Black Watch',
            image: '/images/product/black-watch.jpg'
        },
        {
            name: 'Bamboo Watch',
            image: '/images/product/bamboo-watch.jpg'
        },
        {
            name: 'Blue T-Shirt',
            image: '/images/product/blue-t-shirt.jpg'
        },
        {
            name: 'Game Controller',
            image: '/images/product/game-controller.jpg'
        },
        {
            name: 'Phone Case',
            image: '/images/product/gold-phone-case.jpg'
        }
    ];
}
