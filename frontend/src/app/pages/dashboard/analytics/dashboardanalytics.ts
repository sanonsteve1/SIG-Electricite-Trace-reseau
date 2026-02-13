import { Component } from '@angular/core';
import { MonthlyComparisonWidget } from '@/pages/dashboard/analytics/components/monthlycomparisonwidget';
import { InsightsWidget } from '@/pages/dashboard/analytics/components/insightswidget';
import { StatsWidget } from '@/pages/dashboard/analytics/components/statswidget';
import { StoresWidget } from '@/pages/dashboard/analytics/components/storeswidget';
import { TopSearchesWidget } from '@/pages/dashboard/analytics/components/topsearcheswidget';
import { AnalyticsTableWidget } from '@/pages/dashboard/analytics/components/analyticstablewidget';
import { ExpensesWidget } from '@/pages/dashboard/analytics/components/expenseswidget';
import { RatingsWidget } from '@/pages/dashboard/analytics/components/ratingswidget';

@Component({
    selector: 'app-dashboard-analytics',
    standalone: true,
    imports: [MonthlyComparisonWidget, InsightsWidget, StatsWidget, StoresWidget, TopSearchesWidget, AnalyticsTableWidget, ExpensesWidget, RatingsWidget],
    template: `<div class="grid grid-cols-12 gap-8">
        <div class="col-span-12 md:col-span-8">
            <monthly-comparison-widget />
        </div>
        <div class="col-span-12 md:col-span-4">
            <insights-widget />
        </div>
        <stats-widget />
        <div class="col-span-12 md:col-span-12">
            <stores-widget />
        </div>
        <div class="col-span-12 md:col-span-6">
            <top-searches-widget />
        </div>
        <div class="col-span-12 md:col-span-6">
            <analytics-table-widget />
        </div>
        <div class="col-span-12 md:col-span-4">
            <expenses-widget />
        </div>
        <div class="col-span-12 md:col-span-8">
            <ratings-widget />
        </div>
    </div>`
})
export class DashboardAnalytics {}
