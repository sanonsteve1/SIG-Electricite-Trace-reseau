import {Component, ElementRef, inject, ViewChild} from '@angular/core';
import {MegaMenuItem} from 'primeng/api';
import {RouterModule} from '@angular/router';
import {CommonModule} from '@angular/common';
import {StyleClassModule} from 'primeng/styleclass';
import {LayoutService} from '@/layout/service/layout.service';
import {Ripple} from 'primeng/ripple';
import {ButtonModule} from 'primeng/button';
import {FormsModule} from '@angular/forms';
import {MegaMenuModule} from 'primeng/megamenu';
import {BadgeModule} from 'primeng/badge';
import {OverlayBadge} from 'primeng/overlaybadge';

@Component({
    selector: '[app-topbar]',
    standalone: true,
	imports: [RouterModule, CommonModule, StyleClassModule, FormsModule, Ripple, ButtonModule, MegaMenuModule, BadgeModule, OverlayBadge],
    templateUrl: './app.topbar.html',
    host: {
        class: 'layout-topbar'
    },
	styleUrl: 'app.topbar.scss',
    styles: `
        :host ::ng-deep .p-overlaybadge .p-badge {
            outline-width: 0px;
        }
    `
})
export class AppTopbar {
    layoutService = inject(LayoutService);

    @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

    @ViewChild('menuButton') menuButton!: ElementRef<HTMLButtonElement>;

    @ViewChild('mobileMenuButton') mobileMenuButton!: ElementRef<HTMLButtonElement>;

    model: MegaMenuItem[] = [
        {
            label: 'UI KIT',
            items: [
                [
                    {
                        label: 'UI KIT 1',
                        items: [
                            { label: 'Form Layout', icon: 'pi pi-fw pi-id-card', to: '/uikit/formlayout' },
                            { label: 'Input', icon: 'pi pi-fw pi-check-square', to: '/uikit/input' },
                            { label: 'Float Label', icon: 'pi pi-fw pi-bookmark', to: '/uikit/floatlabel' },
                            { label: 'Button', icon: 'pi pi-fw pi-mobile', to: '/uikit/button' },
                            { label: 'File', icon: 'pi pi-fw pi-file', to: '/uikit/file' }
                        ]
                    }
                ],
                [
                    {
                        label: 'UI KIT 2',
                        items: [
                            { label: 'Table', icon: 'pi pi-fw pi-table', to: '/uikit/table' },
                            { label: 'List', icon: 'pi pi-fw pi-list', to: '/uikit/list' },
                            { label: 'Tree', icon: 'pi pi-fw pi-share-alt', to: '/uikit/tree' },
                            { label: 'Panel', icon: 'pi pi-fw pi-tablet', to: '/uikit/panel' },
                            { label: 'Chart', icon: 'pi pi-fw pi-chart-bar', to: '/uikit/charts' }
                        ]
                    }
                ],
                [
                    {
                        label: 'UI KIT 3',
                        items: [
                            { label: 'Overlay', icon: 'pi pi-fw pi-clone', to: '/uikit/overlay' },
                            { label: 'Media', icon: 'pi pi-fw pi-image', to: '/uikit/media' },
                            { label: 'Menu', icon: 'pi pi-fw pi-bars', to: '/uikit/menu' },
                            { label: 'Message', icon: 'pi pi-fw pi-comment', to: '/uikit/message' },
                            { label: 'Misc', icon: 'pi pi-fw pi-circle-off', to: '/uikit/misc' }
                        ]
                    }
                ]
            ]
        },
        {
            label: 'UTILITIES',
            items: [
                [
                    {
                        label: 'UTILITIES 1',
                        items: [
                            {
                                label: 'Buy Now',
                                icon: 'pi pi-fw pi-shopping-cart',
                                url: 'https://www.primefaces.org/store',
                                target: '_blank'
                            },
                            {
                                label: 'Documentation',
                                icon: 'pi pi-fw pi-info-circle',
                                to: '/documentation'
                            }
                        ]
                    }
                ]
            ]
        }
    ];

    onMenuButtonClick() {
        this.layoutService.onMenuToggle();
    }

    onRightMenuButtonClick() {
        this.layoutService.openRightMenu();
    }

    toggleConfigSidebar() {
        let layoutState = this.layoutService.layoutState();

        if (this.layoutService.isSidebarActive()) {
            layoutState.overlayMenuActive = false;
            layoutState.overlaySubmenuActive = false;
            layoutState.staticMenuMobileActive = false;
            layoutState.menuHoverActive = false;
            layoutState.configSidebarVisible = false;
        }
        layoutState.configSidebarVisible = !layoutState.configSidebarVisible;
        this.layoutService.layoutState.set({ ...layoutState });
    }

    focusSearchInput() {
        setTimeout(() => {
            this.searchInput.nativeElement.focus();
        }, 150);
    }

    onTopbarMenuToggle() {
        this.layoutService.layoutState.update((val) => ({ ...val, topbarMenuActive: !val.topbarMenuActive }));
    }
}
