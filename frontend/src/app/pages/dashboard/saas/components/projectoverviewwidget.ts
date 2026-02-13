import {Component} from '@angular/core';
import {SaasTableWidget} from '@/pages/dashboard/saas/components/saastablewidget';
import {ButtonModule} from 'primeng/button';
import {RippleModule} from 'primeng/ripple';
import {TeamsWidget} from '@/pages/dashboard/saas/components/teamswidget';

@Component({
    selector: 'project-overview-widget',
    standalone: true,
    imports: [ButtonModule, RippleModule, TeamsWidget, SaasTableWidget],
    template: `<div class="card flex justify-between items-center">
        <div class="p-2 h-full w-full flex flex-col justify-between">
            <div class="flex items-center justify-between mb-4">
                <span class="font-semibold text-lg text-surface-900 dark:text-surface-0">Projects Overview</span>
                <div class="flex items-center gap-2">
                    <button pButton pRipple label="Organize Teams" icon="pi pi-sliders-h" outlined></button>
                    <button pButton pRipple label="New Project" icon="pi pi-plus-circle"></button>
                </div>
            </div>
            <div class="grid grid-cols-12 gap-8">
                <teams-widget [selectedTeam]="selectedTeam" (onTeamFilter)="teamFilter($event)" />
                <saas-table-widget [filteredTeamMembers]="filteredTeamMembers" />
            </div>
        </div>
    </div>`
})
export class ProjectOverviewWidget {
    selectedTeam: string = 'UX Researchers';

    filteredTeamMembers: any;

    teamMembers = [
        {
            avatar: '/images/avatar/circle/avatar-f-1.png',
            name: 'Theresa Webb',
            title: 'UX Researchers',
            taskCount: 79,
            doneCount: 15,
            sprintCount: 72,
            onProjectsCount: 33,
            team: 'UX Researchers'
        },
        {
            avatar: '/images/avatar/circle/avatar-f-2.png',
            name: 'Courtney Henry',
            title: 'President of Sales',
            taskCount: 22,
            doneCount: 11,
            sprintCount: 3,
            onProjectsCount: 12,
            team: 'UX Researchers'
        },
        {
            avatar: '/images/avatar/circle/avatar-f-3.png',
            name: 'Kathryn Murphy',
            title: 'Web Designer',
            taskCount: 21,
            doneCount: 33,
            sprintCount: 11,
            onProjectsCount: 44,
            team: 'UX Researchers'
        },
        {
            avatar: '/images/avatar/circle/avatar-f-4.png',
            name: 'Diana Ross',
            title: 'Project Manager',
            taskCount: 34,
            doneCount: 11,
            sprintCount: 45,
            onProjectsCount: 23,
            team: 'UX Researchers'
        },
        {
            avatar: '/images/avatar/circle/avatar-f-5.png',
            name: 'Emily Smith',
            title: 'Software Engineer',
            taskCount: 22,
            doneCount: 3,
            sprintCount: 12,
            onProjectsCount: 1,
            team: 'UX Researchers'
        },
        {
            avatar: '/images/avatar/circle/avatar-f-6.png',
            name: 'Olivia Johnson',
            title: 'Human Resources Manager',
            taskCount: 54,
            doneCount: 23,
            sprintCount: 29,
            onProjectsCount: 14,
            team: 'UX Researchers'
        },
        {
            avatar: '/images/avatar/circle/avatar-f-7.png',
            name: 'Sarah Williams',
            title: 'Marketing Specialist',
            taskCount: 46,
            doneCount: 33,
            sprintCount: 12,
            onProjectsCount: 14,
            team: 'UX Researchers'
        },
        {
            avatar: '/images/avatar/circle/avatar-f-8.png',
            name: 'Madison Davis',
            title: 'Graphic Designer',
            taskCount: 23,
            doneCount: 55,
            sprintCount: 31,
            onProjectsCount: 15,
            team: 'UX Researchers'
        },

        {
            avatar: '/images/avatar/circle/avatar-f-9.png',
            name: 'Abigail Rodriguez',
            title: 'Content Writer',
            taskCount: 79,
            doneCount: 15,
            sprintCount: 72,
            onProjectsCount: 33,
            team: 'UX Designers'
        },

        {
            avatar: '/images/avatar/circle/avatar-f-10.png',
            name: 'Elizabeth Taylor',
            title: 'Customer Support Representative',
            taskCount: 12,
            doneCount: 32,
            sprintCount: 14,
            onProjectsCount: 16,
            team: 'UX Designers'
        },

        {
            avatar: '/images/avatar/circle/avatar-f-11.png',
            name: 'Chloe Anderson',
            title: 'Financial Analyst',
            taskCount: 11,
            doneCount: 17,
            sprintCount: 12,
            onProjectsCount: 14,
            team: 'UI Designers'
        },

        {
            avatar: '/images/avatar/circle/avatar-f-12.png',
            name: 'Sophia Lee',
            title: 'Product Manager',
            taskCount: 79,
            doneCount: 15,
            sprintCount: 72,
            onProjectsCount: 33,
            team: 'UI Designer'
        },

        {
            avatar: '/images/avatar/circle/avatar-f-3.png',
            name: 'Aria Jackson',
            title: 'Product Manager',
            taskCount: 79,
            doneCount: 15,
            sprintCount: 72,
            onProjectsCount: 33,
            team: 'Front-End Developers'
        },

        {
            avatar: '/images/avatar/circle/avatar-f-7.png',
            name: 'Aria Jackson',
            title: 'Product Manager',
            taskCount: 79,
            doneCount: 15,
            sprintCount: 72,
            onProjectsCount: 33,
            team: 'Front-End Developers'
        },

        {
            avatar: '/images/avatar/circle/avatar-f-9.png',
            name: 'John Doe',
            title: 'Product Manager',
            taskCount: 79,
            doneCount: 15,
            sprintCount: 72,
            onProjectsCount: 33,
            team: 'Back-End Developers'
        }
    ];

    teamFilter(team: any) {
        this.selectedTeam = team;
        this.filteredTeamMembers = this.teamMembers.filter((item: any) => item.team === team);
    }

    ngOnInit() {
        this.filteredTeamMembers = this.teamMembers.filter((item) => item.team === this.selectedTeam);
    }
}
