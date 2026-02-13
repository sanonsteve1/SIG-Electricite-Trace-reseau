import { Component } from '@angular/core';
import { IntroduceWidget } from '@/pages/dashboard/saas/components/introducewidget';
import { UpgradeWidget } from '@/pages/dashboard/saas/components/upgradewidget';
import { MyWorkspaceWidget } from '@/pages/dashboard/saas/components/myworkspacewidget';
import { ProjectOverviewWidget } from '@/pages/dashboard/saas/components/projectoverviewwidget';

@Component({
    selector: 'app-dashboard-saas',
    standalone: true,
    imports: [IntroduceWidget, UpgradeWidget, MyWorkspaceWidget, ProjectOverviewWidget],
    template: `<div class="grid grid-cols-12 gap-8 mt-1">
        <div class="col-span-12 md:col-span-8">
            <introduce-widget />
        </div>
        <div class="col-span-12 md:col-span-4">
            <upgrade-widget />
        </div>
        <div class="col-span-12">
            <my-workspace-widget />
        </div>
        <div class="col-span-12">
            <project-overview-widget />
        </div>
    </div>`
})
export class DashboardSaas {}
