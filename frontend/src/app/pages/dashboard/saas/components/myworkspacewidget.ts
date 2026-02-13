import {Component} from '@angular/core';
import {DailyTaskWidget} from '@/pages/dashboard/saas/components/dailytaskwidget';
import {PerformanceWidget} from '@/pages/dashboard/saas/components/performancewidget';
import {CalendarWidget} from '@/pages/dashboard/saas/components/calendarwidget';

@Component({
    selector: 'my-workspace-widget',
    standalone: true,
    imports: [DailyTaskWidget, PerformanceWidget, CalendarWidget],
    template: `<div class="card flex justify-between items-center">
        <div class="p-2 h-full w-full flex flex-col justify-between">
            <div class="flex items-center justify-between mb-4">
                <span class="font-semibold text-lg text-surface-900 dark:text-surface-0">My Workspace</span>
            </div>
            <div class="grid grid-cols-12 gap-8">
                <daily-task-widget [dailyTasks]="dailyTasks" />
                <performance-widget />
                <calendar-widget [dailyTasks]="dailyTasks" />
            </div>
        </div>
    </div>`
})
export class MyWorkspaceWidget {
    dailyTasks = [
        {
            id: 1,
            checked: true,
            label: 'Prepare personas',
            description: 'Create profiles of fictional users representing target audience for product or service.',
            avatar: '/images/avatar/circle/avatar-f-6.png',
            borderColor: 'border-pink-500'
        },
        {
            id: 2,
            checked: false,
            label: 'Prepare a user journey map',
            description: 'Visual representation of steps a user takes to accomplish a goal within product or service.',
            avatar: '/images/avatar/circle/avatar-f-7.png',
            borderColor: 'border-purple-500'
        },
        {
            id: 3,
            checked: false,
            label: 'Prepare wireframes for onboarding screen',
            description: 'Create low-fidelity mockups of onboarding screen. Include layout, hierarchy, functionality.',
            avatar: '/images/avatar/circle/avatar-f-8.png',
            borderColor: 'border-blue-500'
        },
        {
            id: 4,
            checked: false,
            label: 'Review benchmarks',
            description: 'Conduct research on similar products or services to understand market standards and identify opportunities.',
            avatar: '/images/avatar/circle/avatar-f-9.png',
            borderColor: 'border-green-500'
        },
        {
            id: 5,
            checked: false,
            label: 'Let a plan with UI Team',
            description: 'Collaborate with UI design team to create plan for visual design of product or service.',
            avatar: '/images/avatar/circle/avatar-f-10.png',
            borderColor: 'border-yellow-500'
        }
    ];
}
