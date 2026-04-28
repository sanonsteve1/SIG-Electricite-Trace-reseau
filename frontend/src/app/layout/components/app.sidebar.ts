import { Component, computed, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import { AppMenu } from './app.menu';
import { AppMenuProfile } from '@/layout/components/app.menuprofile';
import { CommonModule } from '@angular/common';
import { LayoutService } from '@/layout/service/layout.service';

@Component({
    selector: '[app-sidebar]',
    standalone: true,
    imports: [AppMenuProfile, AppMenu, CommonModule],
    template: `<div class="layout-sidebar" (mouseenter)="onMouseEnter()" (mouseleave)="onMouseLeave()">
        <div class="layout-sidebar-top">
            <a href="/">
                <img src="/assets/logo-abun.png" alt="Logo AB-UN" class="layout-sidebar-logo" width="140" height="48" />
                <img src="/assets/logo-abun.png" alt="Logo AB-UN" class="layout-sidebar-logo-slim" width="40" height="40" />
            </a>
            <button class="layout-sidebar-anchor" type="button" (click)="anchor()"></button>
        </div>
        <div app-menu-profile #menuProfileStart *ngIf="menuProfilePosition() === 'start'"></div>
        <div #menuContainer class="layout-menu-container">
            <div app-menu></div>
        </div>
        <div app-menu-profile #menuProfileEnd *ngIf="menuProfilePosition() === 'end'"></div>
    </div>`,
    styles: `
        .layout-sidebar-top a {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
        }

        .layout-sidebar-logo,
        .layout-sidebar-logo-slim {
            background: #ffffff;
            border-radius: 999px;
            padding: 3px;
            box-shadow: 0 1px 4px rgba(15, 23, 42, 0.25);
            object-fit: contain;
        }
    `
})
export class AppSidebar implements OnDestroy {
    el = inject(ElementRef);

    layoutService = inject(LayoutService);

    @ViewChild(AppMenu) appMenu!: AppMenu;

    @ViewChild('menuProfileStart') menuProfileStart!: AppMenuProfile;

    @ViewChild('menuProfileEnd') menuProfileEnd!: AppMenuProfile;

    @ViewChild('menuContainer') menuContainer!: ElementRef;

    overlayMenuActive = computed(() => this.layoutService.layoutState().overlayMenuActive);

    menuProfilePosition = computed(() => this.layoutService.layoutConfig().menuProfilePosition);

    anchored = computed(() => this.layoutService.layoutState().anchored);

    timeout: any;

    resetOverlay() {
        if (this.overlayMenuActive()) {
            this.layoutService.layoutState.update((val) => ({ ...val, overlayMenuActive: false }));
        }
    }

    onMouseEnter() {
        if (!this.anchored()) {
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }
            this.layoutService.layoutState.update((val) => ({ ...val, sidebarActive: true }));
        }
    }

    onMouseLeave() {
        if (!this.anchored()) {
            if (!this.timeout) {
                this.timeout = setTimeout(() => this.layoutService.layoutState.update((val) => ({ ...val, sidebarActive: false })), 300);
            }
        }
    }

    anchor() {
        this.layoutService.layoutState.update((val) => ({ ...val, anchored: !val.anchored }));
    }

    ngOnDestroy() {
        this.resetOverlay();
    }
}
