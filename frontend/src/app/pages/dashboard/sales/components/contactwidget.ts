import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MenuModule} from 'primeng/menu';
import {ButtonModule} from 'primeng/button';
import {RippleModule} from 'primeng/ripple';
import {TagModule} from 'primeng/tag';

@Component({
    selector: 'contact-widget',
    standalone: true,
    imports: [CommonModule, ButtonModule, RippleModule, TagModule, MenuModule],
    template: `<div class="card h-full">
        <div class="flex items-center justify-between mb-4">
            <span class="font-semibold text-xl m-0">Contact</span>
            <div>
                <button pButton pRipple icon="pi pi-ellipsis-h" rounded text (click)="menu.toggle($event)"></button>
                <p-menu #menu popup [model]="items"> </p-menu>
            </div>
        </div>
        <ul class="p-0 m-0 border-0 list-none">
            <li *ngFor="let contact of contacts" class="flex items-center py-4 justify-between">
                <div class="flex items-center">
                    <img [src]="contact.avatar" alt="avatar" />
                    <div class="ml-2">
                        <div>{{ contact.name }}</div>
                        <small class="text-muted-color">{{ contact.email }}</small>
                    </div>
                </div>
                <div class="flex gap-2">
                    <p-tag *ngFor="let tag of contact.tags" severity="secondary">{{ tag }}</p-tag>
                </div>
            </li>
        </ul>
    </div>`
})
export class ContactWidget {
    items = [
        { label: 'New', icon: 'pi pi-fw pi-plus' },
        { label: 'Edit', icon: 'pi pi-fw pi-pencil' },
        { label: 'Delete', icon: 'pi pi-fw pi-trash' }
    ];

    contacts = [
        {
            name: 'Xuxue Feng',
            email: 'feng@ultima.org',
            avatar: '/images/avatar/xuxuefeng.png',
            tags: ['Accounting', 'Sales']
        },
        {
            name: 'Elwin Sharvill',
            email: 'sharvill@ultima.org',
            avatar: '/images/avatar/elwinsharvill.png',
            tags: ['Finance', 'Sales']
        },
        {
            name: 'Anna Fali',
            email: 'fali@ultima.org',
            avatar: '/images/avatar/asiyajavayant.png',
            tags: ['Management']
        },
        {
            name: 'Jon Stone',
            email: 'stone@ultima.org',
            avatar: '/images/avatar/ivanmagalhaes.png',
            tags: ['Management', 'Finance']
        },
        {
            name: 'Stephen Shaw',
            email: 'shaw@ultima.org',
            avatar: '/images/avatar/stephenshaw.png',
            tags: ['Finance']
        }
    ];
}
