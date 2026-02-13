import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ButtonModule} from 'primeng/button';
import {AvatarModule} from 'primeng/avatar';
import {AvatarGroup} from 'primeng/avatargroup';
import {RippleModule} from 'primeng/ripple';

@Component({
    selector: 'teams-widget',
    standalone: true,
    imports: [CommonModule, ButtonModule, AvatarModule, AvatarGroup, RippleModule],
    template: `<div class="border border-surface p-4 rounded-md flex flex-col gap-4">
        <div class="flex justify-between items-center">
            <div class="flex flex-col gap-1">
                <span class="font-semibold text-surface-900 dark:text-surface-0 text-lg">Teams</span>
                <span class="text-sm text-muted-color">18 Members</span>
            </div>
            <button pButton pRipple label="New Team" icon="pi pi-users"></button>
        </div>
        <div class="flex flex-col gap-1">
            <div
                *ngFor="let team of teams"
                (click)="teamFilter(team.title)"
                class="flex justify-between items-center border border-transparent rounded-md p-4 -mx-2 cursor-pointer hover:bg-emphasis"
                [ngClass]="{
                    'bg-primary-50 border-primary-100 dark:bg-primary-900': selectedTeam === team.title
                }"
            >
                <div class="flex items-center gap-4">
                    <div [style]="{ width: '7px', height: '7px' }" class="rounded-full" [ngClass]="team.badgeClass"></div>
                    <span>{{ team.title }}</span>
                </div>
                <div class="flex gap-2 items-center">
                    <p-avatar-group>
                        <p-avatar *ngFor="let avatar of team?.avatar" [image]="avatar" shape="circle"></p-avatar>
                        <p-avatar *ngIf="team?.avatarText" [label]="team?.avatarText" shape="circle" class="bg-surface-200 dark:bg-surface-600 text-muted-color" [style]="{ color: '#ffffff' }"></p-avatar>
                    </p-avatar-group>
                    <i *ngIf="selectedTeam === team.title" class="pi pi-chevron-right text-primary"></i>
                </div>
            </div>
        </div>
    </div>`,
    host: {
        class: 'col-span-12 md:col-span-4'
    }
})
export class TeamsWidget {
    @Input() selectedTeam!: any;

    @Output() onTeamFilter: EventEmitter<any> = new EventEmitter<any>();

    teams = [
        {
            title: 'UX Researchers',
            avatar: [
                '/images/avatar/circle/avatar-f-1.png',
                '/images/avatar/circle/avatar-f-6.png',
                '/images/avatar/circle/avatar-f-11.png',
                '/images/avatar/circle/avatar-f-12.png'
            ],
            avatarText: '+4',
            badgeClass: 'bg-pink-500'
        },
        {
            title: 'UX Designers',
            avatar: ['/images/avatar/circle/avatar-f-2.png'],
            badgeClass: 'bg-blue-500'
        },
        {
            title: 'UI Designers',
            avatar: ['/images/avatar/circle/avatar-f-3.png', '/images/avatar/circle/avatar-f-8.png'],
            avatarText: '+1',
            badgeClass: 'bg-green-500'
        },
        {
            title: 'Front-End Developers',
            avatar: ['/images/avatar/circle/avatar-f-4.png', '/images/avatar/circle/avatar-f-9.png'],
            badgeClass: 'bg-yellow-500'
        },
        {
            title: 'Back-End Developers',
            avatar: ['/images/avatar/circle/avatar-f-10.png'],
            badgeClass: 'bg-purple-500'
        }
    ];

    teamFilter(team: any) {
        this.onTeamFilter.emit(team);
    }
}
