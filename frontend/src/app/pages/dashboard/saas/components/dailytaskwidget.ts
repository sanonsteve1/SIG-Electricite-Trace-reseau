import { Component, Input } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KnobModule } from 'primeng/knob';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { AvatarGroup } from 'primeng/avatargroup';
import { RippleModule } from 'primeng/ripple';

@Component({
    selector: 'daily-task-widget',
    standalone: true,
    imports: [CommonModule, FormsModule, KnobModule, ButtonModule, RippleModule, CheckboxModule, AvatarModule, AvatarGroup],
    template: `<div class="flex flex-col gap-4 rounded-md border h-full border-surface py-6">
        <div class="flex justify-between items-center mx-6">
            <div class="flex items-center gap-4">
                <div>
                    <p-knob [showValue]="false" [size]="36" rangeColor="#EEEEEE" readonly [max]="5" [(ngModel)]="completeTask" />
                </div>
                <div class="flex flex-col justify-between gap-1">
                    <span class="font-bold text-surface-900 dark:text-surface-0">My Daily Tasks</span>
                    <span class="text-muted-color text-sm"
                        ><span class="font-bold">{{ completeTask }}</span
                        >/5 Tasks</span
                    >
                </div>
            </div>
            <div>
                <button pButton pRipple icon="pi pi-plus" label="New Task" outlined></button>
            </div>
        </div>
        <div class="flex flex-col gap-2 h-[21rem] overflow-auto -mb-6">
            <div *ngFor="let task of dailyTasks" class="flex justify-between p-4 bg-surface-50 dark:bg-surface-800 cursor-pointer text-muted-color rounded-md mx-6 hover:bg-surface-0 dark:hover:bg-surface-900 hover:shadow">
                <div class="flex gap-4">
                    <div>
                        <p-checkbox (onChange)="changeChecked()" [(ngModel)]="task.checked" binary></p-checkbox>
                    </div>
                    <div class="flex flex-col gap-2">
                        <span class="font-medium text-sm">{{ task.label }}</span>
                        <div class="flex gap-2 items-center">
                            <i class="pi pi-align-left text-muted-color"></i>
                            <i class="pi pi-file text-muted-color"></i>
                            <i class="pi pi-image text-muted-color"></i>
                        </div>
                    </div>
                </div>
                <div class="flex gap-4">
                    <div class="flex items-end">
                        <p-avatar-group>
                            <p-avatar [image]="task.avatar" shape="circle"></p-avatar>
                            <p-avatar label="+2" shape="circle" class="bg-surface-200 dark:bg-surface-600 text-muted-color"></p-avatar>
                        </p-avatar-group>
                    </div>
                    <div class="flex items-center">
                        <i class="pi pi-ellipsis-h text-muted-color"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>`,
    host: {
        class: 'col-span-12 md:col-span-4'
    }
})
export class DailyTaskWidget {
    @Input() dailyTasks: any[] = [];

    completeTask = 1;

    changeChecked() {
        this.completeTask = this.dailyTasks.filter((task) => task.checked).length;
    }
}
