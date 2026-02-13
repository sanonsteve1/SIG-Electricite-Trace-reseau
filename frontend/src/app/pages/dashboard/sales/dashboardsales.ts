import { Component } from '@angular/core';
import { StatsWidget } from '@/pages/dashboard/sales/components/statswidget';
import { ContactWidget } from '@/pages/dashboard/sales/components/contactwidget';
import { OrderGraphWidget } from '@/pages/dashboard/sales/components/ordergraphwidget';
import { CustomTimelineWidget } from '@/pages/dashboard/sales/components/customtimelinewidget';
import { SalesTableWidget } from '@/pages/dashboard/sales/components/salestablewidget';
import { ChatWidget } from '@/pages/dashboard/sales/components/chatwidget';
import { ActivityWidget } from '@/pages/dashboard/sales/components/activitywidget';
import { BestSellersWidget } from '@/pages/dashboard/sales/components/bestsellerswidget';

@Component({
    selector: 'app-dashboard-sales',
    standalone: true,
    imports: [StatsWidget, ContactWidget, OrderGraphWidget, CustomTimelineWidget, SalesTableWidget, ChatWidget, ActivityWidget, BestSellersWidget],
    template: `<div class="grid grid-cols-12 gap-8">
        <stats-widget />
        <div class="col-span-12 lg:col-span-6">
            <contact-widget />
        </div>
        <div class="col-span-12 lg:col-span-6">
            <order-graph-widget />
        </div>
        <div class="col-span-12 lg:col-span-6">
            <custom-timeline-widget />
        </div>
        <div class="col-span-12 md:col-span-12 lg:col-span-6">
            <sales-table-widget />
        </div>
        <div class="col-span-12 lg:col-span-6">
            <chat-widget />
        </div>
        <div class="col-span-12 lg:col-span-3">
            <activity-widget />
        </div>
        <div class="col-span-12 lg:col-span-3">
            <best-sellers-widget />
        </div>
    </div>`
})
export class DashboardSales {}
